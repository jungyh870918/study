# [문서] React · Next.js 핵심 사전 (프론트 면접 대비)
> 흩어진 React/Next 내용을 한곳에 모은 사전식 정리. 개념·용어·특징 위주. 마이너한 건 제외.
> 앞선 문서: 상태관리(26 React Query/Redux/Hooks), CSRF·토큰·NestJS(28), 병원결제 Next 실전(34).

---

## A. React 핵심

### A1. 근본 개념
- 컴포넌트: UI를 재사용 가능한 조각으로. 함수형이 표준(클래스형은 레거시).
- 선언형: "어떻게 그릴지"가 아니라 "어떤 상태면 어떤 UI인지"를 선언. 상태가 바뀌면 React가 알아서 다시 그림.
- 단방향 데이터 흐름: 데이터는 부모→자식(props)으로만. 예측 가능성↑.
- Virtual DOM: 실제 DOM 조작은 비쌈 → 가상 DOM에서 변경분(diff)을 계산해 바뀐 부분만 실제 DOM에 반영(reconciliation). "직접 DOM 안 만지고 상태만 바꾼다."

### A2. JSX
- JavaScript 안에 HTML처럼 쓰는 문법. 빌드 시 React.createElement 호출로 변환.
- 표현식은 {}로 삽입. class 대신 className, 이벤트는 camelCase(onClick).
- 반드시 하나의 부모로 감쌈(<>...</> Fragment 사용 가능).

### A3. props vs state
- props: 부모가 자식에게 내려주는 값. 자식은 읽기 전용(불변).
- state: 컴포넌트 내부에서 관리하는 변경 가능한 값. 바뀌면 리렌더.
- ★ 상태는 불변으로 다룸: 직접 수정 말고 새 값으로 교체(setState/setX). React가 변경을 감지하는 방식이 참조 비교라서.

### A4. Hooks (함수 컴포넌트의 핵심)
- useState: 로컬 상태. [값, 세터] 반환.
- useEffect: 사이드 이펙트(데이터 fetch·구독·타이머). 의존성 배열로 실행 시점 제어, return으로 클린업(구독 해제 등).
  - []면 마운트 시 1회, [dep]면 dep 바뀔 때, 없으면 매 렌더.
- useContext: 전역값 공유(prop drilling 회피). 저빈도 변경(테마·인증).
- useMemo: 비싼 계산 결과 캐싱(의존성 안 바뀌면 재계산 X).
- useCallback: 함수 재생성 방지(자식에 함수 넘길 때 리렌더 최적화).
- useRef: 리렌더 없이 값 유지 + DOM 요소 직접 접근.
- useReducer: 복잡한 상태 로직을 reducer로(Redux 축소판).
- 커스텀 훅: use로 시작하는 로직 재사용 단위(useAuth, useDebounce).
★ 훅 규칙: 최상위에서만 호출(조건문·반복문 안 X), React 함수 안에서만. 호출 순서가 고정돼야 React가 상태를 매칭.

### A5. 렌더링 & 최적화
- 리렌더 트리거: state 변경, props 변경, 부모 리렌더.
- key: 리스트 렌더 시 각 항목 식별자. 인덱스 대신 고유 id 권장(순서 바뀔 때 버그 방지).
- React.memo: props 안 바뀌면 컴포넌트 리렌더 스킵.
- 최적화 3종(useMemo/useCallback/memo)은 남용 금지 — 측정 후 병목만.
- 지연 로딩: React.lazy + Suspense로 컴포넌트 코드 분할(초기 번들↓).

### A6. 기타 자주 나오는 것
- 제어 컴포넌트: 입력값을 state로 관리(value+onChange). vs 비제어(ref로 읽기).
- 이벤트: SyntheticEvent(브라우저 이벤트 래핑, 크로스브라우저 일관성).
- 에러 바운더리: 하위 렌더 에러를 잡아 폴백 UI(클래스형만 가능, 또는 라이브러리).
- Portal: DOM 트리 바깥에 렌더(모달·툴팁).
- StrictMode: 개발 중 잠재 문제 감지(이펙트 2번 실행 등).

## B. React 상태관리 (요약 — 상세는 문서26)
- 서버 상태(API 데이터) → React Query(TanStack): 캐싱·dedup·stale-while-revalidate·자동 refetch.
- 클라 전역 상태 → Redux Toolkit / Zustand: 모달·테마·필터.
- 로컬 → useState, 저빈도 전역 → useContext.
- ★ "서버 상태는 React Query, 클라 전역은 Redux"의 역할 분담이 현대 정석. Redux에 API 데이터 다 넣는 건 구식.

