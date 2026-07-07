# [문서35] 프로젝트: 건설 감리 시스템 — SQL 실전 범위
> 정부 건설 감리·결재 백엔드(Flask + 생 SQL). ORM 없이 직접 SQL 작성.
> 규모: SQL 파일만 12,000줄+, SELECT 1,340개, 모듈 20+개.
> ★ "얼마나 복잡한 쿼리를 다뤄봤나"를 실제 코드 예시로. 핵심: 복잡한 걸 자랑이 아니라 "다뤄봤고 정리할 줄 안다"로.

---

## 핵심 한 줄
"ORM 없이 생 SQL로 건설 감리 시스템 백엔드를 구현. 다중 LEFT OUTER JOIN, 스칼라/IN/상관 서브쿼리, UNION ALL, GROUP BY 집계, GROUP_CONCAT, COALESCE, 권한(RBAC)에 따라 서브쿼리가 바뀌는 동적 쿼리까지 실무에서 작성·디버깅했다. 파라미터 바인딩(%s)으로 인젝션을 막았다."

## 1. 아키텍처 — 3층 분리 (생 SQL 방식)
각 모듈이 3파일로:
- api*.py: Flask-RESTX 라우팅(엔드포인트).
- serv*.py: 비즈니스 로직 + 권한별 쿼리 조립 + 로깅.
- sql*.py: SQL 문자열 상수 + 쿼리 반환 메서드.
- dbManage.py: 커넥션 관리 + execute(query, params) + commit/rollback.
★ ORM 없이도 "SQL(sql)·로직(serv)·라우팅(api)"을 계층 분리. 생 SQL이라도 관심사 분리는 지킴.

## 2. 다뤄본 쿼리 범위 (실측 카운트)
- LEFT OUTER JOIN 71개, LEFT JOIN 6개
- IN (SELECT ...) 서브쿼리 43개
- COUNT 25개, MAX 13, SUM 3, MIN 1, COALESCE 2
- GROUP BY 7개, DISTINCT 40개
- LIMIT(페이지네이션) 48개
- 총 SELECT 1,340개
★ 면접에서: "단순 CRUD가 아니라 다중 조인·서브쿼리·집계·UNION을 실무에서 다뤘다"를 숫자로.

## 3. 대표 쿼리 A — 결재 문서 목록 (다중 조인+서브쿼리+UNION ALL)
여러 종류 문서(시공완료 요청, 감리 검사 보고 등)를 한 목록으로 합침:
```sql
SELECT COMPLETEPART_CONSTRUCTION_SYS_DOC_NUM AS sys_doc_num,
       DM1.PC_DATE AS complete_date,
       (SELECT USER_NAME FROM USER WHERE ID = DM1.WRITER) AS writer,          -- 스칼라 서브쿼리
       (SELECT GROUP_CONCAT(ID) FROM approval_information                     -- 수신자 목록 합치기
          WHERE APPROVAL_TYPE != 'AT000000' AND CONS_CODE = %s
            AND DOC_CODE = 'CD000001' AND SYS_DOC_NUM = DM1.SYS_DOC_NUM) AS receiver,
       (SELECT SUBCODE_NAME FROM SUBCODE_MANAGE WHERE FULLCODE = DM1.STATE_CODE) AS state_nm
FROM test_completepart_construction_request TCCR
     LEFT OUTER JOIN DOC_MANAGE DM1 ON TCCR.COMPLETEPART_CONSTRUCTION_SYS_DOC_NUM = DM1.SYS_DOC_NUM
     LEFT OUTER JOIN APPROVAL_INFORMATION AI ON TCCR....SYS_DOC_NUM = AI.SYS_DOC_NUM
WHERE 1=1 AND TCCR.CONS_CODE = %s
  AND TCCR....SYS_DOC_NUM IN (SELECT DISTINCT SYS_DOC_NUM FROM APPROVAL_INFORMATION  -- IN 서브쿼리
                              WHERE CONS_CODE = %s AND DOC_CODE = 'CD000001')
UNION ALL                                                                       -- 다른 문서 종류를 이어붙임
SELECT SUPERV_SYS_DOC_NUM AS sys_doc_num, ... FROM test_supervisor_inspection_report TSIR ...
```
여기서 다룬 기법:
- 다중 LEFT OUTER JOIN(문서-결재정보-작성자)
- 스칼라 서브쿼리(코드→이름 변환, 작성자 이름 조회)
- GROUP_CONCAT(여러 수신자 ID를 한 컬럼에)
- IN 서브쿼리(결재 정보 있는 문서만 필터)
- UNION ALL(문서 종류가 다른 결과를 하나의 목록으로)
★ 경험 서술: "여러 문서 유형을 하나의 결재함으로 보여줘야 해서, 각 유형을 조인·서브쿼리로 만든 뒤 UNION ALL로 합쳤다. 코드값은 스칼라 서브쿼리로 이름으로 변환했다."

