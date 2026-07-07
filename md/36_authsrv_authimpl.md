# [문서36] 프로젝트: 인증 서버 — 실제 구현 정리
> NestJS 기반 인증+리포트 API. 앞서 문서(26~28 인증·프론트, NestJS 흐름)의 개념이 거의 다 실제 코드로.
> 스택: NestJS + TypeORM(SQLite) + Redis(ioredis) + JWT + 카카오 OAuth + Swagger + Throttler.
> ★ 이 프로젝트 하나로 "JWT/리프레시/OAuth/가드/인터셉터/DTO/rate limit"을 실제 코드로 답할 수 있음.

---

## 핵심 한 줄
"NestJS로 액세스/리프레시 토큰 분리 인증 서버를 구현. 리프레시는 Redis에 jti로 저장해 기기별 로그아웃과 로테이션을 지원하고, tokenVersion으로 전체 무효화를 처리. 카카오 OAuth(code→토큰 교환), 가드(JWT 검증), 인터셉터(응답 DTO 직렬화), Throttler(rate limit)까지 NestJS 요청 흐름 전체를 구현했다."

## 1. 액세스 vs 리프레시 토큰 (문서28 개념의 실제)
- 액세스 토큰: 15분(JWT_ACCESS_EXPIRES=15m), HS256 서명, payload에 sub/email/role/v(tokenVersion)/typ.
- 리프레시 토큰: 7일, jti(UUID) 포함 → Redis에 저장해 서버가 추적.
```typescript
// token.service.ts
async generateAccessToken(user) {
  return jwt.sign({ sub:user.id, email, role, v:user.tokenVersion, typ:'access' },
    secret, { algorithm:'HS256', expiresIn:'15m' });
}
async generateRefreshToken(user) {
  const jti = crypto.randomUUID();  // 기기별 식별자
  // ... redis에 저장(아래)
}
```
★ 왜 jti: "전체 로그아웃 말고 기기별 로그아웃 할 때 유저 ID만으론 토큰 식별 불가"(코드 주석). 기기마다 다른 jti라 특정 기기만 로그아웃 가능.

## 2. 리프레시 토큰을 Redis에 (해시로 저장) ★
평문이 아니라 HMAC 해시로 저장 — 5년차 보안 감각:
```typescript
private hashToken(token) {
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}
// 저장: refresh:{userId}:{jti} → 해시값, TTL로 만료
await this.redis.set(key, this.hashToken(token), 'EX', ttl);
// 검증: 저장된 해시와 비교(타이밍 공격 방어)
if (!this.safeEqualsHex(storedHash, this.hashToken(token))) return null;
```
★ 두 보안 기법:
- 토큰을 해시해서 저장 → Redis 유출돼도 원본 토큰 복원 불가(비밀번호 해싱과 같은 원리).
- crypto.timingSafeEqual(safeEqualsHex) → 문자열 비교 시간으로 값을 추측하는 타이밍 공격 방어.

## 3. 리프레시 로테이션 (재사용 방지) ★
문서28의 "리프레시 회전"의 실제 구현(rotateRefreshToken):
```typescript
async rotateRefreshToken(refreshToken) {
  const payload = await this.tokenService.validateRefreshToken(refreshToken);  // Redis 검증
  if (!payload) throw 401;
  const user = await this.usersService.findOne(payload.sub);

  // ★ tokenVersion으로 전체 무효화 체크
  if (user.tokenVersion !== payload.v) throw 'AUTH_REFRESH_REVOKED';
  // 강제/전체 로그아웃 시 tokenVersion 증가 → 예전 리프레시로 갱신 시도하면 거부

  await this.tokenService.invalidateRefreshToken(user.id, payload.jti);  // 옛 것 삭제(로테이션)
  const accessToken = ...generateAccessToken(...);
  const newRefreshToken = ...generateRefreshToken(...);  // 새 것 발급
  return { accessToken, refreshToken: newRefreshToken };
}
```
★ 두 층의 무효화:
- 로테이션: 리프레시 쓸 때마다 옛 jti 삭제+새로 발급. 탈취된 옛 토큰 재사용 차단.
- tokenVersion: 유저 단위 버전. 전체/강제 로그아웃 시 증가시키면 그 이전 발급 리프레시가 전부 무효(v 불일치로 거부).

