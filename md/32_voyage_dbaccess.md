# [문서32] 프로젝트 Voyage — ORM & 생 SQL (DB 접근 전략)
> 문서31의 "왜 ORM?" 질문에 대한 실제 코드 기반 답변.
> 핵심 서사: ORM이 기본, 생 SQL은 명확히 두 경우(DDL·헬스체크)에만. 경계가 일관된 게 강점.

---

## 핵심 한 줄
"애플리케이션의 모든 CRUD·조회·집계는 SQLAlchemy ORM으로, 생 SQL은 ORM이 다루기 힘든 DDL(ALTER TABLE 컬럼 추가)과 연결 헬스체크(SELECT 1)에만 국소적으로 썼다. '데이터는 ORM, 스키마 변경은 생 SQL'이라는 경계가 코드 전체에서 일관된다."

## 1. 왜 ORM을 기본으로?
- 로컬 SQLite↔운영 PostgreSQL 무변경 전환. 같은 모델(models_db.py)로 개발은 SQLite, 배포는 PG. 방언 차이를 ORM이 흡수 → 코드 한 벌로 두 DB.
- 관계는 relationship(back_populates)으로 선언 → 명시적 .join() 없이 FK 기반 조인을 ORM 관계에 위임. lazy-load로 필요 시 로드.
- 타입 안전·가독성. db.query(User).filter(User.id == uid).first()가 SQL 문자열보다 명확.

ORM 대표 3패턴(실제 코드):
- 단순 조회(main.py:790): db.query(User).filter(User.id == user_id).first() — PK 단건, 없으면 None. 가장 흔함.
- 복합 필터+정렬(main.py:303): user_id+날짜 범위(>=, <)를 복합 필터 → .order_by(started_at.asc()).all() 체인. 집계도 ORM .count()(main.py:1006).
- 쓰기(main.py:1291): ScheduleEntry(...) → db.add → db.commit → db.refresh(autoincrement id 회수). 쓰기 전 ORM으로 중복 확인까지.

## 2. 생 SQL은 정확히 두 경우만
(a) 연결 헬스체크 — db.py:45
  with eng.connect() as conn: conn.execute(text("SELECT 1"))
Railway(메인)→Neon(폴백) 폴백 로직에서 "이 DB URL이 살아있나" 판정용 최소 쿼리. ORM 모델과 무관한 순수 커넥션 테스트라 text()가 자연스러움.

(b) 런타임 스키마 마이그레이션(DDL) — init_db.py / migrate_content.py
  stmts = ["ALTER TABLE users ADD COLUMN avatar VARCHAR(40)", ...]
  if is_pg: stmts = [s.replace("ADD COLUMN", "ADD COLUMN IF NOT EXISTS") for s in stmts]
  for s in stmts: try: conn.execute(text(s)); conn.commit() except: conn.rollback()  # SQLite: 이미 있으면 무시
★ 왜 생 SQL? Base.metadata.create_all()은 없는 테이블만 만들고 기존 테이블에 새 컬럼은 안 붙인다. Alembic 도입하기엔 규모가 작아 가볍게 DDL 직접 실행. PG는 IF NOT EXISTS, SQLite는 예외 무시로 방언 차이까지 흡수. lessons 테이블의 코칭·삽화 컬럼 사후 추가(migrate_content.py:88)도 같은 구조·이유.

## 3. 혼용 지점 — 한 흐름에서 역할 분담
migrate_content.py가 대표적. 같은 마이그레이션 실행 안에서:
1. 생 SQL(DDL): ensure_columns()가 ALTER TABLE ADD COLUMN — 스키마 보강
2. ORM(DML): upsert 루프 — db.query(Lesson).filter(...).first()로 조회, 있으면 setattr 업데이트 / 없으면 db.add, --reset이면 db.query(Lesson).delete()
3. ORM 검증: db.query(Lesson).count()로 건수 확인
→ 컬럼 존재 보장(생 SQL) → 행 upsert(ORM) → 건수 카운트(ORM) 순. DDL만 생 SQL, 데이터·검증은 ORM이라는 경계가 한 파일 안에서도 지켜짐.
init_db.py도 유사: create_all()(ORM 메타)+ensure_user_columns()의 ALTER(생 SQL) 연달아 호출.

## 4. 정합성 검증은 어떻게?
- DB 레벨: 생 SQL COUNT 비교는 없음. ORM .count()로 대체(migrate_content.py:225 등).
- 콘텐츠 레벨: DB가 아니라 파일/모델 단계에서 파이썬 assert로 검증(예: assert len(LESSONS)==108, 삽화 업로드 시 중복/누락 ID 검사). SQL 정합성이 아니라 파이프라인 입력 검증.
- 결론: "생 SQL 정합성 쿼리"는 없음. 정합성 = ORM .count() + 파이썬 assert.

## 5. 예상 질문 대비
- "왜 전부 ORM 안 쓰고 생 SQL을 섞었나?" → ORM은 기존 테이블에 컬럼 추가(ALTER)를 안 해준다. Alembic은 규모 대비 과해서 DDL만 생 SQL로 가볍게. 데이터 조작은 전부 ORM.
- "왜 Alembic을 안 썼나?" → 개인/소규모라 컬럼 몇 개 추가에 Alembic은 오버. IF NOT EXISTS+예외 무시로 멱등하게. 규모 커지면 Alembic 전환이 맞다(트레이드오프 인지).
- "조인은?" → 명시적 .join() 대신 relationship(back_populates)으로 선언, 필요 시 lazy-load.
- "생 SQL 인젝션 위험은?" → 생 SQL은 전부 하드코딩된 DDL 문자열(사용자 입력 안 들어감). 사용자 입력 닿는 경로는 100% ORM이라 파라미터 바인딩으로 안전.

## 핵심 요약
ORM 기본 / 생 SQL은 DDL·헬스체크 한정. 경계가 일관됨. 관계는 relationship에 위임, 정합성은 ORM count+assert. SQLite↔PG 무변경이 ORM 채택의 실질 이유, DDL 한계가 생 SQL의 이유.
