# [문서25] CI/CD·쿠버네티스 실전편 — 구축·운영·트러블슈팅

---

## 1. 파이프라인 구축 순서 (실전)
1) Terraform으로 VPC·EKS·ECR·IAM 프로비저닝(state는 S3+DynamoDB).
2) EKS에 필수 애드온: ALB Ingress Controller, Cluster Autoscaler/Karpenter, metrics-server(HPA용), External Secrets.
3) ArgoCD 설치, 매니페스트 레포 연결.
4) 앱 레포에 GitHub Actions: 빌드→테스트→스캔→ECR push→매니페스트 태그 커밋.
5) ArgoCD가 감지해 배포. 헬스체크·롤백 구성.
경험: "앱 레포(코드)와 매니페스트 레포(배포 설정)를 분리해 관심사를 나눴고, CI가 이미지 태그만 매니페스트에 커밋하면 ArgoCD가 배포했다."

## 2. 두 레포 분리 패턴 (GitOps 정석)
- 앱 레포: 소스 코드 + Dockerfile + CI(Jenkinsfile/workflow).
- 매니페스트 레포: k8s YAML/Helm/Kustomize. ArgoCD가 감시.
- 이유: 코드 변경과 배포 설정 변경의 관심사 분리. 배포 이력이 매니페스트 레포 커밋으로 남음.

## 3. 자주 겪는 트러블슈팅
- Pod가 안 뜸: kubectl describe pod로 이벤트 확인.
  - ImagePullBackOff → 이미지 태그/ECR 권한 문제.
  - CrashLoopBackOff → 앱이 시작 직후 죽음(로그 kubectl logs 확인). 설정·환경변수·의존 서비스.
  - Pending → 노드 자원 부족(오토스케일 확인) or 스케줄 제약.
- OOMKilled: 메모리 limit 초과 → limit 조정 or 앱 메모리 누수.
- Service 접속 안 됨: selector 라벨 불일치, 포트 매핑, Ingress 설정.
- 배포됐는데 트래픽 안 옴: readiness probe 실패로 트래픽 제외됨.

## 4. probe (헬스체크 3종)
- liveness: 죽었나? 실패 시 Pod 재시작.
- readiness: 트래픽 받을 준비됐나? 실패 시 Service에서 제외(재시작 X).
- startup: 느린 시작 앱용, 시작 완료까지 다른 probe 유예.
★ readiness 잘못 설정하면 "배포됐는데 트래픽 안 옴". liveness 너무 민감하면 재시작 루프.

## 5. 리소스 관리
- requests: 스케줄링 기준(이만큼 보장). limits: 상한(넘으면 throttle/OOMKill).
- request 없으면 스케줄러가 자원 판단 못 함. limit 없으면 한 Pod가 노드 자원 독점.
- HPA는 request 대비 사용률로 스케일.

## 6. 비용·운영 최적화
- Karpenter: 필요한 만큼만 노드 프로비저닝(빠르고 저렴).
- Spot 인스턴스: 무상태 워크로드에 비용 절감.
- 이미지 작게(멀티스테이지)→pull 빠름·비용↓.
- 네임스페이스별 리소스 쿼터로 폭주 방지.

## 7. 롤백 실전
- GitOps: 매니페스트 레포에서 이전 커밋으로 revert→ArgoCD가 자동 동기화.
- K8s 직접: kubectl rollout undo deployment/앱.
- Argo Rollouts: 카나리 중 메트릭 나쁘면 자동 롤백.
경험: "배포 후 에러율 급증 알람 → 매니페스트 레포 revert 한 번으로 이전 버전 복구, 5분 내 정상화."

## 8. 면접 경험 서술
- "Terraform 모듈로 멀티 환경(dev/staging/prod) EKS를 코드로 관리했다."
- "GitHub Actions에서 OIDC로 키 없이 ECR에 push하고, Trivy 스캔을 게이트로 걸었다."
- "ArgoCD로 GitOps를 구성해 배포 이력을 Git에 남기고 커밋 revert로 롤백했다."
- "HPA로 Pod, Karpenter로 노드를 오토스케일해 트래픽 급증에 대응했다."
- "readiness probe 오설정으로 트래픽이 안 붙던 걸 진단해 고쳤다."