## 4. 카카오 OAuth (문서: OAuth 흐름의 실제)
```typescript
async signInWithKakao(code) {
  // 1. code를 카카오 토큰으로 교환(서버에서, grant_type=authorization_code)
  const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token',
    { grant_type:'authorization_code', code, ... });
  const kakaoAccessToken = tokenRes.data.access_token;
  // 2. 카카오 액세스 토큰으로 유저 정보 요청
  const meRes = await axios.get('https://kapi.kakao.com/v2/user/me',
    { headers:{ Authorization:`Bearer ${kakaoAccessToken}` } });
  // 3. 카카오 유저를 우리 DB에 upsert(있으면 로그인, 없으면 생성)
  const user = await this.usersService.upsertOAuthUser({ kakaoId, email, ... });
  // 4. 우리 서비스의 액세스/리프레시 토큰 발급
}
```
★ 정확히 OAuth Authorization Code 흐름: code를 서버에서 토큰으로 교환(시크릿은 서버에), 그 토큰으로 유저 정보, 우리 유저와 연결. README에 "state 검증 포함" → CSRF 방어. (앞서 정리한 OAuth 흐름과 일치)

## 5. 가드 (JWT 검증) — NestJS 요청 흐름의 가드 단계
```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw 401 'Missing Bearer token';
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = { id: payload.sub };  // 이후 단계에서 사용
    return true;
  }
}
```
★ 정직한 자기 인지(코드 주석): "강제/전체 로그아웃 시 access 토큰에서도 버전 검사 필요, 이 로직 추가돼야 함. 지금은 access의 짧은 지속시간에만 기대는 상황(보안상 치명적일 수 있음)."
= 액세스 토큰은 무효화가 어렵다는 JWT의 근본 한계(문서26)를 알고, 현재 구현의 미비점을 정확히 인지. 면접에서 이런 걸 말하면 신뢰↑.

## 6. 인터셉터 (응답 직렬화) — 요청 흐름의 인터셉터 단계
```typescript
export class SerializeInterceptor implements NestInterceptor {
  intercept(context, handler) {
    return handler.handle().pipe(map((data) => {
      if (data && 'user' in data) {
        const serializedUser = plainToClass(this.dto, data.user,
          { excludeExtraneousValues: true });  // DTO에 @Expose된 것만 남김
        return { ...data, user: serializedUser };
      }
      return { ...data };
    }));
  }
}
```
★ 응답 후처리로 민감정보 제외: user 엔티티를 UserDto로 변환해 password 등 내부 필드를 응답에서 제거. (문서28의 "인터셉터는 응답 변형" + "DTO로 엔티티 노출 안 함"의 실제)

## 7. DTO + class-validator (파이프 검증)
- dtos/ 폴더에 create-user, signin, refresh, update-user 등 요청 DTO + auth-response, token-response 등 응답 DTO.
- class-validator로 검증, class-transformer(@Expose)로 직렬화 제어.
★ 문서28의 DTO+ValidationPipe가 그대로. 요청은 DTO로 검증, 응답은 DTO로 필터.

## 8. Throttler (rate limiting) — 남용 방지
```typescript
ThrottlerModule.forRoot([{ ttl: 60, limit: 20 }])  // 60초당 20회
```
★ 시스템 디자인편의 rate limiting이 인증 서버에. 로그인 무차별 대입(brute force) 완화.

## 9. NestJS 요청 흐름 전체가 이 프로젝트에 (문서28 5번의 실제)
미들웨어 → 가드(AuthGuard: JWT 검증) → 인터셉터(current-user, serialize) → 파이프(DTO 검증) → 컨트롤러 → 서비스(auth/users/token) → TypeORM(엔티티) → 응답은 인터셉터(serialize)로 후처리.
★ 앞서 개념으로 정리한 흐름이 파일로 다 존재: guards/, interceptors/, dtos/, *.controller, *.service, *.entity.

## 면접 포인트 (이 프로젝트로 답할 수 있는 것)
- "JWT 인증 구현해봤나?" → 액세스/리프레시 분리, HS256, payload 설계.
- "리프레시 토큰 어떻게 관리?" → Redis에 jti로 저장(해시+타이밍 세이프 비교), 로테이션, tokenVersion으로 전체 무효화.
- "기기별 로그아웃?" → jti로 특정 기기 토큰만 삭제. 전체는 tokenVersion 증가.
- "OAuth 해봤나?" → 카카오. code→토큰 교환(서버), 유저 정보, upsert, state로 CSRF 방어.
- "JWT의 한계는?" → 액세스 토큰 즉시 무효화 어려움. 코드 주석으로 이 미비점을 인지(짧은 만료에 의존). 개선안: 액세스에도 버전 검사 or 블랙리스트.
- "NestJS 구조?" → 가드/인터셉터/파이프/DTO를 용도대로. 응답 직렬화로 민감정보 제외.
- "rate limit?" → Throttler 60초 20회.

## 핵심 요약
NestJS 인증 서버. 액세스(15m)/리프레시(7d, Redis jti) 분리, 해시 저장+타이밍 세이프 비교, 로테이션+tokenVersion 이중 무효화, 기기별 로그아웃. 카카오 OAuth(code 교환+state). 가드(JWT)·인터셉터(직렬화)·DTO·Throttler로 NestJS 흐름 전체 구현. ★ 액세스 토큰 무효화 한계를 코드에 정직히 명시한 게 성숙함의 증거.
