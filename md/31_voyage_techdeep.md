# [문서31] 프로젝트 Voyage — 기술 심화
> 개요 문서와 짝. "구체적으로 어떻게 짰나"를 묻는 기술 질문 대비용.
> 각 항목은 파일명·라이브러리·구조를 정확히 짚고 "왜 그렇게 했나"를 붙임.

---

## 1. 백엔드 — 프레임워크 선택
FastAPI(Python) 왜:
1. 생태계 통일: 무게중심이 API가 아니라 콘텐츠·채점·음원 파이프라인. LLM SDK, 임베딩(OpenAI), TTS(ElevenLabs), 오디오(pydub)가 전부 Python이라 API 서버도 Python이면 같은 코드에서 파이프라인 호출. 언어 경계 없음.
2. 비동기+타입: async 네이티브라 TTS/외부 API 같은 I/O 바운드에 유리. Pydantic 타입 검증으로 요청/응답 스키마 코드로 강제.
3. 자동 문서화: OpenAPI 스펙 자동 생성(API_SPEC.md). 프론트와 API 계약 맞추기 쉬움.
4. 가벼움: 개인/소규모라 Django처럼 무거운 풀스택은 과함. 라우팅+검증만.
★ 트레이드오프 인지: GIL 때문에 CPU 바운드엔 약함. 근데 무거운 작업(음원 생성)은 런타임 API가 아니라 오프라인 스크립트(generate_all.py)로 분리. Railway 무료 플랜 HTTP 타임아웃(~100초) 안에서 음원 생성 불가 → 생성은 로컬, 결과물만 R2/DB에. 프레임워크 한계를 아키텍처로 우회.

## 2. 백엔드 — SQL 라이브러리와 DB
SQLAlchemy(ORM):
- models_db.py: User, Lesson, LearningRecord, Bookmark, Playlist 등.
- db.py: 3단 폴백 — DATABASE_URL(Railway 메인)→DATABASE_FALLBACK_URL(Neon 폴백)→로컬 SQLite(dialogue.db). _try_connect로 순서대로 시도.
- init_db.py: 테이블 초기화.
왜 ORM: 로컬 SQLite↔운영 PostgreSQL을 코드 변경 없이. 개발 SQLite, 배포 PG로 같은 모델 재사용.
왜 메인-폴백: 운영 DB 장애 대비. ★ 함정: migrate가 쓴 DB와 앱이 읽는 DB가 다르면 "migrate는 됐는데 앱엔 안 뜸". 그래서 반영 후 "앱이 읽는 DB에 직접 COUNT 쿼리"로 정합성 확인 절차. (이 함정을 안다는 것 자체가 면접 포인트)
JSON 컬럼 활용: practice(dialogue 배열)는 정규화 안 하고 PostgreSQL JSON 컬럼에 통째로. 레슨 콘텐츠는 함께 읽고 쓰는 단위라 조인보다 JSON이 단순·빠름. references/critical_keywords 채점 메타도 이 JSON 안에.
→ ORM vs 생 SQL 경계의 실제 코드는 문서32(DB 접근 전략), 백엔드 파일별 역할 실측은 문서33.

## 3. 백엔드 — 스키마 설계
콘텐츠 스키마(레슨 JSON) — 단일 진실원:
레슨 하나 = 최상위 9필드(전부 필수, 필드명 변경 금지):
id, theme, ambient, situation_tags, lesson_info, practice, expressions, reaction, pronunciation
★ 핵심 설계 결정 3가지:
(a) level/category를 데이터에 안 넣음. id 접두어로 migrate가 생성(E/S→A2, L→B1). 이유: 데이터에 박으면 불일치 위험. 접두어에서 파생하면 항상 일관. 기존 DB 불일치 0행 검증.
(b) validate.py가 스키마의 "정답"(SSOT). 문서와 코드 충돌 시 코드가 이김. 스키마를 문서가 아니라 실행 가능한 검증 스크립트로 강제. 사람 판단보다 신뢰도↑.
  규칙 예: expressions 8필드 필수·pattern_examples 정확히 3개·dialogue_examples 2개 / reaction variations 5개·빈칸 1개 / pronunciation chunks 3개 / orphan 검사(참조 문장이 실제 dialogue에 존재) / 쌍둥이 검사(두 레슨 파생탭 md5 100% 동일이면 실패, 복붙 방지) / tag 11종 화이트리스트만.