## C. Next.js 핵심

### C1. Next란 & 왜 쓰나
- React 기반 풀스택 프레임워크. React만으로 부족한 것(라우팅·SSR·번들 최적화·백엔드)을 통합 제공.
- 핵심 가치: 렌더링 전략 선택(SSR/SSG/ISR/CSR), 파일 기반 라우팅, SEO, 성능 최적화 기본 내장.

### C2. 렌더링 전략 (★ 면접 핵심)
- CSR(Client-Side Rendering): 브라우저에서 JS로 렌더. 초기 로딩 느리고 SEO 불리. (순수 React)
- SSR(Server-Side Rendering): 요청 시 서버가 HTML 생성. 최신 데이터·SEO 유리, 서버 부하.
- SSG(Static Site Generation): 빌드 시 HTML 미리 생성. 가장 빠름, 자주 안 바뀌는 페이지(블로그·문서).
- ISR(Incremental Static Regeneration): SSG인데 일정 주기로 백그라운드 재생성. 정적 속도+최신성 절충.
- ★ 선택: 실시간 데이터·개인화=SSR, 고정 콘텐츠=SSG, 가끔 갱신=ISR, 상호작용 많은 대시보드 일부=CSR.

### C3. App Router (Next 13+, 현재 표준)
- app/ 디렉토리 기반. 폴더=경로, page.tsx=페이지, layout.tsx=공통 레이아웃.
- ★ 서버 컴포넌트가 기본: 페이지가 서버에서 렌더+데이터 직접 조회(async 컴포넌트). 번들에 JS 안 포함→가벼움.
- 클라이언트 컴포넌트: 파일 상단 'use client'. 상태·이벤트·브라우저 API·훅을 쓸 때만.
- ★ 경계 설계: 데이터 조회·정적 부분=서버 컴포넌트, 상호작용=클라이언트 컴포넌트로 분리.
- (구) Pages Router: pages/ 기반, getServerSideProps/getStaticProps. 레거시지만 여전히 씀.

### C4. 라우팅 — 정의 방식 (React Router vs Next)
★ 근본 차이: React Router는 "라우트를 코드에 선언", Next는 "파일 구조가 곧 라우트".
React(react-router-dom): 라이브러리 설치 후 <Route path element>로 매핑을 코드에 나열.
  <Routes><Route path="/about" element={<About/>} /><Route path="/product/:id" .../></Routes>
  동적 파라미터 :id, 읽기 useParams(). 404는 path="*".
Next(App Router): 폴더/파일 구조가 URL. 설치·선언 불필요.
- 폴더=경로 세그먼트, page.tsx=그 경로의 페이지. app/about/page.tsx → /about.
- [id]=동적 라우트. product/[id]/page.tsx → /product/123. 읽기: 서버 컴포넌트는 params props, 클라는 useParams().
- [slug]=SEO용 이름, [...all]=캐치올(여러 세그먼트).
- layout.tsx=하위 공통 레이아웃(중첩 가능). (그룹)=괄호 폴더, URL에 안 나타남(구획용).
- 특수 파일: loading.tsx(로딩 UI), error.tsx(에러 UI), not-found.tsx(404).

### C4-B. 페이지 이동 방식 (6가지)
(1) <Link href> — 선언적(클릭). 전체 리로드 없이 클라 전환 + 자동 prefetch(뷰포트에 보이면 미리 로드). 대부분의 링크.
(2) useRouter().push() — 명령형(로직 중 이동, 폼 성공 후 등). 'use client' 필요, next/navigation에서 import(구 Pages Router는 next/router — 헷갈리지 말 것).
    - push(히스토리 쌓임) / replace(히스토리 교체, 로그인 후) / back()·forward() / refresh(서버 데이터 재요청).
(3) redirect('/login') — ★ 서버 사이드 이동(서버 컴포넌트·서버 액션). React엔 없음. JS 로드 전 서버 단에서 이동→깜빡임 없음. 권한 체크에.
(4) notFound() — 서버에서 404 강제 트리거(리소스 없을 때).
(5) 미들웨어 NextResponse.redirect — 페이지 도달 전 요청 단계 이동. 전역 인증 게이트.
(6) <a> — 일반 링크(전체 리로드). 외부 링크에만.
언제 무엇: 클릭=Link / 로직 중=push / 히스토리 안 남기기=replace / 서버 권한 차단=redirect / 404=notFound / 전역 인증=미들웨어.
React Router 대응: <Route>→파일구조 / useNavigate()→useRouter().push() / useParams()→params·useParams() / redirect·notFound·미들웨어=Next 고유(서버 사이드).

