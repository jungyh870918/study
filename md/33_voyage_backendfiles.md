# [문서33] 프로젝트 Voyage — 백엔드 파일 역할 분류
> 문서31의 파일 구성을 실제 코드로 검증·분류. 전체 37개 .py / 55,730줄.
> ★ 문서31과 다른 발견: 미참조 레거시 5개, content.py가 전체의 88%(데이터).

---

## 핵심 한 줄
"FastAPI 라우트를 가진 파일은 main.py 단 하나. 나머지는 라이브러리 모듈 아니면 오프라인 스크립트. 런타임 표면적은 작고(main+조회/채점/음원/STT+core), 코드의 88%(content.py 49k줄)는 '로직'이 아니라 콘텐츠 데이터. batches→content.py→migrate→DB→content_db 단방향 흐름."

## A. 콘텐츠 생성 / 데이터 파이프라인 (오프라인)
- services/content.py (49,042줄): 콘텐츠 원본 데이터 배열(대사·표현·발음·리액션). 런타임 미로드, migrate 소스.
- migrate_content.py (235): content.py→lessons 테이블 upsert(ALTER 생SQL+ORM add/update).
- generate_all.py (241): 음원 배치 자동생성(TTS→믹싱→timeline).
- push_quality_scores.py (71): 채점 결과(json)를 DB 반영.
- rebuild_reaction/fix_pronunciation/fix_reaction (346/84/85): E시리즈 포맷 변환·재구성.
- upload_existing_audio/upload_illustrations (160/121): 음원·삽화 R2 일괄 업로드.
- generate_card_webp (94): 삽화 WebP 변형+LQIP blur 생성.
- regen_illustrations_32/regen_swap/crop_replace (104/104/107): 삽화 재생성·crop·R2 교체.
- insert_sample_records (121): 학습 달력 테스트용 샘플 DB 삽입.
★ content.py 49,042줄 = 전체 코드의 88%. 면접에서 반드시 "이건 로직이 아니라 데이터"라고 명확히. "코드 5.5만 줄"이 아니라 "데이터 소스가 대부분, 실제 로직은 작다."

## B. 런타임 — 라우팅 + 비즈니스 로직
- app/main.py (1,676): 유일한 FastAPI 앱. 47개 엔드포인트(음원 서빙, 레슨 조회, 채점 /api/score, STT, 유저 동기화, 통계/스트릭, 북마크/플레이리스트/스케줄/메모/노트/프로필).
- api.py (3): from app.main import app — 배포 진입점(ASGI).
- services/content_db.py (103): 런타임 콘텐츠 조회 계층. lessons 테이블→dict. main.py가 content.py 대신 이걸 씀.
- services/scoring.py (235): 발화 채점(표면유사도+코사인+키워드 cap). STT 벤더와 분리.
- services/audio_pipeline.py (655): 7단계 학습 음원 파이프라인(화자 보이스 매핑, timeline 빌드).
- services/share_page.py (288): /s/{lesson_id} 공유 페이지 HTML 렌더.

### ⚠️ 미참조 레거시 (코드 확인됨 — 정직하게 말할 카드)
- services/session_builder.py (71): 어디서도 import 안 됨 → 초기 Dialogue 설계 잔재.
- services/pm6r_builder.py (256): 미참조 → audio_pipeline으로 대체된 듯.
- services/db_service.py (86): 미참조 → 초기 Dialogue 모델용 레거시.

## C. 외부 연동 / 인프라 (core)
- core/tts_service.py (228): ElevenLabs TTS 래퍼+캐시.
- core/r2_storage.py (115): Cloudflare R2(S3호환) 업로드/URL/존재확인.
- services/stt_client.py (137): OpenAI Whisper STT+임베딩(컨테이너 sniff, ffmpeg wav 변환).
- app/db.py (79): DB 엔진 — Railway PG 주/Neon 폴백/SQLite 로컬.
- app/models_db.py (202): SQLAlchemy 모델 14종.
- app/init_db.py (43): create_all+ALTER 컬럼 보강.
- core/models.py (110): dataclass/Enum 도메인 타입.
- core/cache.py (2): TTSService 재-export shim.
★ 벤더 격리: tts_service/r2_storage/stt_client가 외부 API를 각각 얇은 래퍼로 분리. "벤더 교체 시 이 파일만 갈아끼운다"는 설계. scoring도 STT 벤더와 분리.

## D. 유틸 (보조 — 현 런타임 연결 불명확)
- core/chunker.py (95): 문장→청크 분할. 레거시 빌더만 사용.
- core/templates.py (108): 학습 스텝 템플릿. 참조처 없음 → 레거시.
- utils/mixer.py (32): TTS+BGM 믹싱(pydub). import 안 됨 → 오프라인/잔재.

## E. 오프라인 스크립트 / 테스트
- test_scoring.py (67): 채점 곡선 검증(실 임베딩으로 점수 분포).
- test_meta_regression.py (115): 메타 채점 회귀 테스트(메타 ON/OFF 비교).
- _check_step2.py (102): 콘텐츠 검증(레슨 108개, practice 키, assert). content.py 직접 로드하는 유일한 곳.

## 면접 포인트 (이 분류에서 나오는 이야기)
1. 런타임 표면적은 작다. 실제 서버가 도는 코드는 main.py+content_db/scoring/audio_pipeline/share_page/stt_client+core(tts/r2/db/models). content.py(49k)는 데이터 소스. → "코드량"이 아니라 "런타임에 실제 도는 것"으로 규모를 말하는 게 정확.
2. 벤더 격리 설계. 외부 API(TTS/STT/R2)를 각각 얇은 래퍼로. 교체 시 그 파일만.
3. 데이터 흐름 단방향. batches/*.json→content.py→migrate→DB→content_db(런타임 조회). DB 직접 수정 안 함(SSOT). 문서30·31의 원칙과 코드가 일치.
4. 레거시 잔재를 정직하게. pm6r_builder·session_builder·db_service·templates·mixer는 현 런타임 미참조. 초기 "PM6R/Dialogue" 설계가 현재 audio_pipeline+lessons 테이블로 전환된 흔적. → 물으면 "구조 전환의 흔적, 정리 대상으로 인지하고 있다"로 답하는 게 오히려 신뢰(모르는 척하거나 "다 쓴다"고 하면 역효과).

## 핵심 요약
main.py 단일 FastAPI(47라우트). content.py는 88%가 데이터. 런타임=조회/채점/음원/STT+core. 외부 API는 얇은 래퍼로 벤더 격리. 흐름은 batch→content→migrate→DB→content_db 단방향. 미참조 레거시 5개는 PM6R/Dialogue 초기 설계의 잔재로 인지 중.
