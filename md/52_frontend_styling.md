# [문서] 스타일링 — SCSS·Handlebars·Tailwind 커스텀
> 안 써본 것도 개념은 알기. SCSS 기본, 예전 프로젝트 방식(Handlebars 템플릿), Tailwind 전역 커스텀 설정.

---

## 1. SCSS(Sass) 기본 개념
SCSS = CSS를 프로그래밍 언어처럼 확장한 것. 순수 CSS엔 없는 기능을 더해 빌드 시 일반 CSS로 컴파일. (Sass는 언어, SCSS는 CSS 호환 문법 — 실무는 SCSS 문법)
핵심 기능(이것만):
- 변수: 색·크기 재사용.  $primary: #3b82f6;  .btn { background: $primary; }
- 중첩(nesting): 계층 그대로.  .card { .title {...}  &:hover {...} }  (&=부모 참조)
- mixin: 재사용 스타일 묶음(함수처럼).  @mixin flex-center {...}  .box { @include flex-center; }
- @extend: 다른 선택자 스타일 상속.  .critical { @extend .error; font-weight: bold; }
- partials + @use: 파일 분리·모듈화.  _variables.scss → @use 'variables';
★ 한 줄: SCSS = CSS + 변수 + 중첩 + mixin + 모듈화. "CSS를 유지보수하기 좋게 만든 상위 언어."
SCSS vs Tailwind: SCSS=별도 파일에 의미 있는 클래스 정의(className=\"card\") / Tailwind=HTML에서 유틸리티 조합(className=\"p-4 flex\"). 접근이 반대.
Next에서: npm i -D sass 만 하면 .scss/.module.scss import 가능(.module.scss는 scoped, 클래스 충돌 방지).

## 2. Handlebars — 예전 프로젝트 템플릿 방식
Handlebars = 서버 사이드(또는 빌드 타임) HTML 템플릿 엔진. React 이전/비-React 스택에서 흔했음. 로직 최소화("logic-less") 철학.
문법:
- 변수 출력: {{title}}  (HTML 이스케이프됨). {{{raw}}} = 이스케이프 안 함.
- 반복: {{#each items}} <li>{{this.name}}</li> {{/each}}
- 조건: {{#if isActive}} ... {{else}} ... {{/if}}
- 부분 템플릿(partial): {{> header}}  (헤더 조각 재사용, 레이아웃 공통화)
- 헬퍼(helper): {{formatDate date}}  (커스텀 함수 등록해 값 변환)
동작 방식(두 형태):
- 서버 사이드: 서버가 데이터 + 템플릿(.hbs)을 합쳐 완성 HTML을 생성해 전송. (Express+express-handlebars, 또는 Java의 Handlebars.java/Mustache)
- ★ 클라이언트 사이드(script 태그 방식): HTML 템플릿을 <script type="text/x-handlebars-template">에 담아둠. 브라우저는 모르는 타입이라 실행/렌더 안 하고 텍스트로 보관 → JS가 document.getElementById().innerHTML로 꺼내 Handlebars.compile()로 컴파일 → 데이터 주입 → innerHTML로 DOM 삽입. 여러 조각을 script 블록/partial로 나눠 조립.
  왜 script 태그? <div>면 브라우저가 바로 렌더해 {{name}}이 그대로 보임. script의 특수 type이면 브라우저가 안 건드려 템플릿 원본을 그대로 보관·추출 가능.
  ★ 실제 사례: 대선 출구조사 차트 프로젝트가 이 방식(Java 백엔드 + script 태그 Handlebars 템플릿, 문서29-D).
★ React와 대비: Handlebars=서버가 HTML을 미리 조립해 보냄(전통적 SSR, 상호작용은 별도 JS). React=클라이언트가 상태로 UI를 그림(컴포넌트+가상DOM). Handlebars는 "템플릿에 값을 꽂아 문자열 HTML 생성", React는 "상태가 바뀌면 다시 렌더".
- 이 방식 스타일: 보통 전역 CSS/SCSS + 클래스명으로. 컴포넌트 스코프 개념이 약해 BEM 같은 네이밍 규칙으로 충돌 관리.
### 관련: Thymeleaf (Spring 서버 템플릿) — 다른 프로젝트
- Thymeleaf = Spring에서 흔한 서버 사이드 템플릿 엔진. Handlebars의 {{}}와 달리 HTML 속성 방식: th:text(값), th:each(반복), th:if(조건), th:href 등.
- natural template: th: 속성은 순수 HTML로도 열림(브라우저에서 그냥 열어도 안 깨짐). 서버가 데이터를 채운 완성 HTML을 전송(서버 렌더).
- ★ 실제 사례: 행안부 SSO 프로젝트가 Spring + Thymeleaf + Nexacro(엔터프라이즈 UI 플랫폼) 조합(문서29-E).
- Handlebars(script 태그, 클라 렌더) vs Thymeleaf(th: 속성, 서버 렌더) — 둘 다 템플릿이지만 렌더 위치·문법이 다름.

★ 경험 서술: "정부 SSO는 Spring+Thymeleaf에 Nexacro를 얹은 엔터프라이즈 스택이었고, 출구조사 차트는 Java 백엔드 + Handlebars script 템플릿(클라 렌더)이었습니다. 둘 다 React 이전 세대의 서버 중심 스택으로, 지금의 컴포넌트+Tailwind와는 접근이 달랐습니다. 모던 SPA뿐 아니라 엔터프라이즈/레거시 환경도 다뤄봤습니다."

## 3. Tailwind 전역 커스텀 — 기본 설정
Tailwind는 프레임워크 기본값을 그대로 쓰지 않고 브랜드에 맞게 커스텀(design token). v3와 v4가 방식이 다름.

### v3 방식 (tailwind.config.js)
설정 파일에서 theme.extend로 색·폰트·간격 추가:
```
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],   // 클래스 스캔 대상
  theme: {
    extend: {
      colors: { primary: '#6366f1', 'primary-dark': '#4f46e5' },
      fontFamily: { display: ['Satoshi', 'sans-serif'] },
      spacing: { '18': '4.5rem' },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};
```
→ bg-primary, font-display, mt-18 같은 유틸리티가 생김. globals.css엔 @tailwind base/components/utilities.

### v4 방식 (globals.css의 @theme) — 현재
★ v4는 tailwind.config.js를 없애고 CSS 안 @theme 디렉티브로 설정 이동:
```
/* globals.css */
@import "tailwindcss";
@theme {
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
}
```
→ 네임스페이스 접두어가 어떤 유틸리티를 만들지 결정: --color-* → bg-*/text-*, --font-* → font-*, --breakpoint-* → 반응형 변형.
→ 이 토큰들은 실제 CSS 변수도 되어 var(--color-primary)로 어디서든 참조 가능(디자인 시스템과 CSS가 같은 소스).

### 전역 커스텀에서 자주 하는 것
- @layer base: 전역 기본 스타일(body 폰트, 기본 색). @layer base { body { @apply bg-white text-gray-900; } }
- @layer components: 반복되는 컴포넌트 클래스. @layer components { .btn-primary { @apply px-4 py-2 rounded bg-primary text-white; } }
- 다크모드: :root와 [data-theme=\"dark\"]에 변수 정의 → @theme가 그 변수 참조 → 속성 하나 바꾸면 전체 전환(JS 클래스 스왑 없이).
- 폰트: next/font로 로드한 폰트를 CSS 변수로 → @theme의 --font-sans에 연결.
- 커스텀 유틸: @layer utilities로 없는 유틸리티 추가.

### 커스텀 흐름 요약
v3: tailwind.config.js의 theme.extend에 토큰 추가 → 유틸리티 생성.
v4: globals.css의 @theme에 CSS 변수로 토큰 정의 → 유틸리티 생성 + CSS 변수로도 사용.
공통: content(스캔 대상)는 v4에서 자동 감지. 반복 조합은 @layer components + @apply로 묶기(남용은 자제).

## 4. 면접 답변 (안 써본 SCSS, 써본 것 구분)
- "SCSS 써봤어요?" → "직접은 안 써봤지만 개념은 압니다. CSS에 변수·중첩·mixin·모듈화를 더한 상위 언어로, 유지보수하기 좋게 확장한 거죠. 예전 프로젝트가 Handlebars 템플릿 + 전역 SCSS 방식이었던 걸로 기억합니다." (정직 + 개념 + 경험 연결)
- "Tailwind 커스텀 어떻게?" → "전역 CSS에서 디자인 토큰을 정의해 씁니다. v3는 tailwind.config의 theme.extend, v4는 globals.css의 @theme에 CSS 변수로 색·폰트·간격을 추가하고, 반복되는 조합은 @layer components에 @apply로 묶습니다. 다크모드는 CSS 변수를 data-theme으로 바꿔 처리합니다."
- "Handlebars랑 React 차이?" → "Handlebars는 서버가 템플릿에 값을 꽂아 HTML을 만들어 보내는 전통적 방식이고, React는 클라이언트가 상태로 컴포넌트를 렌더합니다. 전자는 전역 CSS+클래스, 후자는 컴포넌트 스코프 스타일이 자연스럽죠."

## 핵심 요약
SCSS=CSS+변수·중첩·mixin·모듈화(상위 언어, 컴파일하면 CSS). Handlebars=서버가 템플릿에 데이터를 꽂아 HTML 문자열을 만드는 전통적 템플릿 엔진(logic-less, partial·helper), 보통 전역 SCSS+클래스로 스타일. Tailwind 커스텀은 디자인 토큰을 v3는 tailwind.config theme.extend, v4는 globals.css @theme에 CSS 변수로 정의해 유틸리티를 생성하고, 반복은 @layer components+@apply, 다크모드는 CSS 변수 전환으로.