### C5. 데이터 처리 (App Router)
- 서버 컴포넌트에서 직접 fetch/DB 조회: async function Page() { const data = await getData(); }.
- 서버 액션('use server'): 폼·변경(mutation)을 함수 호출처럼. API 라우트 없이 서버 로직 실행. revalidatePath로 캐시 무효화.
- Route Handler(app/api/.../route.ts): 외부가 부르는 것(웹훅)·명시적 API 엔드포인트.
- ★ 구분: 내부 변경=서버 액션, 외부 연동·웹훅=Route Handler, 조회=서버 컴포넌트.

### C6. 최적화 내장 기능 (자주 묻는 것)
- next/image (<Image>): 자동 WebP·리사이징·lazy loading·레이아웃 시프트 방지.
- next/link (<Link>): 클라 네비게이션 + 자동 prefetch.
- next/font: 폰트 self-host로 외부 요청 제거·시프트 방지.
- 코드 분할: 라우트별 자동 분할. dynamic()로 컴포넌트 지연 로딩.
- 메타데이터 API: export const metadata / generateMetadata로 페이지별 SEO(title·og).
- 캐싱: fetch 요청·라우트 캐싱 자동. revalidate로 주기 설정.

### C7. 미들웨어
- middleware.ts: 요청이 페이지 도달 전 실행(엣지). 인증 검사·리다이렉트·A/B·헤더 조작.
- 라우트 단에서 접근 제어(로그인 필요·관리자 전용).

### C8. Next가 React 대비 개선/차별화한 것 (★ 빈출)
React는 UI 라이브러리라 나머지를 직접 조립. Next는 프레임워크로 통합+개선. 거의 다 "서버를 활용한다"는 한 뿌리.
1. 렌더링(가장 큰 차이): React=CSR(브라우저 렌더, 초기 느림·SEO 불리) / Next=서버 렌더(SSR/SSG) 가능→첫 화면 빠름·SEO 유리, 페이지별 전략 선택.
2. 서버 컴포넌트: React=모든 컴포넌트가 클라 번들에 포함 / Next=조회·정적 부분은 서버 실행, 그 JS는 클라에 안 감→번들 경량화. 상호작용만 'use client'.
3. 라우팅: React=react-router 설치+<Route> 선언 / Next=파일 기반 내장 + 서버 사이드 이동(redirect/notFound).
4. 데이터 페칭: React=useEffect로 마운트 후 fetch(깜빡임) / Next=서버 컴포넌트가 렌더 전 미리 조회, 변경은 서버 액션(API 없이).
5. 최적화 내장: 이미지(<Image> 자동 WebP·lazy)·폰트(next/font)·코드분할(라우트별 자동)·prefetch가 기본. React는 라이브러리로 조립.
6. 풀스택: React=프론트만(백엔드 별도) / Next=Route Handler·서버 액션으로 백엔드가 한 프로젝트에.
7. 기타: layout.tsx 중첩 레이아웃, 미들웨어(요청 단계, React엔 없음—서버가 없으니), 메타데이터 API(SEO를 서버에서, React는 react-helmet).
한 장 요약: React=UI 라이브러리·CSR·클라 번들·라우터 설치·useEffect fetch·별도 백엔드 / Next=풀스택·SSR선택·서버컴포넌트·파일라우팅·서버조회·내장백엔드·미들웨어.
★ 핵심 통찰: "React + 서버 = Next". React는 브라우저에서만 도는 UI라 렌더링·SEO·데이터·백엔드가 클라 한계에 묶이는데, Next가 서버 레이어를 얹어 서버렌더·서버컴포넌트·서버액션·미들웨어·redirect가 가능해진 것. 대부분의 차별점이 이 하나로 설명됨.

