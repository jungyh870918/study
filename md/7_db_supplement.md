# [문서7] DB 부가 설명 — 난이도 있는 개념 보충
> 문서6에서 한 번 더 파고들 가치가 있는 것들.

---

## ① 인덱스 손익분기점 (풀스캔이 나은 경우)
- 세컨더리 인덱스 조회 = 행마다 랜덤 I/O(디스크 여기저기). 풀스캔 = 순차 I/O(처음부터 쭉, 효율적).
- 읽을 행이 많아지면 랜덤 I/O 수십만 번 < 순차로 다 읽기 → 풀스캔 승.
- 경험칙: 전체의 5~20%(≈10%) 넘게 읽으면 풀스캔 유리. 단 행 크기/클러스터링/SSD로 변동.
- 옵티마이저가 selectivity 추정해 자동 판단. force index가 독이 될 수 있음.

## ② 통계 갱신의 양날 (plan regression)
- 통계 갱신 → 계획 재작성 → 잘 돌던 쿼리가 더 느린 계획으로 바뀔 수 있음(퇴행).
- ANALYZE 자체가 대형 테이블에선 부하 → 바쁜 시간엔 마비 위험.
- 대응: 한가한 시간+샘플링+계획 검증+중요 쿼리는 계획 고정.

## ③ WAL & LSN — 커밋 넘버링으로 순차 저장 보장
정의: 모든 변경(로그 레코드)에 단조 증가하는 순번 LSN(Log Sequence Number) 부여 = 절대 순서.
왜 순번이 필요:
- 순서 보장: 크래시 복구 시 WAL을 LSN 순서로 재생(replay) → 바뀐 순서 그대로 복구. 순번 없으면 선후 불명 → 복구 불가.
- WAL 원칙: "데이터 페이지를 디스크에 쓰기 전에 그 변경 로그(해당 LSN까지)가 먼저 디스크에." 각 페이지는 자신을 마지막 바꾼 LSN을 기록 → 복구 시 "이 페이지는 LSN 100까지 반영" 알고 그 지점부터 재생.
- 커밋 확정(Durability): 커밋 로그 레코드(특정 LSN)가 디스크에 안전히 기록될 때까지 기다린 뒤 "커밋 완료" 응답. 이후 죽어도 재시작 시 그 LSN까지 재생해 되살림.
복구 흐름:
1. 크래시 → 재시작
2. 마지막 체크포인트 LSN부터 WAL 읽기
3. Redo: 커밋된 변경을 LSN 순서로 재적용
4. Undo: 커밋 안 된(진행 중) 트랜잭션 롤백
복제 연결: LSN으로 replication lag 측정(마스터 5000, replica 4800 → 200 뒤처짐). PG=LSN, MySQL=GTID/binlog position.
한문장: "모든 변경에 단조 증가 LSN을 매겨 절대 순서를 만들고, 데이터보다 로그를 먼저 써(WAL) 커밋 로그가 기록돼야 커밋 확정. 복구는 LSN 순서로 redo/undo, 복제 지연도 LSN 차이로 측정."

## ④ SCN vs RBA (checkpoint의 두 좌표)
- SCN(System Change Number): 논리적 시점(시간축 같은 순번). "언제"의 기준.
- RBA(Redo Byte Address): redo 로그 안의 물리적 위치. "어디서부터 읽을지"의 주소.
- checkpoint는 이 둘을 control file header + 각 datafile header에 기록 → startup/recovery 때 전체·개별 상태를 비교 판단.
- checkpoint의 의미: "redo가 어디까지 발생했나"가 아니라 "datafile이 redo의 어느 시점까지 따라왔나". 복구 시작점을 앞당겨 recovery 시간 단축.

## ⑤ Instance Recovery (roll forward → roll back)
- 장애 시 메모리는 날아가고 redo 파일만 디스크에 남음.
- Roll Forward: 마지막 checkpoint 이후 redo를 재적용(발생한 사실 전체 재생).
- Roll Back: 그중 commit 안 된 트랜잭션만 undo로 제거.
- 순서 핵심: "일단 다 재생하고, 나중에 완료 안 된 것만 되돌린다." SMON이 수행.

## ⑥ Hard Parsing & Bind Variable (Shared Pool 보호)
- Hard Parse: SQL 새로 분석+문법검사+오브젝트 조회+실행계획 생성. CPU 많이 씀.
- 문제: 값만 다른 SQL(WHERE id=1, id=2...)을 Oracle이 다른 SQL로 인식 → 매번 hard parse.
- Bind Variable: 값을 변수로(WHERE id=:id) → SQL 구조 동일 → 실행계획 재사용 → hard parse↓.
- 핵심: 하드파싱 많으면 CPU 소모+Shared Pool 오염. 바인드 변수는 Shared Pool 보호의 기본 습관.

## ⑦ PGA 폭증 (batch/parallel 위험)
- PGA는 프로세스 전용이라 프로세스 수·작업 크기에 비례해 선형 증가(공유 아님).
- 배치: full scan/대량 sort/hash join → 쿼리 하나가 큰 workarea 요구.
- 병렬: parallel 8 → worker 8개 → PGA 8배. 동시 배치까지 겹치면 수십 GB → OS 압박·swap.
- 위험 조합: Batch + Parallel + 바인드 변수 없음 → PGA 폭증+CPU 폭증+Shared Pool 오염 동시.
- 통제: pga_aggregate_target/limit로 상한. sort가 넘치면 TEMP로 spill.

## ⑧ OLTP vs Batch (튜닝 방향이 다름)
- OLTP: 짧고 빠른 트랜잭션, 동시 사용자 많음, 인덱스 사용 → SGA 중심(캐시 효율·동시성).
- Batch/DW: 대량 처리, 긴 실행, full scan/sort/hash → PGA 중심(workarea 버티기).
- 한 문장: "OLTP는 SGA, Batch는 PGA."

## ⑨ 가장 흔한 DB 병목 순위 (Oracle 실무 감각)
1. log file sync(commit 병목): commit 잦음/redo 디스크 느림/LGWR latency. 체감="저장이 느림".
2. 동시성 경합(hot block/row lock): 같은 row 집중, sequence/index hotspot.
3. Buffer Cache 부족: SGA 작음/full scan → physical read↑.
4. PGA 폭발: batch/parallel sort·hash.
5. dirty buffer pressure → free buffer waits: update 많은데 DBWR 느림.
6. checkpoint 문제: 너무 드묾 → recovery 시간↑.

## ⑩ shutdown 옵션 (실무)
- normal: 모든 유저 logoff까지 대기(잘 안 끝남, 실무 기피).
- transactional: 진행 중 트랜잭션 끝날 때까지 대기.
- immediate: 트랜잭션 강제 종료+rollback 후 종료. ★ 실무 기본(통제성·정합성 균형).
- abort: rollback 없이 강제 종료(kill -9급). 다음 startup에 recovery 부담↑. 최후 수단.
- ★ 공지 없이 immediate = 사고. restricted session으로 신규 차단 후 수행.
