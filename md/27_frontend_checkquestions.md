# [문서27] 인증·프론트엔드 확인 질문 — 핵심 점검용

---

## 1. 인증 저장소
- JWT는 "무엇"이고 쿠키/localStorage는 "무엇"인가? (형식 vs 위치)
- "JWT vs 쿠키"가 왜 잘못된 대비인가?
- 세션 방식과 JWT의 차이? JWT의 확장 장점과 단점(무효화)?
- localStorage의 치명적 약점은? (XSS)
- HttpOnly 쿠키가 막는 공격과 취약한 공격은? (XSS 방어/CSRF 취약)
- CSRF는 어떻게 방어? (SameSite+CSRF 토큰)
- 하이브리드 베스트 프랙티스를 설명? (액세스=메모리, 리프레시=HttpOnly 쿠키)
- SSR(Next)에는 왜 쿠키가 유리?
- 결국 어디 저장하든 무엇을 막는 게 근본? (XSS)

## 2. React/상태관리
- useEffect의 의존성 배열과 클린업은 각각 무엇?
- useMemo/useCallback을 남용하면 안 되는 이유?
- Next App Router에서 훅을 쓰려면? ('use client')
- 서버 컴포넌트와 클라이언트 컴포넌트의 경계는?
- React Query가 해결하는 문제? (수동 fetch 보일러플레이트)
- stale-while-revalidate란?
- React Query의 캐싱·dedup 장점?
- "서버 상태와 클라이언트 상태가 다르다"는 무슨 뜻?
- Redux Toolkit이 옛 Redux보다 나은 점?
- ★ 서버 상태·클라 전역·로컬 상태를 각각 무엇으로 관리? (역할 분담)
- "Redux에 API 데이터를 다 넣는다"가 왜 구식?
- Zustand는 언제?

## 3. NestJS DI
- DI를 한 문장으로?
- 직접 생성(new)의 문제와 DI의 이점?
- @Injectable과 생성자 주입의 역할?
- DI가 테스트를 쉽게 하는 이유?

## 4. 심화 (CSRF/토큰/NestJS 흐름)
- HttpOnly가 CSRF는 왜 못 막나?
- CSRF 공격이 토큰을 훔치는 건가 아닌가? (브라우저 자동 전송 악용)
- SameSite Strict/Lax/None 차이?
- CSRF 토큰이 위조를 막는 원리? (evil.com이 못 읽음)
- 액세스/리프레시 토큰을 왜 나누나? (보안vs편의 딜레마)
- 자동 로그인이 안전하게 되는 흐름?
- 리프레시 토큰 회전(rotation)이란?
- React Query가 말하는 "서버"는 어느 서버? (백엔드 API, Next 서버 아님)
- DTO를 왜 쓰나? (계약+검증+엔티티 분리)
- ValidationPipe는 언제 동작하고 위반 시 무엇을 반환?
- NestJS 요청 흐름 순서? (미들웨어→가드→인터셉터→파이프→컨트롤러→서비스→레포)
- 인터셉터와 미들웨어의 차이? (인터셉터는 응답 후도, 응답 변형 가능)

## 종합
- "웹 앱 인증을 설계한다면 토큰을 어디에 어떻게 저장하나?"
- "프론트엔드 상태를 서버/전역/로컬로 나눠 각각 무슨 도구를 쓰나?"
