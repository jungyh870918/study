# [문서26] 인증·프론트엔드 기본 — 면접 실전용
> 인증 저장소(JWT/쿠키/localStorage) + 상태관리(React Query/Redux/Hooks) + NestJS DI.

---

## 1. JWT / 쿠키 / localStorage (세션 관리)
개념 구분: JWT=토큰의 "형식"(무엇 저장), 쿠키/localStorage/메모리=저장 "위치"(어디에). 다른 축. "JWT vs 쿠키"는 잘못된 대비(JWT를 쿠키에도 localStorage에도 담을 수 있음).

JWT 본질(세션 vs 토큰):
- 전통 세션: 서버가 상태 보관(stateful), 클라는 세션 ID만. 확장 시 세션 공유 필요.
- JWT: 서버 서명만 검증, 상태 안 가짐(stateless) → 수평 확장 쉬움. 단 즉시 무효화 어려움(만료까지 유효)→블랙리스트/짧은 만료로 보완.

저장 위치별 장단점:
- localStorage: 간단·JS 접근 쉬움·5MB·CSRF 면역 / ★ XSS 취약(JS 탈취)·수동 헤더 주입·만료 수동.
- 쿠키(HttpOnly): ★ XSS 방어(JS 접근 불가)·자동 전송·SSR 친화 / CSRF 취약(대응 필요)·4KB·매 요청 오버헤드.
- 메모리(JS 변수): 가장 안전(새로고침 시 소멸) / 새로고침하면 사라짐→리프레시 토큰 필요.

두 공격:
- XSS: 악성 JS 주입→localStorage 탈취. HttpOnly 쿠키는 JS 접근 불가라 방어.
- CSRF: 요청 위조. 쿠키 자동 전송돼 취약→SameSite=Strict/Lax+CSRF 토큰 방어.

★ 실무 정답(하이브리드):
- 액세스 토큰(짧은 수명 15분) → 메모리(React state)
- 리프레시 토큰(긴 수명) → HttpOnly+Secure+SameSite 쿠키
- 두 공격 동시 최소화. XSS로도 지속 탈취 어렵고, 리프레시는 JS가 못 읽음.

상황별:
- REST+모바일/서드파티: localStorage/헤더(쿠키 못 쓰는 환경), CSP로 XSS 방어.
- 웹+SSR(Next): HttpOnly 쿠키(서버가 읽어 인증, Next 궁합).
- 보안 최우선(금융): 하이브리드+짧은 만료+리프레시 회전.
- ★ 원칙: "편하면 localStorage, 민감하면 HttpOnly 쿠키, 최고 보안은 하이브리드. XSS 막는 게 근본(뚫리면 어디 저장하든 위험)."

## 2. React Hooks
- useState: 로컬 상태. useEffect: 사이드이펙트(fetch/구독/타이머), 의존성 배열+클린업.
- useContext: 전역값(prop drilling 회피), 저빈도 변경(테마/인증).
- useMemo/useCallback: 비싼 계산·함수 재생성 방지(리렌더 최적화), 남용 금지.
- useRef: 리렌더 없이 값 유지·DOM 접근. 커스텀 훅: 로직 재사용.
★ Next(서버 컴포넌트 시대): App Router는 서버 컴포넌트 기본. 훅은 클라이언트 컴포넌트에서만('use client' 명시). 데이터 페칭=서버 컴포넌트(async), 인터랙션·브라우저 API=클라이언트 훅. 이 경계 나누기가 핵심.

## 3. React Query (TanStack Query)
정의: 서버 상태(API 데이터)를 관리. 캐싱·동기화·백그라운드 갱신 자동화.
인과: 전통은 useEffect fetch+useState+로딩/에러/캐싱 전부 수동(보일러플레이트 폭발). RQ는 자동화. "서버 상태는 클라 상태와 다르다"(원본은 서버, 캐시는 사본).
장점:
- 캐싱: 캐시에서 즉시 반환, 중복 요청 제거(dedup)
- stale-while-revalidate: 캐시 즉시 표시+백그라운드 갱신→체감 속도↑
- 자동 refetch: 창 포커스·재연결 시
- isLoading/isError 자동
- 낙관적 업데이트: 응답 전 UI 먼저, 실패 시 롤백
- 무한 스크롤·페이지네이션 내장
★ 비동기: 경쟁 상태·취소·재시도를 대신 처리. "서버 데이터면 useEffect 말고 React Query"가 반사.

## 4. Redux (Redux Toolkit)
정의: 앱 전역 클라이언트 상태를 예측 가능하게. 단일 스토어+액션+리듀서.
★ 최신 RTK 표준: 옛 Redux는 보일러플레이트 악명→RTK가 축소. createSlice(리듀서+액션 자동)/configureStore/createAsyncThunk(비동기). RTK Query(내장 데이터 페칭, RQ 유사).
★ 역할 분담(제일 중요):
- 서버 상태(API) → React Query(또는 RTK Query)
- 클라 전역 상태 → Redux/Zustand(모달·테마·필터·인증 UI)
- 로컬 컴포넌트 → useState
- 저빈도 전역 → useContext
- 오해 주의: "Redux에 API 데이터 다 넣기"는 구식. 서버 상태는 RQ, Redux는 순수 클라 전역만.
- Zustand: Redux보다 가벼운 대안(보일러플레이트 적음). 소규모=Zustand, 복잡·대규모=RTK.

## 5. NestJS 의존성 주입(DI)
정의: 객체가 의존성을 직접 안 만들고 외부에서 주입받음. Nest 핵심.
인과: 직접 생성(new Service())은 강결합→테스트 어렵고 교체 불가. DI는 인터페이스 의존+구현 주입→느슨한 결합·테스트 쉬움(목 주입)·재사용.
구현: @Injectable()(주입 가능 프로바이더)+생성자 주입(constructor(private svc: Service)). IoC 컨테이너가 생명주기 관리+자동 주입. @Module로 등록·스코프.
★ 본질=관심사 분리+테스트 용이성. "Nest는 DI로 OOP 구조를 강제해 대규모 유지보수 강함"(연상사전). 스프링 DI와 같은 철학.