(c) 난이도(E/L/S)는 공통 스키마+개수만 변형. 구조는 전부 같고 dialogue 턴 수와 expr/pron/react 개수만 다름(E·L=10턴 4/3/3, S=5~6턴 2/1/2). 고정 개수(3/2/5/3)는 난이도 무관 동일 → 검증 로직 하나로 3난이도 커버.
DB 스키마(운영): lessons 테이블 — id, level, category, title, practice(JSON), quality_score(INT), quality_grade(TEXT), quality_detail(JSON). level/category는 migrate가 접두어로 채움. quality_score는 별도 채점 파이프라인.

## 4. 백엔드 — 주요 파일 구성
```
backend/app/
├── main.py              FastAPI 엔트리 — 47개 라우트(실측)
├── db.py                DB 엔진(Railway 메인/Neon 폴백/SQLite 로컬)
├── init_db.py           테이블 초기화
├── models_db.py         SQLAlchemy 모델
├── core/                도메인 코어(외부 연동)
│   ├── tts_service.py    TTS(ElevenLabs/Edge)+음성 ID 매핑+캐시 키
│   ├── r2_storage.py     Cloudflare R2 음원 스토리지
│   ├── cache.py          TTS 캐시 로직
│   └── chunker.py / templates.py / models.py
├── services/            비즈니스 로직
│   ├── content.py        레슨 콘텐츠 단일 소스(코드 내장)
│   ├── content_db.py     DB→dict 변환, level/category 조회
│   ├── audio_pipeline.py 음원 빌드(합성·타이밍)
│   ├── scoring.py        발화 채점(의미/표면/references)
│   └── stt_client.py     STT+임베딩(OpenAI)
└── utils/mixer.py       오디오 믹싱
backend/ (루트 스크립트)
├── migrate_content.py    content.py→DB 마이그레이션
├── generate_all.py       전체 음원 일괄 생성(오프라인)
└── test_scoring.py / test_meta_regression.py
```
구성 원칙:
- core=외부 연동(TTS,R2,캐시) / services=우리 도메인 로직(콘텐츠,채점,음원 합성). 외부 의존과 내부 로직 분리.
- 런타임(main.py) vs 오프라인 스크립트(generate_all/migrate) 분리. 무거운 배치는 API에서 빼서 스크립트로. Railway 타임아웃 회피+관심사 분리.
- content.py=콘텐츠 단일 소스. DB는 파생물. 항상 batches JSON→content.py→migrate→DB로만.
★ 실측(문서33): content.py는 49k줄로 전체 코드의 88%(로직 아니라 데이터). 런타임 라우트는 main.py 단 하나(47개). 미참조 레거시 5개(pm6r_builder 등)는 PM6R/Dialogue 초기 설계 잔재로 인지 중.
주요 API:
GET /api/lessons(목록) / GET /api/lesson/{id}(상세) / GET /api/stats(통계) / POST /api/session/start·complete / GET /audio/{hash}.mp3(캐시 음원) / POST /api/users/sync(Supabase JWT 검증, 여기서만).

## 5. 프론트 — 프레임워크 선택과 구성
React+Vite+Capacitor 왜:
- React+Vite: 컴포넌트 UI, Vite로 빠른 개발/빌드. 외부 UI 라이브러리 없이 순수 CSS+SVG(번들 경량화, 완전한 제어).
- Capacitor: 웹 코드를 그대로 iOS/Android 네이티브로 감쌈. 하나의 코드베이스로 3플랫폼. 네이티브 성능 필수 아니라 웹뷰로 충분. 모바일 빌드는 --mode mobile로 분기(.env.mobile).
★ 트레이드오프: 웹뷰 한계 — iOS WebView는 <audio>.volume 무시. "볼륨을 오디오 파일에 미리 구워넣고 코드에선 volume=1.0"로 우회(8번). 웹뷰 선택의 대가를 알고 대응.
프론트 파일 구성:
```
frontend/src/
├── main.jsx·App.jsx·App.css·index.css   엔트리+루트(5탭 네비)
├── components/ (각 .jsx+.css 쌍)
│   ├── LessonList·LessonModal·Player       학습 흐름 핵심
│   ├── Library·Schedule·Profile·Dashboard  탐색/관리/홈
│   ├── SpeechScorer·Pronunciation·Reaction 발화/발음/리액션
│   ├── Expressions·FinalReview·TipTab      표현/복습/팁
│   ├── AuthModal·SettingsModal·DialogueIntroModal
│   └── BlurImage·Icons                     공통 UI
├── hooks/  useSpeech.js·useBeep.js
└── utils/
    ├── api.js            API_BASE 중앙관리+apiFetch 래퍼
    ├── supabase.js       Supabase Auth 클라이언트
    ├── useRecorder.js    녹음
    ├── sttTrial.js       STT 체험
    ├── ambientSession.js 배경음
    ├── heroImage.js      썸네일/히어로 매핑
    └── lessonCategories.js·levelLabel.js
```
구성 원칙:
- 컴포넌트마다 .jsx+.css 쌍 — 스타일 지역화, 전역 오염 방지.
- utils/api.js에 API_BASE 중앙관리+apiFetch 래퍼 — API 호출 단일화(인증 헤더, 베이스 URL). 컴포넌트가 fetch 직접 안 부름.
- utils에 관심사별 유틸 분리 — 녹음/STT/배경음/이미지 매핑을 각 파일로.