---

## 9. Helm (쿠버네티스 패키지 매니저)
정의: 앱 배포에 필요한 여러 YAML(Deployment/Service/ConfigMap)을 하나의 패키지(차트)로 묶어 관리. "K8s의 apt/npm".
인과: 앱 하나에 YAML 10개+환경별 값 차이→복붙 지옥. Helm은 템플릿+values로 해결(템플릿 하나+환경별 values.yaml 주입).
차트 구조: Chart.yaml(메타)/values.yaml(기본값)/templates/(YAML 템플릿, {{ .Values.image }}).
명령: helm install/upgrade/rollback. helm install myapp bitnami/redis(공개 차트 한 줄).
★ 가치: Redis/PG/모니터링을 검증된 공개 차트로 한 줄 설치+우리 앱도 차트로 환경별 배포·롤백. (Kustomize와 대안: 복잡 파라미터화=Helm, 단순 환경차이=Kustomize)

## 10. Docker & kubectl 필수 명령어
Docker:
- docker build -t app:v1 . / run -p 8080:80 app:v1 / ps / logs <id> / exec -it <id> sh / push / images / stop·rm
kubectl:
- get pods(-A 전체) / describe pod(이벤트, 트러블슈팅 1순위) / logs(-f 실시간, --previous 이전 컨테이너)
- exec -it <pod> -- sh / apply -f / delete -f
- rollout status·undo deploy/app / scale --replicas=5 / get svc·ingress / top pods(리소스)
★ 트러블슈팅 3종: get(뭐가 있나)→describe(왜 이상, 이벤트)→logs(앱이 뭐라). Pod 안 뜨면 이 순서.

## 11. 쿠버네티스 스토리지
핵심 문제: Pod는 일시적(ephemeral)→죽으면 데이터 소실. DB·파일은 영속 필요→이 간극을 메움.
계층:
- Volume: Pod에 붙는 공간. emptyDir(임시)/hostPath(노드 디스크).
- PV(PersistentVolume): 클러스터 레벨 실제 저장소(EBS/EFS/NFS).
- PVC(PersistentVolumeClaim): Pod가 "이만큼 주세요" 요청. PV와 바인딩.
- StorageClass: PV를 동적 자동 생성 템플릿(EBS gp3). PVC 오면 자동 생성.
흐름: Pod→PVC(요청)→PV(실제)←StorageClass(자동 생성).
★ StatefulSet: 일반 Deployment는 Pod 이름·저장소 뒤죽박죽→DB 부적합. StatefulSet은 안정적 이름(app-0,1)+각자 영속 볼륨. DB/Kafka/Redis 클러스터처럼 정체성·데이터 유지 필요한 앱.
★ 실무: StatefulSet+PVC로 DB 올릴 수 있지만 관리형(RDS)이 대개 나음(백업·복제·복구를 AWS에). K8s는 무상태 앱만. "넣을 수 있지만 넣어야 하나?"의 판단. EBS(블록,한 노드) vs EFS(파일,여러 노드 공유).

## 12. 헬스체크 주기 설정 (probe 튜닝)
livenessProbe: initialDelaySeconds(첫 체크까지 대기, 앱 부팅시간)/periodSeconds(주기)/timeoutSeconds/failureThreshold(몇 번 실패하면 조치).
★ 튜닝:
- initialDelay 너무 짧으면 부팅 중 앱을 죽었다 오판→재시작 루프. 시작시간보다 넉넉히.
- period 짧으면 빠른 감지+부하↑. liveness 여유롭게, readiness 촘촘히(트래픽 결정).
- failureThreshold 민감하면 일시 지연에도 재시작, 둔하면 늦게 감지.
- ★ liveness 너무 민감=정상인데 계속 재시작 재앙. readiness=트래픽 받을지, liveness=재시작할지.
