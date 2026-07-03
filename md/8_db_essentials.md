# [문서8] DB 완전 기초 — 모르면 안 되는 상식
> 강의에서 당연시하고 넘어간 기본기. 이거 틀리면 치명적.

---

## SQL 분류
- DDL(정의): CREATE, ALTER, DROP, TRUNCATE — 구조 정의
- DML(조작): SELECT, INSERT, UPDATE, DELETE — 데이터 조작
- DCL(제어): GRANT, REVOKE — 권한
- TCL(트랜잭션): COMMIT, ROLLBACK, SAVEPOINT
- ★ TRUNCATE vs DELETE: TRUNCATE는 DDL(전체 삭제, 롤백 어려움, 빠름, auto_increment 리셋), DELETE는 DML(조건 가능, 롤백 가능, 느림).

## SELECT 실행(논리) 순서
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
- ★ WHERE는 그룹화 전 필터, HAVING은 그룹화 후 필터. 그래서 집계함수 조건은 HAVING.
- 별칭(SELECT의 alias)은 WHERE에서 못 씀(SELECT가 나중), ORDER BY에선 가능.

## JOIN 종류
- INNER JOIN: 양쪽 다 매칭되는 것만
- LEFT/RIGHT OUTER: 한쪽 전부 + 매칭(없으면 NULL)
- FULL OUTER: 양쪽 전부
- CROSS JOIN: 곱집합(모든 조합)
- SELF JOIN: 자기 자신과(계층/비교)

## 제약조건(Constraint)
- PRIMARY KEY: 유일+NOT NULL, 행 식별
- FOREIGN KEY: 다른 테이블 참조, 참조 무결성
- UNIQUE: 중복 금지(NULL은 허용)
- NOT NULL: 빈 값 금지
- CHECK: 값 조건(age >= 0)
- DEFAULT: 기본값

## NULL 처리
- NULL = 알 수 없음. NULL과의 비교는 = 아니라 IS NULL / IS NOT NULL.
- NULL은 집계에서 제외(COUNT(col)은 NULL 제외, COUNT(*)는 포함).
- COALESCE(a, b): a가 NULL이면 b. IFNULL/NVL도 유사.

## 집계 & 그룹
- COUNT/SUM/AVG/MAX/MIN
- GROUP BY로 그룹핑, HAVING으로 그룹 필터
- DISTINCT: 중복 제거

## 트랜잭션 명령
- BEGIN/START TRANSACTION → COMMIT(확정)/ROLLBACK(취소)
- SAVEPOINT: 부분 롤백 지점
- 자동 커밋(autocommit): 기본 ON이면 문장마다 커밋. 명시적 트랜잭션은 OFF/BEGIN.

## 서브쿼리 & 조인
- 서브쿼리: 쿼리 안의 쿼리. WHERE/FROM/SELECT절에.
- 상관 서브쿼리: 외부 쿼리 값 참조(행마다 실행, 느릴 수 있음).
- 대개 JOIN이 서브쿼리보다 옵티마이저에 유리한 경우 많음.

## 뷰(View) & 인덱스 기본
- 뷰: 저장된 쿼리(가상 테이블). 복잡 쿼리 재사용·보안(컬럼 제한). 물리 저장 X(머티리얼라이즈드 뷰는 저장).
- 인덱스 생성: CREATE INDEX idx ON t(col). UNIQUE INDEX는 중복 방지 겸용.

## RDB vs NoSQL
- RDB: 정해진 스키마, ACID, 조인. 정합성 중요한 것(금융, 주문).
- NoSQL: 유연 스키마, 수평 확장, 빠름. 문서(MongoDB)/키-값(Redis)/컬럼(Cassandra)/그래프.
- 선택: 정합성·복잡 관계=RDB, 대용량·유연·확장=NoSQL. 섞어 씀.

## 기본 용어
- 스키마: DB 구조 정의(테이블·관계·제약). / 인스턴스: 특정 시점 실제 데이터.
- 튜플(행)/애트리뷰트(컬럼)/도메인(값 범위).
- 카디널리티: 컬럼 값의 고유 종류 수(높으면 인덱스 효과 좋음).
