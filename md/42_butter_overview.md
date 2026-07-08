# [문서42] 프로젝트 Butter — 설명 자료 (개요)
> "무엇을 만들었나"보다 "왜 그렇게 설계했나 / 어떤 문제를 어떻게 풀었나".
> 면접관이 좋아하는 건 기능 나열이 아니라 판단의 근거. 각 항목 "문제→선택→이유→결과".

---

## 1. 한 문장 소개
Butter = 읽은 책을 잊지 않기 위한 독서 저널 & 아카이브 플랫폼. "읽은 것을 기억하는 공간."
- 책을 선택하면 GPT가 자동으로 맥락·인용·배경을 enrich하고, 6단계 가이드 질문으로 감상을 기록.
- 기록된 감상은 감정 지도·워드 클라우드·아크 다이어그램 등 5종 시각화로 독서 패턴을 탐색.
- AI가 누적 저널을 분석해 다음 책에 맞는 개인화된 질문을 생성.

엘리베이터 피치(30초):
"책을 읽은 경험은 대부분 사라진다. Butter는 독서 경험을 6단계 인터뷰 구조로 잡고,
GPT로 개인화된 질문을 던져 '이 책이 나에게 무엇이었나'를 기억 가능한 형태로 아카이브하는 앱.
감상이 쌓일수록 개인화 품질이 올라가는 플라이휠 구조."

## 2. 기술 스택 (왜 골랐나까지)
- **프론트 React + TypeScript + Tailwind CSS v4 + Vite**: 타입 안전성, Tailwind의 CSS 변수 연동으로 6개 테마 토큰 관리.
- **라우터 React Router v6**, **애니메이션 Framer Motion**: 페이지 전환, 패널 진입 모션.
- **백엔드 Express + TypeScript + Prisma ORM**: Node 생태계 통일(GPT SDK, 카카오/Google Books API). Prisma로 스키마 타입 자동 생성, 마이그레이션 추적.
- **DB PostgreSQL (Neon)**: Serverless PostgreSQL. Railway 배포와 분리해 DB 레이어 독립. `DATABASE_URL` + `DIRECT_URL` 이중 연결로 커넥션 풀 분리.
- **OpenAI GPT-4o-mini**: 책 enrich(quote·historicalContext), 유저 프로파일 추출, 개인화 질문 생성. mini 모델을 쓴 이유 — latency와 비용. 깊은 추론보다 구조적 JSON 출력이 목적이라 mini로 충분.
- **카카오 도서 API + Google Books API**: 카카오 1순위(한국어 도서 메타 품질), Google Books 2순위(영어권). 백엔드 프록시를 통해 API 키 노출 방지 + enrichment 병합.
- **배포 Vercel(프론트) + Railway(백엔드)**: 프론트는 정적 빌드라 Vercel 자동 배포. 백엔드는 Railway git push → 즉시 반영.
- **인증**: JWT — 로그인 응답에 token body 포함 + localStorage + `Authorization: Bearer` 헤더. 쿠키 방식은 Vercel↔Railway 크로스 도메인에서 sameSite 이슈(→7번).

## 3. 아키텍처 — 핵심 데이터 흐름
```
책 탐색:   프론트 → /api/books (카카오 프록시) → /api/books/:id/enrich (GPT)
저널 작성: 6단계 PROMPTS → answers 맵 → GPT → JournalEntry (content: "[시작]\n...[느낌]\n...")
개인화:   JournalEntry 누적 → /api/insights/profile (GPT extractProfile → UserProfile 저장)
           → /api/insights/questions (GPT generateQuestions, UserProfile 참조)
시각화:   JournalEntry[] → 프론트 d3.js 처리 (서버 계산 없음, 전부 클라이언트)
인증:     POST /api/auth/login → { token, user } → localStorage → Authorization: Bearer
```
강조할 설계 결정:
- **Book soft link (FK 없음)**: JournalEntry에 bookId/bookTitle/bookAuthor/bookCover를 스냅샷으로 비정규화 저장. 외부 API(카카오/Google Books) 데이터는 영속 보장이 없어서, 삭제·변경돼도 저널이 깨지지 않음.
- **시각화는 클라이언트 전담**: d3.js 계산을 서버가 아닌 프론트에서. 이유 — 시각화 파라미터(정렬·필터)가 인터랙션마다 바뀌고, 저널 데이터는 이미 앱에 로드된 상태라 추가 왕복 불필요.
- **UserProfile upsert**: GPT 결과를 DB에 저장(`@@unique userId`)해 매 요청마다 GPT 재호출하지 않음. `promptVersion` 필드로 프롬프트 교체 시 재생성 트리거 추적.

