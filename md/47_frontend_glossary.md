# [문서] UI 컴포넌트 용어집 (프론트 공통 언어)
> "이런 UI를 뭐라 부르나" — 개발자·디자이너·기획자 공통 언어. 라이브러리(Radix/shadcn/MUI) 문서도 이 이름.
> ★ 정확한 명칭으로 소통·검색. "옆에서 나오는 메뉴"가 아니라 "드로어".

---

## 알림·피드백
- Toast(토스트): 모서리에 잠깐 떴다 사라지는 알림("저장되었습니다").
- Snackbar(스낵바): 토스트와 거의 같음(주로 하단, Material 용어).
- Alert(얼럿): 페이지 안에 고정으로 뜨는 경고/안내 박스.
- Modal / Dialog(모달/다이얼로그): 화면 덮고 뜨는 팝업. 배경 어두워짐.
- Popover(팝오버): 특정 요소 옆에 떠서 부가 정보/액션.
- Tooltip(툴팁): hover 시 뜨는 작은 설명.
- Banner(배너): 상단 전체 폭 알림.
- Progress bar / Spinner(프로그레스바/스피너): 로딩 표시.
- Skeleton(스켈레톤): 로딩 중 회색 뼈대 표시.

## 네비게이션
- Breadcrumb(브레드크럼): "홈 > 카테고리 > 상품" 경로 표시.
- Navbar / Header(네비바/헤더): 상단 네비게이션 바.
- Sidebar / Drawer(사이드바/드로어): 옆에서 나오는 메뉴 패널.
- Tabs(탭): 여러 뷰 전환.
- Pagination(페이지네이션): "1 2 3 ... 다음" 페이지 이동.
- Stepper(스테퍼): 단계별 진행 표시(결제 1→2→3). "진행 바".
- Menu / Dropdown(메뉴/드롭다운): 클릭하면 펼쳐지는 목록.
- Accordion(아코디언): 접혔다 펴지는 목록(FAQ).

## 입력(폼)
- Input / Text field: 텍스트 입력. Textarea: 여러 줄.
- Checkbox(다중 선택) / Radio(단일 선택).
- Toggle / Switch(토글/스위치): 켜기/끄기.
- Select(셀렉트): 목록에서 하나 선택.
- Slider(슬라이더): 드래그로 값 조절.
- Date picker(데이트 피커): 달력에서 날짜.
- Autocomplete / Combobox(자동완성/콤보박스): 입력하면 후보 제시.
- File upload(파일 업로드): 파일 첨부.

## 데이터 표시
- Table(테이블): 행·열 데이터.
- Card(카드): 정보 담은 박스.
- List(리스트): 목록.
- Badge(뱃지): 작은 상태 표시(알림 개수, "NEW").
- Chip / Tag(칩/태그): 작은 라벨(필터·키워드).
- Avatar(아바타): 프로필 이미지(원형).
- Carousel(캐러셀): 이미지 슬라이드.
- Tree(트리): 계층 구조(폴더).

## 오버레이·기타
- Backdrop / Overlay: 모달 뒤 어두운 배경.
- Bottom sheet(바텀 시트): 모바일 아래서 올라오는 패널(=Drawer 하단형, vaul).
- Command palette(커맨드 팔레트): Ctrl+K 검색·명령창.
- Context menu(컨텍스트 메뉴): 우클릭 메뉴.
- Divider(디바이더): 구분선.

## 헷갈리기 쉬운 것 구분
- Modal vs Popover vs Tooltip: 모달=화면 덮음(집중 강제) / 팝오버=요소 옆 작은 창(액션 포함) / 툴팁=순수 설명(hover).
- Toast vs Alert: 토스트=자동 사라짐(임시) / 얼럿=페이지에 남음(고정).
- Dropdown vs Select: 드롭다운=메뉴(액션) / 셀렉트=값 선택(폼 입력).
- Drawer vs Modal: 드로어=옆/아래서 슬라이드 / 모달=중앙에 뜸.

## 왜 이름을 알아야 하나
개발자 간 공통 언어("공통된 코드로 대화"). 정확한 명칭으로 디자이너·기획자와 소통하고, 라이브러리(Radix/shadcn/MUI) 문서도 이 이름이라 찾아 쓰려면 알아야 함.
★ 병원결제 프로젝트 실사용: Drawer(vaul 모바일 하단), Carousel(embla), Radio Group(결제수단), Toast, Dialog(모달), Badge 등이 shadcn 컴포넌트로.
면접 팁: "이런 UI 구현해봤나요"에 정확한 명칭으로("토스트로 알림, 스테퍼로 결제 단계, 드로어로 모바일 메뉴") 답하면 실무 경험이 자연스럽게 드러남.
