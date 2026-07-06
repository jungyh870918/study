# [문서22] CI/CD·쿠버네티스 부가 설명 — 난이도 있는 개념 보충

---

## ① K8s는 어떻게 "원하는 상태"를 유지하나 (Reconciliation Loop)
- 선언적: "Pod 3개 원함"을 선언 → 컨트롤러가 실제와 비교 → 다르면 조치(하나 죽으면 생성).
- etcd: 클러스터의 모든 상태를 저장하는 키-값 저장소(진실의 원천).
- 컨트롤 플레인: API Server(관문)+Scheduler(Pod를 노드에 배치)+Controller Manager(reconcile)+etcd.
- 워커 노드: kubelet(Pod 실행)+kube-proxy(네트워킹)+컨테이너 런타임.

## ② EKS에서 AWS가 관리하는 것 vs 내가 하는 것
- AWS 관리: 컨트롤 플레인(API Server, etcd, Scheduler) — 이중화·업그레이드.
- 내 몫: 워커 노드(EC2/Fargate), 앱 배포, 네트워킹 설정, 오토스케일 구성.
- Fargate: 노드 관리도 서버리스로 위임(노드 신경 안 씀). vs 관리형 노드그룹(EC2 직접).

## ③ IRSA (IAM Roles for Service Accounts)
- Pod가 AWS 서비스(S3 등) 접근 시 키 대신 IAM Role을 ServiceAccount에 연결.
- OIDC 페더레이션으로 Pod에 임시 자격증명 자동 주입(EC2 Instance Profile의 Pod 버전).
- 키 하드코딩 없이 최소 권한. (AWS편 IAM Role 원리와 동일)

## ④ Terraform state 심화
- state = 코드와 실제 인프라의 매핑. 없으면 Terraform이 뭘 만들었는지 모름.
- 원격 백엔드(S3)+잠금(DynamoDB): 팀이 동시에 apply해도 충돌 방지.
- terraform import: 콘솔로 만든 기존 리소스를 코드 관리로 편입.
- 민감정보: state에 평문 저장될 수 있어 암호화·접근 제한 필수.

## ⑤ 헬름(Helm) & Kustomize
- Helm: K8s 매니페스트의 패키지 매니저. 템플릿+values로 환경별 설정 주입. 차트로 재사용.
- Kustomize: 베이스 매니페스트에 환경별 오버레이(패치). 템플릿 없이 순수 YAML.
- 선택: 복잡한 파라미터화=Helm, 단순 환경 차이=Kustomize.

## ⑥ 시크릿 관리 (GitOps의 난제)
- Git에 평문 시크릿 금지. 해결:
  - Sealed Secrets: 암호화해 Git에 저장, 클러스터에서만 복호화.
  - External Secrets Operator: AWS Secrets Manager에서 실시간 주입.
  - SOPS: 파일 단위 암호화.
- ★ GitOps에서 "모든 걸 Git에"와 "시크릿은 Git에 넣으면 안 됨"의 충돌을 이렇게 푼다.

## ⑦ 배포 전략 상세
- 롤링: maxSurge(추가 생성 수)/maxUnavailable(동시 중단 수)로 속도·안정 조절.
- 카나리: 트래픽 가중치를 서비스 메시(Istio)나 인그레스로 조절. 메트릭 보고 자동 승격/롤백(Argo Rollouts, Flagger).
- 블루-그린: 트래픽 스위치가 순간이라 롤백 즉시. 단 두 배 리소스 필요.

## ⑧ 파이프라인 보안 (DevSecOps)
- SAST(SonarQube): 코드 정적 분석.
- SCA(Snyk): 의존성 취약점.
- 이미지 스캔(Trivy): 컨테이너 취약점.
- IaC 스캔(tfsec/Checkov): Terraform 보안.
- 이미지 서명(cosign): 공급망 무결성.
- OPA/Gatekeeper: 클러스터 정책 강제(예: 권한 있는 컨테이너 금지).
- ★ 각 단계가 게이트: 심각 취약점이면 파이프라인 중단.

## ⑨ 관측성 (운영)
- 로그: EKS→CloudWatch/Loki. 요청 ID로 추적.
- 메트릭: Prometheus+Grafana. HPA도 이 메트릭 기반.
- 트레이싱: 분산 추적(Jaeger).
- ★ Pod가 죽고 사는 환경이라 개별 서버가 아닌 집계·라벨 기반 관측 필수.