## 4. 디자인 레퍼런스 확정 — Stitch 활용
문제: "세련된 독서 앱"이라는 비전이 있지만 구체적 방향성 없이 코딩하면 UI 결정 하나하나가 흔들림.
해결 — Stitch(AI 디자인 레퍼런스 도구)로 레퍼런스 수집 후 방향 고정:

먼저 "THE ARCHIVIST", "Botanical Archive", "Oceanic", "Brutalist", "Blueprint", "Emerald Editorial" 6가지 아카이브 무드를 레퍼런스로 확정. 각 무드를 Butter의 테마로 1:1 매핑(Classic/Botanical/Oceanic/Brutalist/Blueprint/Emerald). CSS 변수 8종 토큰(`--color-butter-bg`, `--color-butter-text`, `--color-butter-primary` 등)을 테마별로 정의하고 `useTheme` 훅 하나로 런타임 교체.

세부 교정 과정:
- 레퍼런스에서 **"대형 타이포그래피 + 메타 정보 우측 배치"** 패턴을 확인 → 모든 페이지 헤더를 `clamp(2.6rem, 6vw, 4.5rem)` 대형 제목 + `REF. XXX-YYY` 코드 우측 배치로 통일.
- "잡지 편집 레이아웃" 레퍼런스 → 감정 지도의 "잡지" 탭 구현 (10종 카드 스펙 시퀀스, 각기 다른 너비와 표지 배치로 flex-wrap 자연 배치).
- 카드 간격·border 수 최소화, `borderRadius` 제거(직각 카드)로 아카이브/편집물 느낌 적용.

★ 인사이트: "디자인 방향을 레퍼런스로 먼저 고정하면 이후 모든 컴포넌트 결정의 기준이 생긴다. 결정 피로가 줄고 일관성이 올라감."

## 5. GPT 프롬프트 구조화 — 개인화 질문 생성
"AI 연동은 했는데 왜 그렇게 프롬프트를 짰나"를 설명할 수 있어야 함.

### A. 두 단계 분리 설계
한 번에 "저널 보고 질문 내줘"가 아니라 **추출 → 생성** 두 단계로 분리:
1. **extractProfile** (저널 → UserProfile): 누적 저널에서 독서 패턴을 구조화된 JSON으로 추출. 결과를 DB에 저장(캐시 역할).
2. **generateQuestions** (책 + UserProfile → 질문 3개): 저장된 프로파일을 참조해 현재 책에 맞는 질문 생성.

분리 이유:
- 프로파일은 "자주 바뀌지 않는 패턴"이라 매 요청마다 재계산 불필요 → DB 캐시.
- 질문은 "책마다 달라야" 하므로 매번 생성 → 단, 유저 문맥(프로파일)은 재사용.
- 관심사 분리: 프로파일 추출 프롬프트와 질문 생성 프롬프트가 독립적으로 개선 가능.

### B. 프롬프트 철학 — "분석 앱이 아님"을 명시
질문 생성 시스템 프롬프트의 핵심 규칙:
```
1. Start from the book. (책에서 출발)
2. Use the user profile only as a light supporting reference. (프로파일은 보조)
3. Do NOT make psychological claims about the user.
4. The user should feel "this app is thoughtful" — not "this app is analyzing me."
```
이 규칙 없이 프롬프트를 짜면 GPT가 "당신은 내성적인 성향이 있어서..." 식의 심리 분석 투 질문을 생성함. Butter는 독서 기록 앱이므로 이 경계를 시스템 프롬프트 레벨에서 명확히 차단.

볼륨 레벨별 개인화 강도 조절:
- `readingVolumeLevel === "low"`: 책 자체 중심, 개인화 최소.
- `"mid"`: 최근 독서 패턴과 가볍게 연결.
- `"high"`: 장기 패턴과 연결하되 과도한 개인화 금지.
→ 데이터가 없을 때 억지 개인화하지 않는 안전장치.

### C. 타입 안전 파싱
GPT 응답은 항상 `JSON.parse` 후 필드별 타입 검증:
```typescript
readingVolumeLevel: ["low","mid","high"].includes(parsed.readingVolumeLevel)
  ? parsed.readingVolumeLevel : "low",
recentEmotions: Array.isArray(parsed.recentEmotions) ? parsed.recentEmotions : [],
```
GPT 응답이 스키마를 벗어나도 앱이 깨지지 않도록. 마크다운 코드블록(`\`\`\`json`) 자동 제거도 포함.

