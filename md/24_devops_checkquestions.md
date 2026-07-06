# [문서24] CI/CD·쿠버네티스 확인 질문 — 핵심 점검용

---

## 1. CI/CD & Git
- CI와 CD 차이? Delivery와 Deployment 차이?
- CI 게이트란? 왜 중요?
- GitHub Flow가 CI/CD와 잘 맞는 이유?
- GitHub Actions에서 AWS 인증을 키 대신 뭘로? (OIDC)

## 2. Docker & 이미지
- 컨테이너와 VM 차이?
- 멀티스테이지 빌드를 왜 쓰나?
- 이미지 태그에 latest를 쓰면 안 되는 이유?
- 이미지 취약점은 어떻게 검사?

## 3. Terraform
- IaC가 콘솔 클릭보다 나은 점?
- Terraform state가 뭐고 왜 S3+DynamoDB에 두나?
- plan과 apply 차이?
- 드리프트란?

## 4. 쿠버네티스
- Pod/Deployment/Service/Ingress 각 역할?
- Deployment는 Pod가 죽으면 어떻게?
- Service가 필요한 이유? (Pod IP 변동)
- HPA와 Cluster Autoscaler(Karpenter) 차이?
- EKS에서 AWS가 관리하는 것 vs 내 몫?
- IRSA란? (Pod의 AWS 권한)
- K8s의 reconciliation loop를 한 문장으로?

## 5. GitOps & 배포
- GitOps를 한 문장으로? 진실의 원천은?
- 전통 CI/CD(push)와 GitOps(pull)의 차이와 장점?
- ArgoCD는 무엇을 지속적으로 하나?
- 롤링/블루-그린/카나리 각각 언제?
- GitOps에서 시크릿을 어떻게 다루나?

## 종합
- "코드 커밋부터 EKS 배포까지 전체 파이프라인을 설명해보라."
- "배포 후 장애가 났다. 어떻게 롤백하나?"
- "Terraform으로 인프라를, GitHub Actions로 CI를, ArgoCD로 CD를 어떻게 엮나?"
