# [문서21] CI/CD·쿠버네티스 기본 — 면접 실전용
> 스택: Git → GitHub Actions(CI) → Docker/ECR → Terraform(IaC) → EKS → ArgoCD(CD)
> 참고: EKS = Elastic Kubernetes Service(AWS 관리형 K8s). "EKG" 아님.

---

## 용어 정리
- Docker: 컨테이너를 만들고 실행. 앱을 이미지로 패키징.
- Kubernetes(K8s): 컨테이너를 여러 서버에 걸쳐 운영·확장·복구하는 오케스트레이터.
- EKS: AWS 관리형 K8s(컨트롤 플레인을 AWS가 관리).
- ECR: AWS Docker 이미지 저장소.
- Terraform: 인프라를 코드로(IaC) 정의·생성.
- GitHub Actions: GitHub 내장 CI/CD.
- ArgoCD: GitOps 배포 도구(Git을 진실의 원천으로 클러스터 동기화).

## 전체 그림 (Push CI + Pull CD)
개발자 push → GitHub Actions(빌드·테스트·이미지→ECR) → 매니페스트 레포 태그 업데이트 커밋 → ArgoCD 감지 → EKS에 pull 동기화. EKS는 Terraform으로 미리 구축.
★ 핵심: "CI는 push, CD는 pull".

## 1. CI/CD 개념
- CI(지속적 통합): 자주 병합+자동 빌드·테스트로 문제 조기 발견.
- CD(지속적 배포/전달): 검증된 빌드 자동 배포. Delivery(승인 후)/Deployment(완전 자동).
인과: 수동 배포는 느리고 실수 잦음 → 자동화로 속도·안정·반복성.
★ CI 게이트: 테스트·보안 스캔 통과 못 하면 배포 차단. "빠르되 안전하게"의 근간.

## 2. Git 브랜치 전략
- Git Flow: main/develop/feature/release/hotfix. 엄격, 정기 릴리즈.
- GitHub Flow: main+feature→PR→머지하면 배포. 단순, 지속 배포.
- Trunk-based: 짧은 브랜치 자주 main 병합. CI/CD 최적, 대규모.
★ GitHub Flow/Trunk가 CI/CD와 맞음. main은 항상 배포 가능 상태 유지.

## 3. GitHub Actions (CI)
- .github/workflows/*.yml, push/PR 이벤트에 반응.
- 흐름: checkout→테스트→Docker 빌드→ECR push→매니페스트 태그 업데이트.
★ 포인트:
- OIDC로 AWS 인증: 액세스 키 박지 말고 OIDC 페더레이션으로 임시 자격증명(IAM Role 원리, 키 유출 제거).
- 캐싱(의존성·Docker 레이어), 매트릭스 빌드(병렬), 시크릿(GitHub Secrets/Secrets Manager).

## 4. Docker & ECR
- Dockerfile로 빌드→ECR 저장→EKS가 pull.
★ 실무:
- 멀티스테이지 빌드: 빌드/실행 환경 분리→최종 이미지 작게(빌드 도구 제외).
- 태그: latest 금지→커밋 SHA/시맨틱 버전(롤백·추적).
- 이미지 스캔(Trivy): 취약점 심각하면 차단.
- 레이어 최소화: 안 바뀌는 것(의존성) 앞 레이어→캐시.

## 5. Terraform (IaC)
정의: 인프라를 코드로. VPC·EKS·IAM·RDS를 .tf로 정의, terraform apply로 생성.
인과: 콘솔 클릭은 재현·추적 불가. 코드는 버전관리·리뷰·재현·롤백 가능. (AWS "최소에서 쌓기"를 코드로)
★ 포인트:
- 상태 파일(state): "지금 뭐가 있나" 기록. S3 원격 저장+DynamoDB 잠금(동시 수정 방지). 로컬 state는 협업 재앙.
- 모듈화(VPC/EKS 모듈 재사용).
- plan→apply: plan으로 변경 미리보기 후 apply.
- 드리프트: 콘솔 수동 변경 시 코드와 어긋남→Terraform 감지.

## 6. 쿠버네티스 핵심 오브젝트
정의: 원하는 상태 선언→실제 상태를 맞춤(reconcile).
- Pod: 컨테이너 감싼 최소 단위(보통 컨테이너 1개).
- Deployment: Pod를 원하는 개수 유지·롤링 업데이트·롤백. 죽으면 자동 재생성.
- Service: Pod들에 안정적 접근점(IP/DNS). Pod IP 바뀌어도 앞에서 로드밸런싱.
- Ingress: 외부 HTTP(S)를 Service로 라우팅(도메인·경로). AWS는 ALB Ingress Controller.
- ConfigMap/Secret: 설정·민감정보를 코드와 분리해 주입.
- Namespace: 논리 격리(dev/staging/prod).
★ 자동 확장:
- HPA(Horizontal Pod Autoscaler): 메트릭 기준 Pod 수 조절.
- Cluster Autoscaler/Karpenter: 노드(서버) 자체 증감.

## 7. ArgoCD & GitOps (CD)
정의: Git을 인프라·앱 상태의 유일한 진실의 원천으로. ArgoCD가 Git과 클러스터 실제 상태를 지속 비교·동기화.
4원칙: 선언적 정의/버전관리된 불변 상태/자동 pull/지속 감시.
★ 왜 GitOps(전통 대비):
- 전통: CI가 클러스터에 push(kubectl apply). CI가 클러스터 권한 가져야 해 보안 부담.
- GitOps: 클러스터가 Git에서 pull. 감사성(모든 변경 커밋)/드리프트 감지/간단 롤백(커밋 되돌리기).
동작: 매니페스트에 "이미지 v2" 커밋→ArgoCD 감지→EKS 적용→헬스체크→실패 시 롤백.

## 8. 배포 전략 (무중단)
- 롤링 업데이트(K8s 기본): 하나씩 교체. 무중단, 잠시 구/신 공존.
- 블루-그린: 새 버전 완전히 띄우고 트래픽 한 번에 전환. 롤백 즉시.
- 카나리: 트래픽 일부(5%)만 새 버전→문제없으면 확대. 위험 최소.
★ 선택: 안전 최우선=카나리, 빠른 전환·롤백=블루-그린, 일반=롤링.

## 전체 흐름 한 문장
"Terraform으로 VPC·EKS·IAM을 코드로 프로비저닝, push하면 GitHub Actions가 빌드·테스트·이미지 스캔 후 ECR에 올리고 매니페스트 태그 갱신. ArgoCD가 감지해 EKS에 pull 동기화, HPA로 Pod·Karpenter로 노드 오토스케일. 배포는 카나리로 점진 검증, 실패 시 Git 롤백."
