# [문서54] Git 협업 실습 — 브랜치·PR·충돌·rebase 전 과정
> 혼자서 5인 팀을 연기하며 브랜치→PR→리뷰→merge, 그리고 같은 파일 충돌을 merge와 rebase로 각각 해결하고 reset·force-with-lease까지 돌려본 실습 기록.

회사 GitLab/GitHub 협업 체계에 적응하기 위한 실습 기록.
맨땅에서 `collab-practice` 리포를 만들어, 혼자서 프론트/백엔드 5명 팀을 연기하며
"브랜치 → 커밋 → PR → 리뷰 → 수정 → merge" 사이클과, 이어서
"같은 파일 충돌 → merge/rebase로 각각 해결 → reset으로 되돌리기 → force-with-lease로 원격 반영"
까지 돌려본 과정이다.

**실습에 등장한 실제 커밋(재현·대조용):**
- `8aa077f` Initial commit
- `12031ff` 로그인 폼 (fe-dev1, PR #1, squash merge)
- `04f3157` / `325592f` 비밀번호 찾기 링크 (fe-dev2, PR #2, merge commit)
- `26d235d` 소셜 버튼 (be-dev1, rebase 전) → `9f1d127` (rebase 후, 해시 변경) → `b578f5e` (main 합류)
- `a83f612` merge 방식으로 충돌 해결했던 병합 커밋 (이후 reset으로 폐기)

---

## 0. 실습 무대 설정

### 팀 구성 (가상)

계정은 실제로 안 만든다. 커밋의 **author 정보만 바꿔서** 여러 사람을 연기한다.

```
프론트엔드 팀 (3명)          백엔드 팀 (2명)
├─ fe-lead  (팀장)          ├─ be-lead  (팀장)
├─ fe-dev1  (팀원)          └─ be-dev1  (팀원)
└─ fe-dev2  (팀원)
```

### 팀원 이름을 환경변수로 영구 등록

터미널을 새로 열 때마다 다시 입력하지 않도록 `~/.zshrc`(macOS 기본 셸 zsh)에 저장한다.

```bash
cat >> ~/.zshrc << 'EOF'

# collab-practice 실습용 가상 팀원 (author 연기용)
export FE_LEAD='fe-lead <fe-lead@collab.test>'
export FE_DEV1='fe-dev1 <fe-dev1@collab.test>'
export FE_DEV2='fe-dev2 <fe-dev2@collab.test>'
export BE_LEAD='be-lead <be-lead@collab.test>'
export BE_DEV1='be-dev1 <be-dev1@collab.test>'
EOF

source ~/.zshrc          # 지금 열린 창에도 즉시 반영
echo "$FE_DEV1"          # 확인: fe-dev1 <fe-dev1@collab.test>
```

> ⚠️ `>>` (덧붙이기)를 반드시 사용. `>` (하나)는 기존 파일을 통째로 덮어쓴다.

---

## 1. 원격(remote) 설정 — HTTPS → SSH

회사 표준은 SSH다. remote를 SSH 주소로 바꾼다.

```bash
git remote -v                                                  # 현재 remote 확인
git remote set-url origin git@github.com:<user>/collab-practice.git
ssh -T git@github.com                                           # 인증 테스트
```

성공 메시지 (에러 아님, 정상):
```
Hi <user>! You've successfully authenticated, but GitHub does not provide shell access.
```

`Permission denied (publickey)`가 뜨면 SSH 키가 없거나 GitHub에 공개키 등록이 안 된 것:

```bash
ls -la ~/.ssh                                # 키 존재 확인 (id_ed25519 / .pub)
ssh-keygen -t ed25519 -C "you@github"        # 없으면 생성
cat ~/.ssh/id_ed25519.pub                    # 공개키 출력 → GitHub Settings > SSH keys 에 등록
```

---

## 2. 브랜치 네이밍 규칙

```
<type>/<scope>-<issue#>-<short-description>
```

| 조각 | 뜻 | 예 |
|------|-----|-----|
| type | 작업 종류 | `feature`, `bugfix`, `hotfix`, `chore`, `refactor`, `docs` |
| scope | 팀/영역 | `fe`(프론트), `be`(백엔드), `infra`, `auth` |
| issue# | 이슈 번호 | `12` |
| description | 짧은 설명(소문자-하이픈) | `login-form` |

예시:
```
feature/fe-88-signup-form-validation     # 프론트 새 기능
bugfix/be-105-order-race-condition       # 백엔드 버그
hotfix/be-110-payment-500-error          # 백엔드 긴급
```

규칙:
- 전부 **소문자 + 하이픈**. 공백·대문자·언더스코어 금지.
- **이슈 번호를 꼭 넣는다** (PR이 이슈에 자동 연결됨).
- 설명은 3~5단어로 짧게.
- 규칙은 **팀마다 다르다** → 회사 가면 팀 컨벤션 문서 먼저 확인.

---

## 3. feature 브랜치 → 커밋 → push

### 브랜치 생성

```bash
git switch main
git pull origin main
git switch -c feature/fe-12-login-form     # 새 브랜치 만들며 이동
```

### 파일 작성 후 author를 바꿔서 커밋

```bash
git add client/login-form.js
git commit --author="$FE_DEV1" -m "feat(fe): add login form component (#12)"

# author 확인
git log --oneline -1 --format='%h %an: %s'
# → 555934b fe-dev1: feat(fe): add login form component (#12)
```

### push (첫 push는 -u)

```bash
git push -u origin feature/fe-12-login-form
```

`-u`는 로컬↔원격 브랜치를 연결(track). 이후로는 `git push` / `git pull`만 쳐도 된다.

push 후 출력되는 안내:
```
remote: Create a pull request for 'feature/fe-12-login-form' on GitHub by visiting:
remote:   https://github.com/<user>/collab-practice/pull/new/feature/fe-12-login-form
```
> 이건 "PR이 만들어졌다"가 아니라 **"PR을 만들 수 있는 링크"**다.
> 새 브랜치를 처음 push할 때만 뜬다. (main에 직접 push하던 예전 방식에선 안 떴던 이유.)

---

## 4. 핵심 개념: author vs committer

모든 커밋에는 **두 사람**이 기록된다.

| 구분 | 뜻 | 이 실습에서 | 바꾸는 법 |
|------|-----|-------------|-----------|
| **author** | 코드를 쓴 사람 | fe-dev1 (연기) | `git commit --author=` |
| **committer** | 커밋을 실제로 만든 사람 | 내 계정 (daniel) | 로컬 git 설정 |

로컬에서 둘 다 확인:
```bash
git show <hash> --format='author=%an <%ae>%ncommitter=%cn <%ce>' --no-patch
# author=fe-dev1 <fe-dev1@collab.test>
# committer=daniel <...>
```

**GitHub UI에서 보이는 방식:**
- Conversation 화면: **committer 아바타(내 계정)** 위주로 표시 → author가 잘 안 보임.
- **Commits 탭**: `fe-dev1 authored and <내계정> committed` 로 **둘 다 명확히 표시**됨.

### 이 방식이 "어디까지" 흉내 내나

| ✅ 진짜로 연습되는 것 | ❌ 계정 1개라 흉내만 내는 것 |
|----------------------|------------------------------|
| 커밋 로그/blame의 작성자 구분 | 권한 차단 (팀원은 main push 금지 등) |
| 브랜치 분리 작업 | PR 작성자·리뷰어 (= GitHub 계정 기준) |
| 충돌·rebase·merge 메커니즘 전체 | required reviewers, CODEOWNERS |

→ **Git 메커니즘(브랜치/충돌/rebase/merge)은 100% 동일하게 연습된다.**
   계정·권한 시스템 부분만 나중에 "보호 브랜치" 주제에서 개념으로 보충.

---

## 5. GitHub UI에서 PR 생성

### PR 생성 화면 여는 법 (3가지 중 아무거나)

- **방법 A**: push 직후 터미널에 뜬 `Create a pull request ... by visiting:` 링크를 클릭/복사해서 브라우저로 연다.
- **방법 B**: 리포 메인 페이지에 올라오는 노란 배너 **"Compare & pull request"** 버튼 클릭.
- **방법 C**: 리포 상단 **Pull requests** 탭 → 초록 **New pull request** 버튼 클릭.

셋 다 **Open a pull request** 화면으로 간다.

### 화면 상단 — base ← compare 방향 (제일 먼저 확인)

화면 맨 위에 이런 바가 있다:
```
base: main  ←  compare: feature/fe-12-login-form
```
- `base`(합쳐지는 목적지)와 `compare`(내 작업 브랜치)는 각각 **클릭하면 드롭다운**이 열려 다른 브랜치로 바꿀 수 있다.
- 방향이 `feature → main`이 맞는지 확인. (팀이 develop을 쓰면 여기서 base를 develop으로 바꾼다.)
- 그 아래 초록 체크 **"Able to merge"** 표시가 뜨면 충돌 없음.

### 제목·설명 입력

- **Title**: 커밋 메시지가 자동으로 기본값으로 들어가 있다. 그대로 두거나 수정.
- **Description(본문)**: 큰 텍스트 박스. 여기에 `Closes #12`를 쓰면 **merge 시 12번 이슈가 자동으로 닫힌다.** (이슈-PR 연결의 표준 습관. 실제 이슈가 없으면 표시만 되고 닫힘은 안 일어남.)

### 오른쪽 사이드바

- **Reviewers**: 클릭하면 리포 접근 권한이 있는 사람 목록이 뜬다. **이 실습에선 나 혼자뿐** → 가상 팀원(fe-lead 등)은 GitHub 계정이 아니라 목록에 안 나옴 → **지정 건너뜀**.
- Assignees / Labels / Milestone도 여기서 지정 (실습에선 비워둠).

### 생성

- 초록색 **Create pull request** 버튼 클릭.
- 만들어지면 `#1` 같은 PR 번호가 붙고, 상태가 초록 **Open**으로 표시된다.

### 실제로 확인된 것

- PR을 연 사람(상단 `<계정> commented`)은 커밋 author(fe-dev1)가 아니라 **내 GitHub 계정(jungyh870918)**으로 찍힌다.
- Conversation 화면의 커밋 줄 아이콘도 **committer(내 계정)** 아바타로 보인다.
- 커밋 author(fe-dev1)를 UI에서 확인하려면 **Commits 탭**을 봐야 한다 (아래 참조).

### author를 UI에서 확인 — Commits 탭

상단 **Commits** 탭을 누르면 각 커밋이 이렇게 표시된다:
```
fe-dev1 authored and jungyh870918 committed
```
`authored`(코드 짠 사람 = fe-dev1)와 `committed`(커밋 올린 사람 = 내 계정)가 **다른 사람으로 나뉘어** 보인다. 여기서 author 연기가 GitHub에도 반영됐음을 확인할 수 있다.

---

## 6. 리뷰 (fe-lead 연기)

실무 정석: **Files changed 탭에서 특정 코드 줄에 코멘트를 단다.**
(Conversation 탭 맨 아래 "Add a comment"는 PR 전체에 대한 일반 코멘트라 리뷰용으론 덜 씀.)

### 줄 단위 코멘트 다는 법

1. PR 상단 **Files changed** 탭 클릭 → 변경된 파일의 diff가 보인다 (추가된 줄은 초록 배경).
2. 코멘트를 달 **코드 줄 위에 마우스를 올리면**, 그 줄 번호 왼쪽에 **파란색 `+` 버튼**이 나타난다.
3. `+` 클릭 → 그 줄 아래에 코멘트 입력창이 열린다. 내용 작성.
   (예: "password input에 autocomplete='current-password' 추가해주세요.")
4. 입력창 아래 버튼 2개 중 선택:
   - **Add single comment**: 이 코멘트 하나만 즉시 게시.
   - **Start a review**: 코멘트를 "보류(pending)"로 모아둔다. 여러 줄에 달고 한 번에 제출하는 실무 방식 → **이걸 사용.**

### 리뷰 확정

- **Start a review**를 누르면 화면 우측 상단에 **Finish your review** 버튼(보류 코멘트 개수 배지 포함)이 생긴다.
- **Finish your review** 클릭 → 팝업에 요약 입력란 + 세 가지 선택:
  - **Comment**: 승인/거부 없는 단순 의견.
  - **Approve**: 승인 (merge해도 좋다).
  - **Request changes**: 수정 요청 (고칠 때까지 merge 보류하자는 의견).
- 요약 한 줄 쓰고 **Submit review** 클릭.

### 실제로 확인된 것 (계정 1개의 한계)

> 본인이 연 PR에서는 GitHub이 **Approve / Request changes를 정식 리뷰로 받지 않고**,
> 코멘트 옆에 **`Author` 배지**를 붙여 일반 코멘트로 처리한다.
> Request changes를 골라도 실제 "변경요청 상태"로 안 걸린다.
> → 계정이 하나뿐이라 생기는 한계. **줄 코멘트를 달고 리뷰를 제출하는 흐름 자체는 동일하게 연습된다.**
> 진짜 승인/차단이 걸리는 경험은 "보호 브랜치" 주제에서 별도로 다룬다.

---

## 7. 리뷰 반영 → 수정 커밋 → PR 자동 업데이트

**핵심: PR을 새로 만들 필요 없다. 같은 브랜치에 push하면 PR이 자동 갱신된다.**

```bash
git branch --show-current          # feature/fe-12-login-form 확인
# ... 파일 수정 ...
git diff                           # 변경 확인 (q로 빠져나옴)

git add client/login-form.js
git commit --author="$FE_DEV1" -m "fix(fe): add autocomplete attrs to login inputs (#12)"
git push                           # -u로 이미 연결됨 → 브랜치명 생략 가능
```

push 성공 시 `[new branch]`가 아니라 **커밋 범위**로 표시:
```
   555934b..9f28235  feature/fe-12-login-form -> feature/fe-12-login-form
```

→ 브라우저 PR 새로고침하면 **Commits 1 → 2**로 늘고, 타임라인에 새 커밋이 나타남.
   이것이 "리뷰 받고 → 고치고 → push → 같은 PR에서 재검토"되는 실무 사이클.

---

## 8. merge — 3가지 방식 (Merge 버튼 옆 ▾)

### merge 버튼 조작 순서

1. PR **Conversation** 탭 하단으로 스크롤 → merge 영역.
   (충돌 없으면 초록 **"This branch has no conflicts"** / merge 가능 표시. GitHub이 "Checking for the ability to merge automatically..."로 잠깐 확인 중일 수 있으니 초록불 될 때까지 대기.)
2. 초록 **Merge pull request** 버튼 **옆의 작은 삼각형 `▾`** 클릭 → 3가지 방식 드롭다운:
   - **Create a merge commit**
   - **Squash and merge**
   - **Rebase and merge**
3. 원하는 방식 선택 → 초록 버튼 라벨이 그 방식으로 바뀐다 → **버튼 클릭**.
4. 커밋 메시지 편집창이 뜬다 → 기본값 두거나 수정 → **Confirm merge / Confirm squash and merge** 클릭.
5. PR 상태가 보라색 **Merged**로 바뀐다.
6. merge 후 **Delete branch** 버튼 권유가 뜬다. 실무에선 역할 끝난 feature 브랜치는 보통 삭제.
   (단, 이어서 rebase/충돌 실습에 재활용할 거라면 남겨둔다.)

### 3가지 방식 비교

| 방식 | main 히스토리 | 원래 author(fe-dev1) 보존 |
|------|--------------|---------------------------|
| **Create a merge commit** (기본) | feature 커밋 다 보존 + 병합 커밋 1개 추가, 갈래짐 | ✅ 보존 |
| **Squash and merge** (실무 흔함) | feature 커밋들을 **1개로 압축**, 직선·깔끔 | ❌ 사라짐 (병합자 계정으로 대체) |
| **Rebase and merge** | 병합 커밋 없이 커밋들을 main 끝에 일렬로, 직선 | ✅ 보존 |

→ **깔끔함(squash) ↔ 세밀한 추적성(merge/rebase)의 맞교환.**

### 실제로 확인된 것 (Squash로 merge한 결과)

- GitHub UI엔 `merged 2 commits`라고 떴지만, 이는 "PR에 원래 커밋이 2개였다"는 뜻.
  **main에는 squash로 커밋 1개만** 들어갔다.
- merge 후 로컬 확인:
  ```bash
  git switch main
  git pull origin main
  git log --oneline --graph -5
  # * 12031ff (HEAD -> main, origin/main) feat(fe): add login form component (#12) (#1)
  # * 8aa077f Initial commit
  ```
  → fe-dev1의 커밋 2개(555934b, 9f28235)가 사라지고 **새 커밋 1개(12031ff)로 압축**. 갈래·병합커밋 없음.
  제목 끝 `(#1)`은 GitHub이 붙인 "PR #1에서 왔다"는 자동 표시.
- 압축된 커밋의 author/committer:
  ```bash
  git log -1 --format='author=%an <%ae>%ncommitter=%cn <%ce>'
  # author=jungyh870918 <jungyh870918@gmail.com>   ← fe-dev1이 아니라 내 계정
  # committer=GitHub <noreply@github.com>          ← 웹 UI 버튼 merge라 GitHub이 생성
  ```
  → **squash는 원래 author(fe-dev1)를 지우고 병합자(나)로 바꾼다.**
  → **웹 UI로 merge하면 committer가 `GitHub`**으로 찍힌다 (로컬 merge였다면 내 이름).

---

## 9. 충돌 해결 — merge 방식 vs rebase 방식 (핵심 실습)

이 섹션은 **같은 충돌을 merge로 한 번, rebase로 한 번** 풀어보며 둘의 차이를 비교한 기록이다.
등장인물: fe-dev2("비밀번호 찾기 링크")와 be-dev1("소셜 로그인 버튼")이 **같은 파일의 같은 위치**를 건드려 충돌을 낸다.

### 9-0. 충돌을 인위적으로 만드는 셋업

```bash
# fe-dev2: 최신 main에서 브랜치 파고 "Forgot password?" 링크 추가 → merge까지 완료
git switch -c feature/fe-20-forgot-password-link
# ... </form> 앞에 <a href="/forgot-password">Forgot password?</a> 추가 ...
git commit --author="$FE_DEV2" -m "feat(fe): add forgot-password link (#20)"
git push -u origin feature/fe-20-forgot-password-link
# → GitHub에서 PR #2를 "Create a merge commit" 방식으로 merge → main = 325592f

# be-dev1: 일부러 "옛날 main(12031ff)"에서 브랜치를 파서 링크를 모르는 상태로 만듦
git switch -c feature/be-30-social-login 12031ff   # ← 마지막 인자가 출발점 지정
# ... 같은 </form> 앞에 <button class="social">Sign in with Google</button> 추가 ...
git commit --author="$BE_DEV1" -m "feat(be): add social login button (#30)"   # 커밋 26d235d
git push -u origin feature/be-30-social-login
```

충돌이 나는 이유 — be-30이 **링크가 생기기 전 시점(12031ff)에서 갈라져** 같은 자리를 다르게 채웠기 때문:
```
main:  8aa077f → 12031ff → 04f3157 → 325592f   ("Forgot password?" 링크 있음)
                    │
                    └→ 26d235d (be-dev1)          ("소셜 버튼" 있음, 링크 없음)
                 여기(12031ff)서 갈라짐 → 같은 </form> 앞자리를 서로 다르게 수정
```

> `switch -c <새브랜치> <출발점>` : 출발점을 지정하면 "그 시점에서 갈라진" 브랜치를 만들 수 있다.
> 실무에선 "내가 브랜치 파고 작업하는 사이 동료가 같은 파일을 먼저 merge한" 상황이 이것과 동일하다.

---

### 9-1. 방식 A — merge로 충돌 해결

```bash
git switch main
git pull origin main                    # main을 최신(325592f)으로
git switch feature/be-30-social-login
git merge main                          # ← 현재 브랜치(be-30)에 main을 끌어와 합침
```

**방향 주의:** `git merge main` = "**현재 브랜치에 main을 가져와** 합친다." main은 안 건드려진다.

충돌 발생 (merge가 실패한 게 아니라 **일시정지**한 상태):
```
Auto-merging client/login-form.js
CONFLICT (content): Merge conflict in client/login-form.js
Automatic merge failed; fix conflicts and then commit the result.
```

`git status` → `both modified: client/login-form.js` (양쪽이 다 고친 파일).

충돌 파일 내용 — **merge에서는 HEAD = 내 브랜치(be-dev1)**:
```
      <button type="submit">Log in</button>
<<<<<<< HEAD
      <button type="button" class="social">Sign in with Google</button>   ← 내 브랜치(be-30)
=======
      <a href="/forgot-password">Forgot password?</a>                     ← 합쳐지는 main
>>>>>>> main
    </form>
```

충돌 마커 읽는 법:
- `<<<<<<< HEAD` ~ `=======` : **현재 브랜치**(HEAD)의 내용
- `=======` ~ `>>>>>>> main` : **합치려는 쪽**(main)의 내용
- **마커 3줄(`<<<<<<<`, `=======`, `>>>>>>>`)은 반드시 전부 삭제**해야 한다. 하나라도 남으면 코드에 섞여 오류.

해결 — 둘 다 살리는 형태로 파일을 정리한 뒤:
```bash
git add client/login-form.js            # "해결됨" 표시
git status
# → All conflicts fixed but you are still merging.
#   (use "git commit" to conclude merge)      ← 아직 merge 진행 중
git commit --no-edit                    # ← 멈췄던 merge를 매듭짓는 "마침표". 병합 커밋 생성
```

> **merge는 명령을 한 번만 쳤다.** `git merge main`이 충돌로 멈췄다가 → 해결 → `git commit`으로 **재개·완료**된 것.
> `git commit`은 새 merge가 아니라 "진행 중이던 merge의 마침표"다.

merge 방식의 결과 히스토리 — **병합 커밋(a83f612)이 생기고 갈래짐**:
```
*   a83f612 (HEAD) Merge branch 'main' into feature/be-30-social-login   ← 병합 커밋
|\
| *   325592f Merge pull request #2 ...
| |\
| | * 04f3157 feat(fe): add forgot-password link (#20)
| |/
* / 26d235d feat(be): add social login button (#30)   ← 원래 커밋 그대로 유지
|/
* 12031ff feat(fe): add login form component (#12) (#1)
* 8aa077f Initial commit
```
- 병합 커밋 `a83f612`가 추가되고, be-30 안으로 main 갈래가 딸려 들어와 **그래프가 엉킨다**.
- 원래 커밋 `26d235d`는 **해시 그대로 보존**된다.

---

### 9-2. merge 결과 되돌리기 — `git reset --hard` (위험 명령)

같은 충돌을 rebase로 다시 풀기 위해, 방금 만든 병합 커밋을 없애고 되돌린다.

```bash
git reset --hard 26d235d       # be-30을 "소셜 버튼만 있던" 26d235d 시점으로 되돌림
```

확인:
```
* 26d235d (HEAD -> feature/be-30-social-login) feat(be): add social login button (#30)
* 12031ff feat(fe): add login form component (#12) (#1)
* 8aa077f Initial commit
```
→ 병합 커밋 `a83f612` 제거, 갈래 사라짐, `cat`으로 보면 "Forgot password?" 링크도 사라져 충돌 전 상태로 복귀.

> ⚠️ **`git reset --hard` 위험성**
> "지정 커밋 이후를 전부 버리고 **작업 파일까지** 그 시점으로 되돌린다."
> - 커밋 안 한 변경사항이 있으면 **복구 거의 불가능하게 날아간다.**
> - 되돌린 뒤의 커밋들도 브랜치에서 떨어져 나간다.
>
> **지금이 안전했던 이유:** (1) 커밋 안 한 변경 없음(merge를 커밋으로 마무리한 상태), (2) 버릴 대상이 방금 만든 병합 커밋 하나로 명확, (3) 원래 커밋 26d235d는 보존됨.
> → "지울 대상이 명확하고 잃을 소중한 게 없을 때"가 reset --hard의 안전지대.

---

### 9-3. 방식 B — rebase로 충돌 해결

```bash
git rebase main                         # 내 커밋을 최신 main 위로 "다시 심는다"
```

**merge vs rebase 개념 차이:**
- **merge**: 두 갈래를 합치는 **병합 커밋**을 만든다. (내 브랜치에 main을 얹음 → HEAD = 내 브랜치)
- **rebase**: 최신 main을 바닥에 깔고 그 위에 **내 커밋을 하나씩 다시 적용**한다. (바닥 = main → HEAD = main)

충돌 발생:
```
CONFLICT (content): Merge conflict in client/login-form.js
error: could not apply 26d235d... feat(be): add social login button (#30)
```

충돌 파일 내용 — **rebase에서는 HEAD = main (merge와 반대로 뒤집힘!)**:
```
<<<<<<< HEAD
      <a href="/forgot-password">Forgot password?</a>          ← 이번엔 main이 HEAD
=======
      <button type="button" class="social">Sign in with Google</button>   ← 적용 중인 내 커밋
>>>>>>> 26d235d (feat(be): add social login button (#30))
```

> **왜 방향이 반대인가:** rebase는 "main을 기준(HEAD)으로 깔고, 내 커밋을 손님으로 그 위에 올리는" 방식이라
> `HEAD = main 내용`, 아래쪽 = 내 커밋으로 표시된다. **해결 방법은 merge와 동일**(마커 지우고 원하는 형태로).

해결 — 마찬가지로 둘 다 살린 뒤:
```bash
git add client/login-form.js
git rebase --continue                   # ← merge에선 'git commit'이었던 자리. rebase는 이것.
# (커밋 메시지 편집창이 뜨면 기본값 그대로 저장: nano는 Ctrl+O→Enter→Ctrl+X, vim은 :wq)
# → Successfully rebased and updated refs/heads/feature/be-30-social-login.
```

> **멈춤→재개 리듬은 merge와 같지만 재개 명령이 다르다:**
> - merge: 충돌 → `add` → **`git commit`**
> - rebase: 충돌 → `add` → **`git rebase --continue`**
> (되돌리려면 `git rebase --abort`, 특정 커밋 건너뛰려면 `git rebase --skip`)

rebase 방식의 결과 히스토리 — **병합 커밋 없이 직선**:
```
* 9f1d127 (HEAD -> feature/be-30-social-login) feat(be): add social login button (#30)   ← 새 해시!
*   325592f (origin/main, main) Merge pull request #2 ...
| * 04f3157 feat(fe): add forgot-password link (#20)
|/
* 12031ff feat(fe): add login form component (#12) (#1)
* 8aa077f Initial commit
```
- 병합 커밋 없음. 내 커밋이 **main 끝에 일렬로** 얹혀 직선. (맨 위가 최신, 기존 main은 아래에 그대로)
- **커밋 해시가 바뀜: `26d235d` → `9f1d127`** (내용·author는 동일한데 해시만 다름)

---

### 9-4. rebase가 해시를 바꾸는 이유 & force push

**왜 해시가 바뀌나:** 커밋 해시는 "내용 + 부모 커밋 + author + 시간"을 섞은 지문이다.
rebase는 커밋의 **부모를 `12031ff` → `325592f`로 바꿔** 다시 만들므로, 내용이 같아도 완전히 다른 커밋(다른 해시)이 된다.

그 결과 **로컬(9f1d127)과 원격(아직 26d235d)의 히스토리가 어긋나** push가 거부된다:

```bash
git push
# ! [rejected]        feature/be-30-social-login (non-fast-forward)
# error: failed to push some refs ...
# hint: the tip of your current branch is behind its remote counterpart.
```

> **이건 "충돌(conflict)"이 아니라 "push 거부(non-fast-forward)"다.** 마커 같은 건 없다.
> 원격의 `26d235d`와 로컬의 `9f1d127`이 한 줄로 안 이어져서(fast-forward 불가) Git이 "덮어써도 되냐?"고 막는 **안전장치**다.
> ⚠️ 힌트가 `git pull` 하라고 하지만 **rebase 후엔 따르면 안 된다.** pull하면 옛 커밋을 도로 끌어와 히스토리가 엉킨다. → **force push로 덮어써야 한다.**

**force push 두 종류:**

| 명령 | 동작 | 안전성 |
|------|------|--------|
| `git push --force` (`-f`) | 원격이 그새 바뀌었어도 **무조건 덮어씀** | ❌ 위험 (동료 커밋 날림) |
| `git push --force-with-lease` | 원격이 **내가 마지막으로 본 상태 그대로일 때만** 덮어씀 | ✅ 안전 |

`--force-with-lease` 동작:
- 원격이 내가 아는 `26d235d` 그대로 → 덮어씀 ✅
- 원격이 그새 바뀜(동료가 push) → **거부** → 동료 커밋을 안 날림 ✅

```bash
git push --force-with-lease
# + 26d235d...9f1d127 feature/be-30-social-login -> ... (forced update)
```
> 출력의 `+` 기호와 `(forced update)`, 그리고 점 3개(`26d235d...9f1d127`)가 "이어붙이기가 아니라 **덮어쓰기**"라는 표시.
> (일반 push는 점 2개 `a..b`로 표시된다.)

**실무 규칙: force가 필요하면 항상 `--force-with-lease`. `--force`는 웬만하면 쓰지 않는다.**
그리고 force로 덮어쓰는 대상은 **내 개인 브랜치(be-30)**일 뿐, main 같은 공용 브랜치가 아니다.
(**공용 브랜치에는 force push 금지**가 철칙.)

---

### 9-5. 최종 합류 — PR → Rebase and merge → main 직선 유지

rebase로 충돌을 미리 풀어놨으므로 PR 화면에 **초록 "✓ Able to merge"**가 뜬다 (충돌 없음).

```
PR 생성 (Compare & pull request 또는 New pull request)
 → Merge 버튼 ▾ → "Rebase and merge" 선택 → Confirm
 → main에 병합 커밋 없이 직선으로 합류
```

로컬 main 최신화:
```bash
git switch main
git pull origin main
# Updating 325592f..b578f5e
# Fast-forward                     ← 직선이라 fast-forward로 깔끔하게 받아짐
```

최종 main 히스토리:
```
* b578f5e (HEAD -> main, origin/main) feat(be): add social login button (#30)   ← 소셜, 직선으로 얹힘
*   325592f Merge pull request #2 ...
|\
| * 04f3157 feat(fe): add forgot-password link (#20)
|/
* 12031ff feat(fe): add login form component (#12) (#1)
* 8aa077f Initial commit
```
> `Fast-forward`는 앞서 본 `non-fast-forward`(push 거부)의 반대 — "한 줄로 곧게 이어져 포인터만 앞으로 옮기면 되는" 상태. rebase가 만든 직선 덕분.
> 아래 `325592f`의 `|\` 갈래는 이번 것과 무관한 **예전 PR #2를 merge commit 방식으로 합친 흔적**이다.
> (한 리포에 squash/merge-commit/rebase 흔적이 섞여 있어, 각 방식이 히스토리에 남기는 모양을 한눈에 비교할 수 있다.)

최종 파일 — 세 작업자의 결과가 모두 합류:
```
<button type="submit">Log in</button>                              ← fe-dev1 (로그인 폼)
<button type="button" class="social">Sign in with Google</button>  ← be-dev1 (소셜)
<a href="/forgot-password">Forgot password?</a>                    ← fe-dev2 (링크)
```

---

### 9-6. 충돌·merge·rebase 한눈 요약

| 항목 | merge | rebase |
|------|-------|--------|
| 하는 일 | 두 갈래를 병합 커밋으로 합침 | 내 커밋을 최신 main 위에 다시 심음 |
| 히스토리 | 병합 커밋 생김, **갈래짐** | 병합 커밋 없음, **직선** |
| 충돌 시 HEAD | **내 브랜치** | **main** (반대!) |
| 충돌 해결 후 재개 | `git add` → `git commit` | `git add` → `git rebase --continue` |
| 커밋 해시 | 원래 해시 유지 | **바뀜** → force push 필요 |
| 원래 커밋 보존 | ✅ | ❌ (새로 만들어짐) |
| 되돌리기 | (병합 커밋 revert/reset) | `git rebase --abort`(진행 중) / `reset`(완료 후) |

**공통점:** 둘 다 충돌 시 "일시정지 → 마커 지우고 해결 → add → 재개"의 리듬은 같다. 재개 명령만 다르다.

---

## 명령어 빠른 참조

```bash
# 브랜치
git switch main                          # 브랜치 이동
git switch -c feature/fe-12-login-form   # 새 브랜치 만들며 이동
git branch --show-current                # 현재 브랜치 이름

# 커밋 (author 연기)
git commit --author="$FE_DEV1" -m "메시지"
git log --oneline -2 --format='%h %an: %s'    # author 확인
git show <hash> --format='author=%an%ncommitter=%cn' --no-patch

# push / pull
git push -u origin <branch>              # 첫 push (연결)
git push                                 # 이후 push
git pull origin main

# remote / SSH
git remote -v
git remote set-url origin git@github.com:<user>/<repo>.git
ssh -T git@github.com

# 충돌 해결 (merge 방식)
git merge main                    # 현재 브랜치에 main을 합침 → 충돌 시 일시정지
#   ... 파일에서 <<<<<<< ======= >>>>>>> 마커 지우고 원하는 형태로 정리 ...
git add <file>                    # 해결됨 표시
git commit --no-edit              # 멈췄던 merge 완료(병합 커밋 생성)

# 충돌 해결 (rebase 방식)
git rebase main                   # 내 커밋을 최신 main 위로 다시 심음 → 충돌 시 일시정지
git add <file>                    # 해결됨 표시
git rebase --continue             # 재개 (merge의 commit에 해당)
git rebase --abort                # 진행 중인 rebase 취소(원상복구)
git rebase --skip                 # 현재 커밋 건너뛰기

# 되돌리기 (위험 — 안전 조건 확인 후)
git reset --hard <commit>         # 지정 커밋으로 되돌림(이후 커밋+미커밋 변경 파기)

# 원격 덮어쓰기 (rebase 후)
git push --force-with-lease       # 안전한 force (원격이 내가 본 상태 그대로일 때만)
# git push --force                # ❌ 무조건 덮어씀 — 웬만하면 쓰지 말 것

# 브랜치 관찰/정리
git branch -v                     # 브랜치 + 각자 최신 커밋
git branch --merged main          # main에 이미 merge된 브랜치
git branch --no-merged main       # 아직 안 merge된 브랜치
git branch -d <branch>            # merge된 브랜치 안전 삭제
git branch -D <branch>            # 강제 삭제
git push origin --delete <branch> # 원격 브랜치 삭제
```

---

## 다음 예정 주제

- [x] merge 완료 후 로컬 main 최신화, 히스토리 확인 (섹션 8)
- [x] 여러 브랜치가 같은 파일 충돌 → **충돌 해결** (섹션 9)
- [x] **rebase** (vs merge) — merge/rebase 충돌 비교 (섹션 9)
- [x] `git reset --hard`로 merge 되돌리기 (섹션 9-2)
- [x] rebase 후 해시 변경 → `--force-with-lease`로 원격 덮어쓰기 (섹션 9-4)
- [ ] **interactive rebase** (`git rebase -i`)로 커밋 정리(squash/reword/reorder)
- [ ] **soft reset** (`git reset --soft`) — 커밋만 풀고 변경은 유지
- [ ] `git reset` 세 종류 비교 (--soft / --mixed / --hard)
- [ ] **revert vs reset** — 원격에 이미 공유된 커밋을 되돌리는 안전한 방법(revert)
- [ ] 보호 브랜치 + required reviewers (권한 게이트)
- [ ] main / develop / release 배포 브랜치 구조

## 아직 정리 안 한 것 (기억용)

- be-30 브랜치 삭제 아직 안 함 (로컬/원격 둘 다 남아있음) → 다음에 정리
- squash 시 원래 author 보존하려면 커밋 메시지에 `Co-authored-by:` 사용 (미실습)

---

## 핵심 요약

- ★ **브랜치 네이밍**: `<type>/<scope>-<issue#>-<desc>`, 전부 소문자+하이픈, 이슈 번호 필수. 규칙은 팀마다 다르므로 컨벤션 문서 우선 확인.
- ★ **author vs committer**: 커밋에는 두 사람이 기록된다. `--author=`로 작성자를 바꿔도 committer는 내 계정. GitHub Commits 탭에서 `X authored and Y committed`로 둘 다 보인다.
- ★ **merge 3방식**: merge commit(보존·갈래짐) / squash(1개로 압축·author 소실) / rebase(보존·직선). 깔끔함 ↔ 추적성의 맞교환.
- ★ **충돌 시 HEAD 방향이 뒤집힌다**: merge에서는 HEAD = 내 브랜치, rebase에서는 HEAD = main. 해결법 자체는 동일.
- ★ **재개 명령이 다르다**: merge는 `add` → `git commit`, rebase는 `add` → `git rebase --continue`.
- ★ **rebase는 해시를 바꾼다**: 부모 커밋이 달라지므로 새 커밋이 된다 → push 거부(non-fast-forward) → `--force-with-lease`로 덮어쓴다.
- ★ **force는 항상 `--force-with-lease`**, 그리고 대상은 개인 브랜치만. 공용 브랜치 force push는 금지.
- ★ **`git reset --hard`는 위험 명령**: 지울 대상이 명확하고 미커밋 변경이 없을 때만 안전지대.

## 면접 한 문장

"같은 파일 충돌을 merge와 rebase로 각각 해결해보며, merge는 병합 커밋으로 갈래를 남기고 rebase는 부모를 바꿔 해시가 재생성되어 직선 히스토리를 만든다는 차이를 확인했고, 그래서 rebase 후에는 원격과 히스토리가 어긋나 `--force-with-lease`로만 안전하게 덮어쓴다는 것까지 실습으로 익혔습니다."
