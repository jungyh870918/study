# [문서37] 프로젝트 Voyage — 백엔드/기술 스택 상세
> 기술 스택 + 구현 방법 구체 정리. 라이브러리 일반 동작(검증) + 프로젝트 특유 내용 결합.
> ★ 집중 환기용 원자료.

---

## 1. 기술 스택 전체 지도

백엔드
- 언어/프레임워크: Python + FastAPI (async 네이티브, Pydantic 타입검증, OpenAPI 자동문서)
- ORM/DB: SQLAlchemy + PostgreSQL (Railway 메인 / Neon 폴백 / 로컬 SQLite)
- TTS(음성합성): ElevenLabs(고음질 유료) + edge-tts(무료 폴백)
- STT(음성인식): OpenAI Whisper API + 임베딩(text-embedding)으로 채점
- 오디오 처리: pydub(믹싱·볼륨·페이드), ffmpeg(포맷 변환)
- 스토리지: Cloudflare R2(S3 호환) — 음원 파일 저장, 백엔드는 302 리다이렉트
- 인증: Supabase Auth(이메일 OTP, JWT)
- 배포: Railway(백엔드, git push 자동배포)

프론트엔드
- React + Vite (컴포넌트 UI, 빠른 빌드, 외부 UI 라이브러리 없이 순수 CSS+SVG)
- Capacitor — 웹 코드를 iOS/Android 네이티브로 감싸는 크로스플랫폼 런타임
- 상태: React hooks (useState 등), 전역 상태 라이브러리 최소화

