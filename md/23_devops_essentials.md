# [문서23] CI/CD·쿠버네티스 완전 기초 — 모르면 안 되는 상식

---

## 컨테이너 vs VM
- VM: 하드웨어 가상화, 게스트 OS 포함(무겁다).
- 컨테이너: OS 커널 공유, 프로세스 격리(가볍다, 빠른 시작).
- Docker는 컨테이너, 이미지는 그 실행 템플릿.

## Docker 기본
- Dockerfile: 이미지 빌드 레시피.
- 이미지: 불변 패키지(앱+환경). 컨테이너: 이미지의 실행 인스턴스.
- FROM(베이스)/RUN(명령)/COPY(파일)/CMD(실행)/EXPOSE(포트).
- docker build/run/push/pull.

## K8s 기본 명령
- kubectl get/describe/logs/exec/apply/delete.
- kubectl apply -f manifest.yaml (선언적 적용).
- kubectl rollout undo (롤백).

## K8s 오브젝트 요약
- Pod(최소 단위)/Deployment(Pod 관리)/Service(접근점)/Ingress(외부 라우팅)/ConfigMap·Secret(설정)/Namespace(격리).
- ReplicaSet(Pod 복제)/StatefulSet(상태 있는 앱, DB)/DaemonSet(모든 노드에 하나씩).

## CI/CD 용어
- 파이프라인/스테이지/잡/스텝/러너(실행 환경).
- 아티팩트: 빌드 결과물(이미지·바이너리).
- 트리거: 파이프라인 시작 이벤트(push/PR/스케줄).

## IaC 개념
- 인프라를 코드로. 선언형(Terraform: 원하는 상태)/명령형(스크립트: 단계).
- 멱등성: 여러 번 apply해도 같은 결과.
- 상태 관리, plan/apply.

## 환경 분리
- dev/staging/prod. 설정은 환경변수·ConfigMap으로 분리.
- 12-Factor App: 설정을 코드와 분리, 상태 외부화 등.

## AWS 컨테이너 서비스 비교
- EKS: 관리형 쿠버네티스(표준 K8s).
- ECS: AWS 고유 오케스트레이터(단순, AWS 종속).
- Fargate: 서버리스 컨테이너(노드 관리 없음). EKS/ECS와 결합.

## 롤백 개념
- 배포 실패 시 이전 버전으로. K8s는 rollout undo, GitOps는 커밋 revert.
- 이미지 태그를 버전으로 관리해야 롤백 가능(latest 금지 이유).