## 4. 대표 쿼리 B — 프로젝트 현황 통계 (집계+외부조인+카티전)
상태×주거분류의 모든 조합에 프로젝트 수를 매핑(0건도 표시):
```sql
SELECT C.PROJ_STATUS_CD, C.PROJ_STATUS_NM, C.RESIDE_CLASS_CD, C.RESIDE_CLASS_NM,
       COALESCE(D.CNT, 0) AS cnt                              -- 없으면 0
FROM (
   SELECT A.FULLCODE ..., B.FULLCODE ...
   FROM (SELECT FULLCODE,SUBCODE_NAME FROM SUBCODE_MANAGE WHERE CODE='ST00' ...) A,   -- 카티전 곱
        (SELECT FULLCODE,SUBCODE_NAME FROM SUBCODE_MANAGE WHERE CODE='SD01' ...) B    -- (모든 조합 생성)
) C
LEFT OUTER JOIN (
   SELECT COUNT(*) AS CNT, PROJECT_STATUS, RESIDE_CLASS_CODE                          -- 집계
   FROM PROJECT WHERE CONS_CODE IN (SELECT CONS_CODE FROM JOIN_WORKFORCE WHERE ID=%s)
   GROUP BY PROJECT_STATUS, RESIDE_CLASS_CODE
) D ON C.PROJ_STATUS_CD = D.PROJECT_STATUS AND C.RESIDE_CLASS_CD = D.RESIDE_CLASS_CODE
```
여기서 다룬 기법:
- 카티전 곱(A,B)으로 "모든 상태×분류 조합" 먼저 생성 → 데이터 없는 조합도 0으로 표시(통계표의 빈칸 채우기).
- 집계 서브쿼리(COUNT+GROUP BY)를 LEFT OUTER JOIN으로 붙임.
- COALESCE로 NULL→0.
★ 경험 서술: "통계표에서 '건수 0인 항목도 행으로 나와야' 해서, 먼저 모든 조합을 카티전 곱으로 만들고 실제 집계를 LEFT OUTER JOIN해서 COALESCE로 0을 채웠다. 그냥 GROUP BY만 하면 0건 행이 사라지는 문제를 이렇게 풀었다."

## 5. 대표 패턴 C — 권한(RBAC)별 동적 쿼리
로그인 유저의 권한 코드에 따라 데이터 범위(서브쿼리)를 바꿈:
```python
if authority in ('AU000005','AU000008','AU000002'):   # 개인 단위
    sub_query = CONDITIONS_ID           # WHERE ID = %s
    values.append(user['id'])
elif authority in ('AU000006','AU000007'):            # 감리사 단위
    sub_query = CONDITIONS_PROJECT      # WHERE SUPERV_CO_CODE = %s
    values.append(user['co_code'])
else:                                                 # 회사 단위
    sub_query = CONDITIONS_CO_CODE      # WHERE CO_CODE = %s
    values.append(user['co_code'])
query = BASE_QUERY.format(sub_query)
```
★ 핵심: 같은 화면이라도 권한에 따라 "내 것만 / 우리 회사 것 / 담당 프로젝트 것"으로 데이터 범위가 달라짐 → 서브쿼리를 조립해 해결. (도메인편의 RBAC가 SQL 레벨에서 구현된 실제 사례)
경험 서술: "감리사·건설사·관리자가 같은 목록을 봐도 보이는 범위가 달라야 해서, 권한 코드로 WHERE 서브쿼리를 갈아끼우는 방식으로 처리했다."

## 6. 보안 — 파라미터 바인딩
- dbManage.execute(query, params): csor.execute(query, params)로 %s 바인딩.
- ★ 사용자 입력은 문자열 포매팅이 아니라 %s 파라미터로 → SQL 인젝션 방지.
- format()으로 조립하는 건 서브쿼리 "구조"(하드코딩된 조건문)뿐, 값은 항상 params.

## 7. 이 프로젝트의 정직한 평가 (면접에서)
"더러운 코드"임을 인지하고 개선점을 말할 수 있는 게 오히려 강점:
- SQL이 문자열 상수로 흩어져 있고 매우 긺(감리 2,914줄) → 유지보수 어려움.
- WHERE 1=1 패턴(동적 조건 조립 편의용)은 흔하지만 지저분.
- 개선 방향: 쿼리 빌더/ORM 도입, 반복되는 코드→이름 변환 서브쿼리를 조인이나 뷰로, 긴 UNION을 정리.
★ "복잡한 걸 다뤄봤다"보다 "다뤄봤고, 무엇이 문제인지 알고, 어떻게 개선할지 안다"가 진짜 실력. (DB 실전편 "복잡한 걸 단순하게 만들 줄 안다"와 연결)

## 다뤄본 SQL 범위 체크리스트 (이 프로젝트 근거)
- [O] 다중 조인(LEFT OUTER JOIN 여러 개 체이닝)
- [O] 스칼라 서브쿼리(SELECT절 안의 SELECT — 코드→이름 변환)
- [O] IN 서브쿼리(WHERE ... IN (SELECT ...))
- [O] 상관 서브쿼리(외부 행 참조)
- [O] UNION ALL(이질적 결과 합치기)
- [O] 집계(COUNT/SUM/MAX/MIN + GROUP BY)
- [O] COALESCE(NULL 처리)
- [O] GROUP_CONCAT(다중 값 한 컬럼으로)
- [O] 카티전 곱(모든 조합 생성 후 외부조인 — 통계 빈칸 채우기)
- [O] 권한별 동적 쿼리(서브쿼리 조립)
- [O] 페이지네이션(LIMIT)
- [O] 파라미터 바인딩(인젝션 방지)

## 핵심 요약
Flask+생 SQL 감리 시스템. 다중 조인·서브쿼리(스칼라/IN/상관)·UNION ALL·집계·GROUP_CONCAT·카티전 곱+외부조인(통계 빈칸)·권한별 동적 쿼리를 실무 작성. 파라미터 바인딩으로 인젝션 방지. "복잡한 쿼리를 다뤄봤고, 코드가 지저분한 것도 인지하며 개선 방향(빌더/뷰/정리)을 말할 수 있다"가 면접 포인트.
