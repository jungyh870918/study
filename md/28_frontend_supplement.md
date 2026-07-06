# [문서28] 인증·프론트엔드 부가 설명 — 난이도 있는 개념 보충

---

## ① HttpOnly 쿠키 & CSRF (자세히)
HttpOnly: 쿠키에 HttpOnly 플래그→JS가 못 읽음(document.cookie 불가). 브라우저가 서버 요청 시만 자동 전송. XSS로 악성 JS 주입돼도 탈취 불가.
왜 CSRF 취약: 쿠키 "자동 전송"이 양날. 브라우저는 해당 도메인 모든 요청에 쿠키 자동 첨부(요청 출처 안 따짐).
CSRF 시나리오:
1) bank.com 로그인(HttpOnly 쿠키에 토큰)
2) 로그아웃 안 하고 evil.com 방문
3) evil.com에 숨은 <form action=bank.com/transfer POST> 또는 <img src=...>
4) 브라우저가 bank.com 요청에 인증 쿠키 자동 첨부!
5) 서버는 정상 요청으로 착각→이체
핵심: 공격자가 토큰 훔치는 게 아니라 "브라우저가 쿠키를 붙여주는 걸 악용". HttpOnly로 못 막음(읽는 게 아니니).
방어1 SameSite:
- Strict: 다른 사이트 요청엔 쿠키 안 붙임. 가장 안전, 외부 링크 진입 시 로그인 풀림(UX).
- Lax: 안전한 이동(링크/GET)엔 붙임, POST/이미지/iframe 위조엔 안 붙임. 실무 기본.
- None: 항상 붙임(크로스 사이트), Secure 필수.
방어2 CSRF 토큰:
1) 서버가 예측 불가 랜덤 토큰 발급
2) 클라가 요청 시 헤더/body에 담아 전송
3) 서버가 "세션+CSRF 토큰" 짝 검증
evil.com은 이 랜덤 토큰 모름(같은 출처 아니라 못 읽음)→위조 불가. 상태 변경(POST/PUT/DELETE)에 적용.
정리: SameSite=Lax 기본+중요 변경엔 CSRF 토큰. HttpOnly(XSS)+SameSite+CSRF 토큰(CSRF)=삼중 방어.

## ② 액세스 토큰 vs 리프레시 토큰 (존재 이유=자동 로그인)
딜레마: 수명 짧으면 안전하나 자주 로그인(불편), 길면 편하나 탈취 시 오래 악용(위험).
해결(두 토큰):
- 액세스: 짧음(15분~1h), 매 요청 첨부, 메모리 저장, 노출 큼.
- 리프레시: 김(수일~수주), 액세스 갱신용, HttpOnly 쿠키, 노출 적음.
흐름(자동 로그인 실체):
1) 로그인→액세스(15분)+리프레시(2주) 발급
2) API마다 액세스 첨부
3) 15분 후 만료→401
4) 클라가 리프레시로 "새 액세스 주세요"
5) 서버 검증→새 액세스 발급
6) 사용자는 모름→끊김 없이 사용(=자동 로그인)
인과: 액세스 탈취돼도 15분이면 만료(피해 최소)+리프레시는 HttpOnly라 탈취 어렵고 갱신 때만 노출. "2주 유지"(편의)+"탈취 피해 최소"(보안) 동시 달성.
★ 리프레시 회전(rotation): 갱신마다 리프레시도 새로 발급+기존 폐기. 탈취된 것 재사용 시 감지해 세션 차단.

## ③ React Query "서버 상태"의 서버 = 백엔드 API (헷갈림 해소)
- 서버 상태: 원본이 백엔드(API/DB)에 있는 데이터. 프론트는 fetch해 사본(캐시)만 들고 있음.
- 클라이언트 상태: 프론트에만 존재(모달/폼 값/다크모드).
- ★ React Query의 "서버" = 당신의 백엔드 API 서버(NestJS/Express). Next 서버 컴포넌트나 리액트 서버가 아님.
Next와 관계:
- Next 서버 컴포넌트: Next 서버에서 렌더링 시 데이터 미리 fetch(위치=렌더링).
- React Query: 브라우저에서 백엔드 API fetch·캐싱(개념=데이터 원본).
- 다른 층. 초기 데이터는 서버 컴포넌트, 이후 인터랙션은 React Query로 함께 씀.

## ④ DTO & ValidationPipe (NestJS)
DTO: 계층 간 데이터 형태 정의 객체. "이 요청/응답은 이런 필드"의 계약.
  class CreateUserDto { @IsEmail() email; @IsString() @MinLength(8) password; @IsOptional() @IsInt() age?; }
왜: 명확한 계약(타입 명시)+유효성 기준(데코레이터)+엔티티와 분리(내부 필드 숨김).
ValidationPipe: 컨트롤러 도달 전 입력 변환·검증. DTO 규칙과 대조.
  app.useGlobalPipes(new ValidationPipe({ whitelist:true(없는 필드 제거), forbidNonWhitelisted:true(없는 필드 에러), transform:true(타입 변환) }))
- 위반이면 자동 400(컨트롤러 도달 전)→컨트롤러는 검증된 데이터만 받음. 검증 로직을 컨트롤러에서 분리.

## ⑤ NestJS 요청 한 바퀴 (전체 흐름) ★
[클라 요청]
① Middleware: 가장 먼저. 로깅/CORS/body 파싱/토큰 추출. Express 레벨.
② Guards: 인증·인가("접근 권한 있나?"). JWT 검증/역할. 실패 403/401.
③ Interceptors(before): 요청 가로채 부가 처리(로깅/타이머 시작).
④ Pipes: 입력 변환·검증(ValidationPipe가 DTO로). 위반이면 400.
⑤ Controller: 라우트 핸들러, Service 호출.
⑥ Service: 비즈니스 로직(DI 주입).
⑦ Repository: DB 접근(TypeORM/Prisma), 쿼리 실행.
[DB] 읽기/쓰기
→ 역방향 ⑦→⑥→⑤ 반환
③ Interceptors(after): 응답 가로채 변형(포맷 통일/로깅 완료/시간 측정).
② Exception Filters: 에러 잡아 응답 포맷팅.
[클라 응답]
★ 인터셉터 vs 미들웨어: 미들웨어=컨트롤러 전에만, Express 레벨. 인터셉터=요청 전+응답 후 양쪽, Nest 레벨(응답 변형 가능, 포맷 통일 {data:...}이 대표 용도).
한문장: "미들웨어(전처리)→가드(인증/인가)→인터셉터(전처리)→파이프(DTO 검증)→컨트롤러→서비스(로직)→레포지토리(DB), 응답은 인터셉터(후처리)로, 에러는 예외 필터가 잡음."
