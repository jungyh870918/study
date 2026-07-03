# [공통] 기술 연상 사전 — 기술명→즉답 키워드
> 면접관이 기술을 언급하면 "네" 대신 그 기술의 대표 실무 포인트를 먼저 얹는다.
> 목적: 연상의 자동성 = "실제로 만들어봤다"는 신호 → 공감·신뢰. 후속 질문도 내 쪽으로 유도.

---

## 사용법
"Next 써봤어요?" → "네, Next면 파일 기반 라우팅이랑 SSR로 SEO 잡는 게 핵심이죠"처럼
기술명 뒤에 대표 키워드를 즉시 붙인다. 아래는 기술→따라나올 키워드 묶음.

---

## Frontend / Framework
Next.js →
- 파일 기반 라우팅(app/pages 구조)
- SSR/SSG/ISR → SEO(크롤러가 완성 HTML 받음)
- 이미지 최적화, 코드 스플리팅, 서버 컴포넌트, API Routes(BFF)
- 한마디: "CSR은 SEO 불리 → Next로 SSR/SSG 해서 크롤러에 완성 HTML."

React →
- 컴포넌트/상태(useState, 전역 Redux/Zustand)
- 리렌더 최적화(memo/useMemo/useCallback), 가상 DOM, key
- useEffect 의존성 배열/클린업

SEO →
- 메타 태그, Open Graph, 시맨틱 마크업
- SSR/SSG 초기 HTML, sitemap.xml, robots.txt
- Core Web Vitals(로딩 속도가 랭킹)

## Backend / NestJS
NestJS →
- OOP 구조 최적화(모듈/컨트롤러/서비스 계층 분리)
- DI(의존성 주입) — 테스트·결합도 관리 핵심
- 데코레이터, 인터셉터/가드/파이프(횡단 관심사)
- DTO+유효성(class-validator)
- 한마디: "Nest는 DI·모듈 구조로 OOP를 강제해 대규모 유지보수에 강하다."

Node.js →
- 비동기/논블로킹 I/O
- 이벤트 루프/이벤트 큐(싱글 스레드인데 동시성? → 이벤트 루프)
- Promise/async-await
- CPU 집약 약함 → 워커 스레드/별도 서비스
- 한마디: "Node는 싱글 스레드 이벤트 루프라 I/O 바운드 강, CPU 바운드 약."

## 도메인 기능
결제 →
- 결제 큐(폭주 완충, 중복 방지)
- PG 모듈(아임포트/토스페이먼츠/스트라이프)
- 멱등성 키(idempotency key) — 중복 결제 방지 핵심
- 트랜잭션 정합성, 상태 머신(pending→paid→failed), 웹훅(비동기 결과)
- 한마디: "결제는 멱등성 키로 중복 막고, 큐로 완충, PG 웹훅으로 최종 상태 확정."

Firebase →
- 푸시 알림(FCM)
- 시크릿 키/서비스 계정 관리
- 디바이스 ID(토큰) 저장(푸시 보내려면 기기 토큰 필요)
- 실시간 DB/Firestore, Auth(익명 로그인)
- 한마디: "FCM은 기기 토큰을 서버에 저장, 서버가 서비스 계정 키로 FCM에 요청."

## 인프라 / 데이터
Redis →
- 캐싱(cache-aside), 세션 외부화(서버 여러 대)
- Pub/Sub(실시간 전파), 분산 락, 랭킹(Sorted Set), rate limiting

Kafka / 메시지 큐 →
- 비동기 처리, 트래픽 완충(backpressure)
- 이벤트 기반, 서비스 디커플링, at-least-once, 컨슈머 그룹

Docker / K8s →
- 컨테이너화, 환경 일관성("내 로컬에선 되는데" 방지)
- 오케스트레이션, 오토스케일, 헬스체크/롤링 배포

JWT / 인증 →
- 스테이트리스 토큰, 액세스/리프레시 분리
- 서명 검증, 만료, 탈취 대응(짧은 만료+리프레시)