## 6. 유저 성향 관리 — UserProfile 스키마 설계
```
model UserProfile {
  userId               String   @unique  // User당 1개, upsert
  readingVolumeLevel   String            // low | mid | high
  recentEmotions       String[]          // 반복 감정 패턴
  dominantThemes       String[]          // 반복 주제
  writingStyleSignal   String            // introspective | factual | emotional
  notableFragments     String[]          // 유저 특유의 표현 단편
  recentBookCategories String[]          // 최근 읽은 장르
  sourceEntryCount     Int               // 기반 엔트리 수
  profileVersion       Int               // 갱신마다 +1
  promptVersion        String            // 프롬프트 버전 추적 ("1.0")
  generatedAt          DateTime          // 마지막 GPT 생성 시각
}
```
★ 설계 포인트 3가지:
(a) **성격이 아니라 독서 경험 패턴만 추출**: `recentEmotions`는 책 읽을 때 느낀 감정, `dominantThemes`는 독서 주제. "내성적", "예민한" 같은 성격 판단은 추출 금지 — 시스템 프롬프트에서 명시적으로 막음.
(b) **promptVersion 추적**: 프롬프트를 개선하면 버전을 올리고, 서버에서 `profile.promptVersion !== PROMPT_VERSION`이면 재생성. "코드 배포"와 "데이터 갱신"을 연결하는 버전 관리.
(c) **upsert 패턴**: 엔트리 5개 이상일 때만 프로파일 생성/갱신. 데이터 부족한 초기 유저에게 억지 개인화하지 않음.

`notableFragments`는 유저가 자주 쓰는 표현 단편("딱히 없었다", "먹먹했다")을 저장. 질문 생성 시 이 표현 톤과 비슷한 언어로 질문을 생성하도록 GPT에 힌트 제공.

## 7. 데이터 시각화 — 5종 탭 구현
"어떻게 다양하게 구현했나"를 구체적으로. 전부 `d3.js` + 클라이언트 계산.

### 서재(Shelf) 탭
책 목록을 테이블로 정렬(최신/가나다/작가/분류). `useMemo`로 entries → bookFreq Map 집계.

### 잡지(Magazine) 탭
각 저널 감상을 10종 카드 스펙 시퀀스(`CARD_SPECS`)로 flex-wrap 배치. 카드마다 고유한 너비(280~680px), 표지 크기(XS~XL), 표지 위치(left/right/top/none)가 달라 "패션 잡지 편집 레이아웃" 효과. `justify-content: center`로 카드들이 가운데로 모임.

### 워드클라우드(WordCloud) 탭
`d3-cloud` 라이브러리로 감상 텍스트에서 단어 빈도 추출 → 나선형 배치. 한국어 조사·불용어 필터링 (`STOP_KO` 집합). `ResizeObserver`로 컨테이너 크기 변경 시 재렌더.

### 악보(Score) 탭
X축 = 날짜, Y축 = 감정 축(emotion × 도서). 날짜별로 도트를 놓고 선으로 연결. 감정이 여러 날짜에 걸쳐 연속되면 선이 이어지고, 끊기면 단절됨. 독서 감정의 시간적 흐름을 악보처럼 표현.

### 아크(Arc) 탭
책과 감정을 노드로, 연결 빈도를 아크 두께로 표현하는 바이파타이트 그래프.
- **모바일**: 노드를 Y축(세로)에 배치, 아크가 좌우로 뻗는 반타원.
- **PC**: 노드를 X축(가로)에 배치, 아크가 위로 솟는 반타원. `isMobile` 감지로 분기.
- **감정별 고유 색상**: 10색 팔레트로 각 감정을 구분 (이전엔 진하기로만 구분 → 색상 추가).
- **호버 인터랙션**: 특정 노드에 마우스 올리면 연결된 아크만 강조, 나머지 희미하게. `data-base-opacity` 속성으로 원래 opacity 저장 후 복원.

★ 공통 구현 패턴:
- `ResizeObserver` + `useState(dims)` → 컨테이너 크기 변경 시 SVG 재계산.
- `useMemo`로 entries 집계 분리 — 렌더마다 재계산 방지.
- `useEffect` deps에 `dims` 포함 → 크기 변경 시 d3 효과 재실행.

## 8. 구현상 난점 — 실제로 막혔던 것들