## D. 렌더링·성능 용어 (프론트 공통)
- Hydration(하이드레이션): 서버가 보낸 정적 HTML에 JS(이벤트·상태)를 "붙여" 상호작용 가능하게 만드는 과정. "마른 HTML에 물(JS)을 부어 살린다".
  - 흐름: 서버가 HTML 렌더→전송 / 브라우저가 HTML 즉시 표시(보이지만 죽어있음, 클릭 안 됨) / JS 번들 다운로드 / Hydration으로 이벤트·상태 연결(살아남) / 상호작용 가능.
  - 왜: SSR로 첫 화면·SEO는 챙기되, JS를 나중에 붙여 동작도 살리려고. CSR(빈 HTML→JS가 처음부터 그림)보다 첫 화면 빠름.
  - 문제1 Hydration mismatch: 서버가 그린 HTML과 클라 렌더 결과가 다르면 에러. 원인=Date.now()/Math.random()/window 접근 등 서버·클라 다른 값.
  - 문제2 상호작용 지연: HTML 보이는데 JS 로드·Hydration 전까진 클릭 안 먹는 갭. 번들 크면 길어짐.
  - 개선: 서버 컴포넌트(JS 안 보냄→Hydration 대상 아님), Islands/Partial Hydration(상호작용 부분만), Streaming SSR+Suspense.
  - ★ Next 연결: App Router의 서버 컴포넌트는 JS 미전송이라 Hydration 없음. 'use client' 컴포넌트만 Hydration 대상→필요한 곳에만 'use client' 쓰는 게 비용 절감.
- CLS(Cumulative Layout Shift): 로딩 중 레이아웃이 밀리는 정도(이미지 크기 지정·폰트로 개선).
- LCP/FCP: 가장 큰/첫 콘텐츠가 그려지는 시점(성능 지표, Core Web Vitals).
- 코드 스플리팅: 번들을 쪼개 필요한 것만 로드(초기 로딩↓).
- Tree shaking: 안 쓰는 코드를 빌드에서 제거.
- prefetch: 다음에 갈 가능성 높은 페이지를 미리 로드.
- SPA vs MPA: 단일 페이지(클라 라우팅) vs 다중 페이지(서버가 매번 HTML).

## E. 면접 빈출 한 줄 답
- "React가 뭔가?" → 선언형·컴포넌트 기반 UI 라이브러리. 상태가 바뀌면 Virtual DOM으로 바뀐 부분만 다시 그림.
- "Virtual DOM 왜?" → 실제 DOM 조작이 비싸서, 가상 DOM에서 diff 계산 후 최소 변경만 반영.
- "useEffect 언제?" → 렌더 외의 사이드 이펙트(fetch·구독·타이머). 의존성 배열로 시점 제어, 클린업 필수.
- "Next를 왜 React 대신?" → 라우팅·SSR/SSG·SEO·이미지/폰트 최적화가 기본 내장. 렌더링 전략을 페이지마다 선택.
- "SSR vs SSG vs CSR?" → 요청 시 서버 렌더(SSR, 최신·SEO) / 빌드 시 정적(SSG, 최속) / 브라우저 렌더(CSR, 상호작용). ISR은 둘 절충.
- "서버 컴포넌트?" → App Router 기본. 서버에서 렌더+데이터 조회, JS 번들 미포함. 상호작용은 'use client'로 분리.
- "Hydration?" → SSR HTML에 JS를 입혀 상호작용 가능하게 만드는 과정.
- "상태관리 도구 선택?" → 서버 상태 React Query, 클라 전역 Redux/Zustand, 로컬 useState.
- "React Router와 Next 라우팅 차이?" → React Router는 <Route>로 코드 선언, Next는 파일·폴더 구조가 곧 라우트(내장).
- "Next에서 페이지 이동?" → 클릭은 <Link>(prefetch), 로직 중은 useRouter().push(), 서버 권한 차단은 redirect(), 404는 notFound().
- "Next가 React보다 나은 점?" → 서버 렌더(SEO·속도), 서버 컴포넌트(번들↓), 파일 라우팅, 서버 조회·서버 액션(백엔드 내장), 이미지/폰트 최적화. 핵심은 "React+서버".

## 핵심 요약
React=선언형·컴포넌트·Virtual DOM·단방향·Hooks. 상태는 불변으로. Next=React 풀스택(라우팅·SSR/SSG/ISR·SEO·최적화 내장). App Router는 서버 컴포넌트 기본+'use client' 경계, 데이터는 서버 컴포넌트(조회)/서버 액션(변경)/Route Handler(외부). 최적화는 next/image·link·font·코드분할·메타데이터가 기본. 상태관리는 서버=React Query·클라=Redux/Zustand 역할 분담.