핵심 설계 축
- 콘텐츠 단일 소스(SSOT): batches/*.json → content.py → migrate → DB → 런타임 조회
- 텍스트/음원/삽화를 독립 파이프라인으로 분리 (생성도구·비용구조가 달라서)
- 런타임(main.py)은 가볍게, 무거운 생성(음원)은 오프라인 스크립트로

## 2. TTS — ElevenLabs에서 무엇을 가져오나
ElevenLabs 역할: 대화문(dialogue) 텍스트를 실제 사람 같은 음성으로 합성. 학습 음원의 메인 화자 목소리를 여기서 가져온다.
- 입력: 텍스트 + voice_id(화자별 목소리 ID) + 설정(속도 등)
- 출력: mp3 오디오 바이트
- 화자 매핑: 대화에 여러 화자(예: CUSTOMER/BARISTA)가 있으면 각 화자에 다른 voice_id를 매핑 → 대화가 실제 두 사람 대화처럼 들림. (audio_pipeline이 화자→voice_id 매핑 관리)
- 캐시: 같은 (텍스트 + voice + rate)면 재생성 안 하고 캐시 재사용 → API 비용 통제. 캐시 키 = text+voice+rate 해시. 구조·간격(GAP) 변경은 무료(캐시 히트), 새 문장·새 화자만 과금.
왜 ElevenLabs? 영어 학습은 발음·억양 품질이 핵심 → 고음질 우선. 단 비용이 있어 캐시로 흡수.

## 3. edge-tts — 음원을 어떻게 생성하나
edge-tts 역할: Microsoft Edge 브라우저의 온라인 TTS 서비스를 Python에서 API 키 없이 쓰는 무료 라이브러리. ElevenLabs의 비용 부담을 줄이는 폴백/보조 TTS.
동작 원리 (검증됨):
- Edge가 내부적으로 쓰는 클라우드 음성(neural voices)을 그대로 호출. Edge 브라우저나 Windows 설치 불필요, API 키 불필요.
- 내부적으로 Microsoft 음성 서비스에 WebSocket(WSS)으로 연결해 스트리밍 합성.
- 비동기(async) API라 배치 처리·웹 백엔드에 적합.
- 사용법: edge_tts.Communicate(text, voice, rate) → .save(output.mp3).
- 음성은 locale+voice명으로 선택(예: en-US-AndrewNeural). rate/volume/pitch 조절 가능 (예: --rate=-50% 느리게). 자막(SRT/VTT)도 같이 출력 가능.
트레이드오프: 무료·경량·빠름·고음질이지만, MS 서비스 의존이라 과도 사용 시 차단 위험. 그래서 메인은 ElevenLabs, edge-tts는 보조.

## 4. pydub — 언제 쓰이나
pydub 역할: 파이썬 오디오 처리 라이브러리(내부적으로 ffmpeg 사용). Voyage에서는 여러 음원을 하나로 합성·타이밍 조립할 때 쓴다.
구체적 용도:
- 볼륨 조절: 메인 대화·리듬 비트·배경음의 음량을 각각 다르게 (dB 단위). iOS WebView가 <audio>.volume을 무시하는 문제 때문에 볼륨을 파일 자체에 구워넣음(메인 -21dB, 비트 -28dB, ambient -43dB). 코드에선 volume=1.0이어도 파일 음량으로 밸런스가 맞음.
- 무음(silence) 삽입: 학습 단계별 대기 시간을 무음으로 넣음. 예: 떠올려 말하기 6초 대기 → 그만큼의 무음을 오디오에 삽입. (아래 7단계 참고)
- 믹싱/페이드/ducking: 배경음 위에 대화를 얹고, 페이드인/아웃 처리.
- 이어붙이기(concat): 여러 TTS 조각 + 무음 + 비트를 순서대로 합쳐 한 레슨 음원 완성.
즉 pydub은 음원 "합성·편집" 단계에서 쓴다(생성은 TTS, 편집은 pydub).

## 5. Whisper — 음성 인식 후 어떻게 평가하나 (채점 프로세스)
STT 단계 (stt_client.py):
1. 사용자가 마이크로 문장을 말함 → 녹음 파일이 백엔드로 전송.
2. 컨테이너 sniff: 파일 라벨(m4a 등)을 믿지 않고 매직바이트로 실제 포맷 감지. (안드로이드가 raw AAC를 m4a 라벨로 보내는 버그 대응)
3. Whisper 미지원 포맷이면 ffmpeg로 wav(16kHz mono) 변환.
4. OpenAI Whisper API로 음성 → 텍스트(전사, transcription).
채점 단계 (scoring.py) — 하이브리드 방식:
- 의미 유사도(코사인, 약 75%): 사용자 발화와 정답 문장을 각각 임베딩(벡터화)해 코사인 유사도 계산. 표현이 달라도 의미가 가까우면 높은 점수.
- 표면 매칭(약 25%): 단어·문자열 표면 일치도.
- 메타데이터 보정 (양방향):
  - references(패러프레이즈): 정답 + 등록된 모든 패러프레이즈와의 코사인 최댓값 사용 → 다르게 말해도 등록된 표현과 가까우면 구제(관대). "정답을 오답 처리"하는 실수 방지.
  - critical_keywords(핵심어): 핵심어가 전부 빠진 "구조만 비슷한 오답"에 점수 상한(cap) → 오답 차단(변별). "오답을 정답 처리"하는 실수 방지.
  - ★ 한쪽은 올리고(구제), 한쪽은 누른다(차단) = 양방향 보정이 설계 핵심.
- 안전장치: "틀린 메타보다 빈 메타가 안전." 확신 없는 references는 비움(빈 것도 채점 정상 작동, 구제만 없음). 부정확한 메타가 오히려 오채점을 유발하므로.
결과: 점수(0~100) + 피드백. 임베딩만으론 "세련된 정답"을 놓치거나 "구조 비슷한 오답"을 통과시키는데, 메타 보정으로 양쪽을 잡음.

## 6. 플레이어 — 음원 생성 & 암기 테스트 프로세스 (7단계)
음원 생성 (오프라인, audio_pipeline.py + generate_all.py):
- 레슨 대화문 → 화자별 ElevenLabs TTS → pydub로 단계별 무음·비트·볼륨 조립 → 하나의 음원 파일 + timeline.json 생성 → R2 업로드.
- timeline.json: { lesson_id, title, duration_sec, events[] }. 각 event는 { type, label, tab, time_ms }. 단계 구조가 음원에 이미 박혀 나옴.
7단계 학습 흐름 (음원 타이밍에 학습 설계가 박혀 있음):
1. 들어보기(intro): 전체 대화 편하게 듣기.
2. 따라 말하기(memorization): 듣고 따라 말함. 재생 속도 -10%(천천히), 대기 2.2초.
3. 리듬 느끼기(reflection): 배경 리듬 비트 위에서 문장 흐름 따라 말하기.
4. 떠올려 말하기(rehearsal, 인출): 한글 보고 영어 떠올려 말하기. 대기 6초 (능동적 회상 active recall 강제 — 학습 핵심이라 이 값 못 건드림).
5. 빠르게 듣기(speed): 속도 +20%로 빠른 영어에 귀 틔우기.
6. 바로 말하기(retrieval): 한글 나오면 즉시 영어. 대기 0.5초(반사적).
7. 최종 점검(final review): 발음 직접 채점 + 표현 복습.
★ 무음 길이가 학습 효과를 결정한다. 6초 인출 대기는 "스스로 떠올리게" 하는 장치. 학습 원리를 오디오 타이밍에 녹인 것.
암기 결과 테스트(발음 채점): 위 5번(Whisper+임베딩+메타) 프로세스. 사용자가 말하면 STT→채점→점수·피드백. "얼마나 정답에 가깝게 말했나"를 의미+표면+메타로 종합 판정.

## 7. JSON 구조 (콘텐츠 스키마)
레슨 하나 = 최상위 9필드(전부 필수, 필드명 변경 금지):
- id — 레슨 식별자. 접두어로 난이도 파생(E/S→A2, L→B1).
- theme — 카테고리 판별용 테마.
- ambient — 배경음 종류.
- situation_tags — 상황 태그(화이트리스트 11종).
- lesson_info — 제목·설명 등 메타.
- practice — 대화(dialogue) 배열. 화자(speaker)·영어·한글. PostgreSQL JSON 컬럼에 통째로.
- expressions — 핵심 표현(8필드 필수: 표현·뜻·when·pattern·pattern_examples 정확히 3개·dialogue_examples 2개 등). "응용" 패턴 학습.
- reaction — 리액션 학습(variations 5개·빈칸 1개).
- pronunciation — 발음 드릴(chunks 3개, 연음 포인트).
난이도별 변형: 구조는 동일, 개수만 다름. E·L=10턴(expr/pron/react 4/3/3), S=5~6턴(2/1/2). 고정 개수(pattern 3, dialogue 2, reaction variations 5, pron chunks 3)는 난이도 무관 동일 → 검증 로직 하나로 3난이도 커버.
검증(validate.py)이 스키마의 "정답"(SSOT):
- 필드 개수 체크, orphan 검사(참조 문장이 실제 대화에 존재하는가), 쌍둥이 검사(두 레슨 파생탭 md5 100% 동일이면 복붙으로 판단해 실패), 태그 화이트리스트 11종만 허용.
- level/category는 데이터에 안 넣고 id 접두어에서 파생 → 항상 일관(불일치 0행).
DB 저장 형태(운영): lessons 테이블 — id, level, category, title, practice(JSON), quality_score, quality_grade, quality_detail(JSON). level/category는 migrate가 접두어로 채움.

## 8. Python 주요 라이브러리 정리
- FastAPI: 웹 프레임워크(라우팅, async, 타입검증)
- SQLAlchemy: ORM(모델 정의, 쿼리). SQLite↔PG 무변경
- Pydantic: 요청/응답 스키마 타입 검증(FastAPI 내장)
- openai: Whisper STT + 임베딩(채점)
- elevenlabs: 고음질 TTS
- edge-tts: 무료 TTS(폴백)
- pydub: 오디오 믹싱·볼륨·무음·페이드 (ffmpeg 래핑)
- boto3 / S3 클라이언트: Cloudflare R2(S3 호환) 업로드
- psycopg2 / asyncpg: PostgreSQL 드라이버
- numpy: 임베딩 벡터 코사인 유사도 계산
- Pillow(PIL): 삽화 WebP 변환·리사이즈·blur(LQIP)
- python-jose / PyJWT: Supabase JWT 검증
- (외부 도구) ffmpeg: 오디오 포맷 변환(STT 전처리, pydub 백엔드)

## 9. Capacitor 동작 원리 (검증됨)
한 줄: Capacitor는 웹 앱을 WebView(네이티브 브라우저 컴포넌트)로 감싸고, 웹과 네이티브 사이에 브리지(bridge)를 주입해 서로 통신하게 하는 크로스플랫폼 런타임.
구조:
- WebView: iOS는 WKWebView, Android는 Chromium 기반 WebView. 웹 앱(HTML/CSS/JS)이 이 안에서 렌더링됨. 크롬(주소창 등) 없는 전체화면 브라우저.
- Native Bridge: WebView와 네이티브 코드 사이의 통신 계층. JS에서 window.Capacitor.Plugins로 네이티브 기능 호출 → 브리지가 JSON 메시지로 직렬화 → 네이티브(Swift/Java)가 파싱·실행 → 결과를 다시 JS로 반환. (비동기, JSON 인코딩 오버헤드 있음)
- 네이티브 프로젝트는 진짜 네이티브 앱: iOS는 Xcode 프로젝트, Android는 Gradle 프로젝트. 즉 필요하면 네이티브 코드를 직접 추가/수정 가능.
- 로컬 HTTP 서버: 웹 자산을 file://가 아니라 로컬 http://로 서빙(CORS 문제 회피).
빌드 흐름:
1. 웹 앱 빌드(vite build) → dist/ 생성
2. cap sync → 웹 자산을 네이티브 프로젝트로 복사 + 플러그인 반영
3. Xcode(iOS) / Android Studio(Gradle)로 네이티브 빌드 → .ipa / .aab
왜 Capacitor? 개인/소규모로 웹·iOS·Android를 하나의 코드베이스로. 네이티브 성능이 필수가 아니라 웹뷰로 충분한 앱에 적합. 단 웹뷰 한계 존재(아래 11번).

## 10. iOS/Android 빌드용 Capacitor 설정
- appId(번들 ID): org.voyageapp.app — iOS·Android 통일.
- 모바일 빌드 분기: --mode mobile로 빌드(.env.mobile). 웹용 API_BASE와 모바일용 분리.
- capacitor.config: appId, appName(Voyage), webDir(dist), 스플래시/상태바 설정 등.
- sync 흐름: npm run sync:android (= vite build + cap sync) → 네이티브 프로젝트에 반영.
- 안드로이드 서명: release keystore(alias voyage)로 .aab 서명. Play가 최종 서명.
- versionCode/versionName: build.gradle. versionCode는 Play 전체 유일·증가(현재 5), versionName은 사용자 노출 버전(1.0).
- iOS: Xcode에서 Team·Bundle ID 설정, Archive → App Store Connect 업로드.
- 안드로이드 12+ 스플래시: OS 강제 규격(단색 배경+중앙 원형 아이콘). values-v31/styles.xml + drawable/splash_icon.png(나침반) + colors.xml(splash_background).

## 11. 마이크 지원 & 네이티브 흉내 & 특별히 신경 쓴 점
마이크(녹음) 기능:
- Capacitor 플러그인 @independo/capacitor-voice-recorder로 마이크 녹음.
- iOS는 m4a, 안드로이드는 raw AAC(ADTS)로 녹음됨(플랫폼 차이). 이게 STT 버그의 원인이었음.
- 마이크 권한 거부 시 설정 화면으로 직접 이동하는 버튼 제공(capacitor-native-settings). → 사용자가 앱 안에서 바로 권한 설정 가능(네이티브 경험).
네이티브를 흉내내기 위해 애쓴 점:
- 볼륨을 파일에 구워넣기: iOS WebView가 <audio>.volume을 무시 → 코드로 볼륨 제어 불가. 그래서 pydub로 음원 자체 음량을 조절해 밸런스. "제어권 없으면 데이터 쪽으로 옮긴다."
- 오디오 상태 전환 방어(race condition): 3개 독립 오디오 ref(메인/비트/배경음)를 별도 볼륨·재생 제어. 탭 이동 시 정지/재개를 위해 — 마운트 시 볼륨 0 초기화, 리듬 진입 시 500ms 가드(빠르게 지나가는 단계에서 비트 깜빡임 방지), 이탈 시 페이드아웃→pause→currentTime=0, 페이드 타이머 중복 방지. → 네이티브 앱처럼 끊김 없는 오디오 경험.
- 스플래시/아이콘을 iOS·Android 각각 OS 규격에 맞춰 정성껏(브랜드 일관성).
- 로그인 없이 체험: 진입장벽 낮추려 로그인 전 무료 체험 제공.
특별히 신경 쓴 점 요약:
- 학습 원리(능동적 회상 6초 대기 등)를 오디오 타이밍에 물리적으로 구현.
- AI 대량 생성 콘텐츠의 품질 게이트("장면이 보이는 문장만 통과").
- 플랫폼별 함정(iOS 볼륨, 안드로이드 STT 포맷)을 데이터/바이트 레벨에서 해결.
- 채점의 양방향 메타 보정(구제 + 차단)으로 정확도 확보.

## 12. 오디오 탭 이동 제어 (요청 항목 상세)
플레이어에서 음원·비트 재생 중 표현/응용/발음 탭으로 이동할 때의 정지·재개 컨트롤:
문제: 메인 대화 음성 위에 리듬 비트를 얹어 재생 중, 사용자가 다른 탭으로 이동하면 어떤 소리는 멈춰야 하고(비트), 어떤 건 이어져야 하며, 돌아오면 재개돼야 함. 오디오는 비동기라 전환이 빠르면 소리가 겹치거나 깜빡이거나 끊김(race condition).
해결 — 3개 독립 오디오 ref:
- audioRef: 메인 대화 음성(서버 캐시에서 서빙).
- bgAudioRef: 리듬 비트(reflection_bg.wav). "리듬 느끼기" 단계 전용.
- ambientAudioRef: 테마 배경음(ambient/*.mp3) + ambientTimerRef(페이드 타이머, 중복 방지).
- → 셋을 별도 볼륨·재생으로 제어 → 겹쳐 재생하거나 일부만 멈춤 가능.
전환 방어 코드:
- 마운트 시 bg/ambient 볼륨 0으로 초기화 → 갑작스런 큰 소리 방지.
- 리듬(reflection) 진입 시: 비트 켜되 500ms 가드(진입 후 500ms 뒤에도 여전히 리듬 단계여야 재생 → 빠르게 지나가는 단계에서 비트 깜빡임 방지) + 볼륨 페이드인.
- 리듬 이탈/탭 이동 시: 비트 페이드아웃 → pause + currentTime=0.
- 페이드 타이머 중복 실행 방지(ref로 관리).
★ 교훈: 오디오 상태 전환은 선언적으로 짜기 어렵다. 타이밍 가드와 cleanup을 명시적으로 넣어야 "의도치 않은 소리/끊김"을 막을 수 있다.
미해결(정직하게): 모바일 웹뷰에서 리듬 단계 즉시 진입 시 비트가 잠깐 들리다 끊기는 이슈. 추정 원인: WebView 오디오 디코드 지연 + 진입 즉시 play 경합. 아직 완전 해결 못 함.

## 핵심 요약 (한 문단)
FastAPI+SQLAlchemy 백엔드에서 ElevenLabs(고음질)/edge-tts(무료폴백)로 대화 음원을 합성하고 pydub로 볼륨·무음·비트를 조립해 timeline.json과 함께 R2에 저장. 플레이어는 그 타임라인을 따라 3개 독립 오디오 ref를 경합 방어하며 7단계 학습(6초 인출 대기 등 학습원리를 타이밍에 구현)을 재생. 발음 채점은 Whisper 전사 → 임베딩 코사인 유사도 + 표면 매칭 + references(구제)/keywords(차단) 양방향 메타 보정. 콘텐츠는 9필드 고정 JSON 스키마를 validate.py로 강제(SSOT). 프론트는 React+Vite를 Capacitor로 감싸 웹/iOS/Android 단일 코드베이스(WebView+네이티브 브리지)로 배포.