### (1) 크로스도메인 인증 — 쿠키 vs Bearer 토큰
Vercel(프론트)↔Railway(백엔드)는 도메인이 달라서 `httpOnly` 쿠키가 크로스사이트에서 전송 안 됨. 처음엔 쿠키만 발급했는데 프로덕션에서 모든 인증 요청이 401.
해결: 로그인 응답 body에 `token` 필드 추가 → 프론트가 `localStorage`에 저장 → 이후 모든 요청에 `Authorization: Bearer` 헤더. 쿠키도 유지(로컬 개발 호환). `getToken()`은 localStorage → 쿠키(httpOnly: false 전환 후) 순으로 fallback.

### (2) RouterProvider와 Context 차단
React Router v7의 `RouterProvider`는 외부 `Context.Provider`에서 값을 받지 못하는 문제. `<LocaleContext.Provider><RouterProvider /></LocaleContext.Provider>` 구조로 감쌌는데 locale 전환이 반영 안 됨.
해결: `LocaleContext.Provider`를 `RouterProvider` 안에 넣어야 함. `RootLayout` 컴포넌트 안에 `useState(locale)`을 이동시켜 라우터 트리 내부에서 Context 제공. Login 페이지도 별도로 로컬 Provider 적용.

### (3) Neon DB idle 연결 끊김
Neon Serverless PostgreSQL은 일정 시간 사용 없으면 연결을 끊음. 이후 첫 요청에서 Prisma가 `P1017(Connection closed)` 에러를 던지고 500 반환.
해결: Prisma `$extends`로 전역 쿼리 미들웨어 추가. `P1001/P1002/P1017` 및 "Connection"/"closed" 메시지 감지 시 최대 3회, 600ms 간격으로 `$connect()` 재시도 후 쿼리 재실행.

### (4) 모바일 반응형 — 책 상세 페이지
PC에서 12컬럼 그리드(좌 4 / 우 8)가 모바일에서 찌그러지는 문제. 단순히 col-span 수정으론 해결 안 됨 — 레이아웃 자체가 달라야 함.
해결: `md` 브레이크포인트로 **두 개의 완전히 다른 JSX**를 렌더. 모바일은 "커버 상단 → 제목 → 버튼 → 같은 작가 → 본문 → 카드 → 같은 장르"의 세로 단일 컬럼. 데스크탑은 기존 2단 그리드. `hidden md:block` / `block md:hidden`으로 분기.

### (5) 저널 기록물 단순 텍스트 문제
6단계 구조로 작성했는데 보관함에서 볼 때는 평문으로 나열되어 "작성 경험"과 "보기 경험"의 괴리가 큼.
해결: content 저장 포맷을 `[시작]\n내용\n\n[구절]\n내용` 구조로 정의. 보관함 뷰에서 `parseSections(content)`로 파싱 → 단계별 Q&A 인터뷰 형식으로 렌더. 각 단계에 `01/02/03` 인덱스와 원래 질문 텍스트를 희미하게 표시해 "작성 당시의 감성"을 재현.

## 9. 면접 포인트 요약
1. **AI 연동 두 단계 분리**: extractProfile(캐시) + generateQuestions(매번). "매번 GPT 부르지 않고 프로파일을 캐시"하는 구조.
2. **프롬프트 가드레일**: "분석 앱이 아님"을 시스템 프롬프트 레벨에서 강제. AI 응답 품질을 프롬프트 구조로 제어.
3. **Book soft link**: 외부 API 데이터를 신뢰하지 않고 스냅샷 비정규화. "DB 직접 참조 vs 비정규화 스냅샷"의 트레이드오프 선택 근거.
4. **시각화 5종 클라이언트 전담**: 서버 계산 vs 클라이언트 계산의 경계 판단.
5. **크로스도메인 인증 삽질**: 쿠키가 안 되는 이유와 Bearer 전환 이유.
6. **RouterProvider Context 차단 버그**: 프레임워크 내부 동작을 이해하고 구조로 우회.
7. **UserProfile promptVersion**: 프롬프트 개선과 데이터 재생성을 버전으로 연결하는 엔지니어링 감각.

## 10. 핵심 요약
독서 저널 + AI 개인화 + 5종 데이터 시각화. 책 연결은 외부 API soft link + 스냅샷 비정규화. GPT는 extractProfile(캐시) → generateQuestions(책별 생성) 두 단계. 프롬프트는 "독서 경험 패턴만, 심리 분석 금지"를 명시적으로 제한. 시각화 5종은 전부 d3.js 클라이언트 처리. 크로스도메인 인증은 Bearer 헤더로 해결. RouterProvider Context 차단은 RootLayout 내부 이동으로 해결.