## 6. 플레이어 구현(Player.jsx) — 가장 기술적
"오디오 학습 앱의 심장을 어떻게 구현했나". 깊게 물으면 여기.
타임라인 기반 재생:
음원 합성 시 만든 timeline.json을 따라 재생:
  { lesson_id, title, duration_sec, events[] }, events: { type, label, tab, time_ms, time_sec }
- 이벤트 타입: intro_en, memorization, reflection, rehearsal, speed, retrieval, prompt, reaction, pron_chunk 등.
- 플레이어는 오디오 파일 하나를 재생하며 현재 시각(time)에 맞는 이벤트를 찾아 화면 하이라이트·탭 전환·단계 표시. 단계 구조가 음원·타임라인에 이미 박혀 나오므로 프론트는 "지금 어디쯤인지"만 따라감.
3개 독립 오디오 ref — 동시 재생/부분 정지 (핵심 설계):
- audioRef: 메인 대화 음성(TTS 학습). 서버 캐시에서 서빙.
- bgAudioRef: 리듬 비트(reflection_bg.wav). Reflection(리듬 느끼기) 단계 전용.
- ambientAudioRef: 테마 배경음(ambient/*.mp3). +ambientTimerRef(페이드 타이머, 중복 방지).
→ 셋을 별도 볼륨/재생 제어 → 동시에 겹쳐 재생하거나 일부만 멈춤(메인 대화 위에 리듬 비트 얹기).
상태 전환 처리(구현 디테일):
- 마운트 시 bg/ambient 볼륨 0 초기화 → 갑작스런 큰 소리 방지.
- Reflection 진입 시: 비트 켜되 500ms 가드(진입 후 500ms 뒤에도 여전히 Reflection이어야 재생, 빠르게 지나가는 단계에서 비트 깜빡임 방지). 볼륨 페이드인.
- Reflection 이탈/탭 이동 시: 비트 페이드아웃→pause+currentTime=0. 비트는 리듬 단계 전용.
- 탭 구조: practice/reaction/pronunciation/expressions.
★ 설계 포인트: "오디오 상태 전환은 race condition이 잘 남. 500ms 가드, 페이드 타이머 중복 방지, 마운트 시 볼륨 0 초기화 — 전부 '의도치 않은 소리/끊김'을 막는 방어 코드."

## 7. 학습 설계가 코드에 박힌 부분 (GAP 상수)
플레이어와 음원 합성이 공유하는 타이밍 설계. "왜 이 숫자?"에 답할 수 있으면 강함.
음원 합성(audio_pipeline.py) 단계별 무음 간격:
- GAP_REHEARSAL=6000ms: 떠올려 말하기(인출) 대기. 학습자가 답을 스스로 떠올릴 시간. ★ 학습 설계 핵심이라 건드리면 안 되는 값.
- GAP_RETRIEVAL=500ms: 반사적으로 말하기 대기.
- GAP_ECHO_MEMORIZATION=2200ms: 따라 말하기 대기.
- 단계별 재생 속도: 따라하기 -10%, 빠르게 +20%, 발음 -15%(더 천천히).
★ 면접 포인트: "무음의 길이가 학습 효과를 결정. 6초 인출 대기는 '능동적 회상(active recall)'을 강제하는 장치. 학습 원리를 오디오 타이밍에 녹였다."

## 8. 개발 난점 (실제로 겪고 해결)
"어려웠던 점"에 던질 카드. 구체적일수록 신뢰.
난점1 — iOS WebView가 볼륨 무시:
- 문제: iOS WebView는 <audio>.volume 무시. 3개 오디오 코드 믹싱 볼륨 밸런스가 iOS에서 다 100%로 터짐.
- 해결: 볼륨을 오디오 파일에 미리 구워넣고(메인 -21dB, 비트 -28dB, ambient -43dB) 코드에선 volume=1.0. 웹뷰가 못 건드려도 파일 자체 음량으로 밸런스.
- 교훈: 플랫폼이 API를 무시할 수 있다. 제어권 없으면 데이터(파일) 쪽으로 옮긴다.
난점2 — STT 포맷 플랫폼별 불일치:
- Android가 raw AAC를 m4a 라벨로 전송→Whisper 실패. 매직바이트로 실제 컨테이너 감지+ffmpeg 변환. "라벨 말고 바이트를 검증."
난점3 — 랜덤 비트 파일 HTTP 416:
- 문제: 크기 다른 비트 파일들(9MB vs 2MB)을 한 URL로 랜덤 응답→<audio loop>가 Range 재요청 중 파일 바뀌어 416(Range Not Satisfiable)→재생 뭉개짐.
- 시도: no-store, 302 리다이렉트 다 실패.
- 해결: 단일 비트로 복귀. 여러 파일을 한 URL로 서빙하려면 크기/길이/포맷 통일하거나 프론트에서 URL 고정.
- 교훈: <audio> Range 요청은 파일이 불변이라 가정. 서빙 계층에서 이 가정을 깨면 안 됨.
난점4 — 정적 오디오 서빙 경로 착각:
- 문제: 비트/ambient를 backend/app/static에 뒀는데 서버가 안 봄.
- 원인: STATIC_DIR이 frontend/dist(Railway가 vite build로 public→dist 복사). 정답 경로는 frontend/public/audio. backend/static은 레거시 폴백.
- 교훈: 빌드 파이프라인이 파일을 어디로 옮기는지 모르면 "분명 넣었는데 없다"에 빠짐.
난점5 — 모바일 비트 진입 끊김 (미해결로 정직하게):
- 리듬 단계 바로 진입 시 모바일에서 비트가 잠깐 들리다 끊김(웹 정상). 추정: WebView 오디오 디코드 지연+진입 즉시 play 경합. → 정직하게 "아직 해결 못 한 이슈"로 말할 수 있음(모르는 걸 안다고 안 하는 태도가 오히려 신뢰).
난점6 — 콘텐츠 정합성(DB 직접수정 함정):
- 레슨 분리 후 title 중복(54쌍). DB 직접 UPDATE는 다음 migrate 때 덮어써짐→소스(batch)부터 고쳐 파이프라인 재실행으로 근본 해결. "단일 소스 원칙 지키려 당장 손 더 가는 길을 택함."

## 9. 예상 기술 질문 대비
- "왜 ORM? 생 SQL은?" → 로컬 SQLite↔운영 PG 무변경 전환, 모델 재사용. 복잡 쿼리(정합성 검증)는 생 SQL도 병행.
- "practice를 왜 JSON 컬럼에?" → 함께 읽고 쓰는 단위라 조인보다 단순·빠름. 채점 메타도 같이.
- "level을 왜 데이터에 안 넣나?" → 접두어에서 파생 생성→항상 일관. DB 검증으로 불일치 0행.
- "플레이어에서 오디오 3개를 어떻게 관리?" → 3개 독립 ref, 별도 볼륨/재생 제어. 500ms 가드·페이드 타이머로 경합 방어.
- "timeline.json의 역할?" → 음원에 단계 구조를 박아 생성→프론트는 시각만 따라가며 하이라이트/탭전환.
- "가장 까다로웠던 버그?" → STT 포맷(매직바이트) 또는 iOS 볼륨(파일에 구워넣기).
- "Capacitor 성능 이슈는?" → 웹뷰 한계 있음(볼륨 무시 등). 필요한 곳만 파일/네이티브로 우회. 무거운 작업은 오프라인 스크립트로.
- "테스트는?" → test_scoring.py, test_meta_regression.py — 채점 로직 회귀 테스트.

## 핵심 한 줄
"백엔드는 파이프라인 생태계 통일 위해 FastAPI+SQLAlchemy(Railway PG 메인/Neon 폴백/SQLite 로컬), 콘텐츠는 batch→content.py→migrate→DB 단일 소스로만 흐르며 validate.py가 스키마 강제. 프론트는 React+Vite+Capacitor 단일 코드베이스, 플레이어는 timeline.json 따라 3개 독립 오디오 ref를 경합 방어하며 재생. iOS 볼륨 무시·STT 포맷·HTTP 416 같은 웹뷰/서빙 함정을 직접 진단·해결."
