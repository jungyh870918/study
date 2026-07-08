# [문서34] 프로젝트: 병원 결제 시스템 — Next.js 활용 정리
> 안과 수술 결제 플랫폼(메이페이안과). Next.js 15 App Router의 핵심 기능을 실제로 어떻게 썼나.
> 스택: Next 15 + React 19 + Prisma + Neon(PostgreSQL) + NextAuth v5 + 토스페이먼츠/Stripe/PayPal.
> ★ 실제 코드 기반. "Next로 무엇을 구현했나"를 기능별로 정리.

---

## 핵심 한 줄
"Next.js 15 App Router로 결제 플랫폼을 풀스택 단일 코드베이스로 구현. 서버 컴포넌트로 데이터를 직접 조회하고, 서버 액션으로 폼 변경을 처리하며, Route Handler로 결제·웹훅·SMS 외부 연동을 붙이고, 라우트 그룹으로 인증/쇼핑/관리자/유저 영역을 나눴다. 미들웨어(NextAuth)로 접근을 제어한다."

## 1. App Router 라우트 그룹 — 영역 분리
괄호 라우트 그룹으로 URL에 안 나타나는 논리적 구획:
- (auth): 로그인/회원가입. 자체 layout.tsx(인증 전용 레이아웃).
- (root): 메인 쇼핑·결제 플로우(상품→장바구니→환자정보→결제수단→주문→결제→영수증).
- admin: 관리자(주문/상품/유저/통계). 자체 layout+main-nav.
- user: 사용자 마이페이지(주문 내역/프로필).
★ 왜: 영역마다 레이아웃·권한이 달라서. 그룹 layout으로 공통 UI를 묶고, URL은 깔끔하게 유지.

## 2. 서버 컴포넌트 — 데이터를 직접 조회
App Router 기본이 서버 컴포넌트. 페이지(page.tsx)가 async 함수로 서버에서 직접 DB 조회:
- place-order/page.tsx: await auth()로 세션, await getMyCart()로 장바구니를 서버에서 조회 후 렌더.
- 클라이언트 상호작용 부분만 별도 파일로 분리(place-order-form.tsx에 'use client').
★ 패턴: 서버 컴포넌트(page)가 데이터 fetch+초기 렌더 → 인터랙션은 클라이언트 컴포넌트(form)로 위임. 'use client' 43개 파일 vs 서버 컴포넌트 기본. 경계를 명확히 나눔.

## 3. 서버 액션('use server') — 폼·변경 처리
lib/actions/*.ts 6개 파일이 'use server'. 클라이언트에서 직접 호출하되 서버에서 실행:
- order.actions.ts: createOrder(주문 생성), updateOrderChartNumber(차트번호 갱신).
- cart/product/user/payments/refund/review.actions.ts: 각 도메인 변경.
★ 장점: API 라우트를 따로 안 만들고 함수 호출처럼 서버 로직 실행. revalidatePath로 캐시 무효화(변경 후 화면 갱신). auth()로 서버에서 인증 확인.
예: createOrder는 세션 확인→장바구니 조회→주문 생성→redirectTo 반환→클라가 router.push.

## 4. Route Handler(app/api/*) — 외부 연동 전용
서버 액션으로 안 되는 것(외부에서 호출, 웹훅)만 API 라우트로:
- api/payments/confirm: 토스 결제 승인(paymentKey+금액 재검증).
- api/payments/refund: 환불.
- api/payments/save-finished: 완료 결제 저장.
- api/webhooks/stripe: Stripe 웹훅 수신(외부→우리).
- api/notifications/sms: 문자 발송.
- api/auth/[...nextauth]: NextAuth 캐치올 라우트.
- api/uploadthing: 파일 업로드.
★ 기준: 우리 앱 내부 폼 처리=서버 액션, 외부에서 들어오는 것(웹훅)·외부로 나가는 것(SMS)=Route Handler. 경계가 명확.

## 5. 동적 라우트
- (root)/order/[id]: 주문 상세(주문별 페이지).
- (root)/product/[slug]: 상품 상세(slug 기반, SEO 친화).
- admin/products/[id], admin/users/[id]: 관리자 수정 페이지.
- api/auth/[...nextauth]: 캐치올(...)로 NextAuth의 모든 인증 경로 처리.
★ [slug]는 SEO용 읽기 좋은 URL, [id]는 식별자, [...nextauth]는 여러 경로를 하나로.

## 6. 미들웨어(NextAuth v5) — 접근 제어
middleware.ts에서 NextAuth의 auth를 미들웨어로 export:
  export const { auth: middleware } = NextAuth(authConfig)
★ 모든 요청 전에 실행돼 인증/권한 확인. 로그인 필요 페이지, 관리자 전용(admin/*) 등을 라우트 단에서 보호. auth-guard.ts로 추가 가드.

## 7. 메타데이터 & SEO
- layout.tsx: Metadata 타입으로 title 템플릿(`%s | 메이페이안과`), description, metadataBase 설정.
- 각 페이지가 자기 title을 export → 템플릿에 끼워짐.
- next/font(Inter)로 폰트 최적화, Pretendard는 CDN. next/image로 이미지 최적화.
★ App Router의 메타데이터 API로 페이지별 SEO를 서버에서 처리(CSR의 SEO 약점 해결).

## 8. 결제 3종 통합 (Next 위에서)
- 토스페이먼츠(SDK): 국내 결제. 요청-승인 2단계, api/payments/confirm에서 백엔드 승인.
- Stripe: 해외 카드. 웹훅(api/webhooks/stripe)으로 결과 수신.
- PayPal(react-paypal-js): 해외. lib/paypal.ts.
- PaymentSwitcher 컴포넌트가 결제수단에 따라 분기 렌더(order-details-table에서).
★ Next Route Handler가 각 PG의 승인·웹훅 엔드포인트 역할. 결제수단 선택은 payment-method-form(RadioGroup).

## 9. 결제 플로우 (단계별 페이지 = App Router 라우팅)
상품 → 장바구니(cart) → 환자정보(patient-information) → 결제수단(payment-method) → 주문확인(place-order, 차트번호 입력) → 주문상세/결제(order/[id]) → 성공/실패(payments/success·fail).
- CheckoutSteps 컴포넌트로 진행 바 표시.
- place-order-form: 차트번호 입력 모달+useTransition으로 pending 처리, createOrder 후 router.push.
★ 각 단계가 독립 라우트라 뒤로가기·북마크·새로고침에 안전. 서버 액션이 단계 간 상태(주문)를 DB에.

## 10. 기타 Next 생태계 활용
- Prisma + @prisma/adapter-neon: Neon 서버리스 PostgreSQL. ws로 서버리스 커넥션.
- NextAuth v5(@auth/prisma-adapter): 세션·계정을 Prisma로. Account/Session/VerificationToken 모델.
- react-hook-form + zod(@hookform/resolvers): 폼 검증. validators.ts에 zod 스키마.
- Radix UI + Tailwind: 접근성 있는 UI 프리미티브+스타일. shadcn 스타일 components/ui.
- react-email + resend: 구매 영수증 이메일(email/purchase-receipt.tsx).
- uploadthing: 상품 이미지 업로드.
- recharts: 관리자 통계 차트(admin/overview/charts).
- vaul(Drawer), embla-carousel, framer-motion: 모바일 UI·캐러셀·애니메이션.
- lib/encrypt.ts: 민감정보 암호화.

## 11. Prisma 데이터 모델 (10종)
Product, User, Account, Session, VerificationToken, Cart, Order, OrderItem, FinishedPayment, Review.
★ Account/Session/VerificationToken은 NextAuth 표준. FinishedPayment로 완료 결제를 별도 기록(감사). Cart→Order→OrderItem 흐름.

## 면접 포인트 (이 프로젝트로 말할 것)
1. "Next 풀스택": 프론트+백엔드를 한 코드베이스로. 서버 컴포넌트(조회)+서버 액션(변경)+Route Handler(외부 연동) 3층을 용도별로 구분해 씀.
2. "서버/클라 경계 설계": page는 서버 컴포넌트로 데이터 조회, 인터랙션만 'use client'로 분리. 43개 클라 컴포넌트 vs 서버 기본.
3. "결제 3종 통합": 토스(국내)/Stripe·PayPal(해외)를 Route Handler로 각 PG 승인·웹훅 처리. 토스는 요청-승인 2단계로 백엔드 재검증.
4. "라우트 그룹으로 영역 분리": auth/root/admin/user를 그룹 레이아웃+미들웨어로 권한·UI 구획.
5. "단계별 결제 플로우를 독립 라우트로": 각 단계가 URL이라 새로고침·뒤로가기 안전, 서버 액션이 상태를 DB에.

## 핵심 요약
Next 15 App Router 풀스택 결제 플랫폼. 서버 컴포넌트(조회)+서버 액션(변경)+Route Handler(외부 연동) 3층 구분. 라우트 그룹으로 auth/root/admin/user 분리, 미들웨어(NextAuth)로 접근 제어. 결제 3종(토스/Stripe/PayPal)을 Route Handler로 통합, 결제 플로우를 단계별 독립 라우트로. Prisma+Neon 서버리스 DB, 메타데이터 API로 SEO.

---

## 12. 서버에서 외부 API 호출 — 두 방식 (실제 호출 경로 정정) ★
질문: "use server에서 API 호출 대표 예시 / api 폴더 따로 안 만들고 구현한 부분"
★ 정정: 이 프로젝트는 두 방식을 다 쓴다. 어느 쪽이냐는 "호출 경로"로 갈린다.

### 방식 A — Route Handler 경유 (토스 결제 승인, confirmPayment)
실제 호출 사슬:
```
클라(payments/success/page.tsx)  → fetch('/api/payments/confirm')
  → Route Handler(app/api/payments/confirm/route.ts)  → confirmPayment(body)
    → lib/api/toss/confirm-payment.ts  → fetch('https://api.tosspayments.com/.../confirm')  [외부]
```
즉 confirmPayment는 "서버 액션"이 아니라 Route Handler에서 호출된다. 클라가 우리 /api/payments/confirm을 fetch하고, 그 안에서 confirmPayment(서버 전용 함수)가 토스 API를 부름.
```typescript
// app/api/payments/confirm/route.ts — Route Handler
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await confirmPayment(body);   // 서버 전용 함수 호출
  return NextResponse.json(result);
}
// lib/api/toss/confirm-payment.ts — 서버 전용 함수(외부 API fetch)
const secretKey = process.env.TOSS_WIDGET_SECRET_KEY;  // 서버에서만(NEXT_PUBLIC_ 아님)
export async function confirmPayment({paymentKey, orderId, amount}) {
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method:'POST', headers:{Authorization:`Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`},
    body: JSON.stringify({paymentKey, orderId, amount})  // 금액 재검증
  });
  ...
}
```
왜 Route Handler? 결제 성공 페이지가 클라이언트 컴포넌트라 우리 API URL(/api/payments/confirm)에 fetch. (주석에 원래 서버 액션으로 하려던 흔적도 있음 → 방식 전환의 흔적)

### 방식 B — 서버 액션에서 외부 API 직접 (환불·PayPal) ← 이게 "api 폴더 없이"
lib/actions/*.ts('use server')에서 외부 API를 직접 fetch. Route Handler(app/api) 안 거침:
```typescript
// lib/actions/refund.actions.ts ('use server') — 환불
const res = await fetch(
  `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,  // 외부 API 직접
  { method:'POST', headers:{Authorization:`Basic ...`}, body: JSON.stringify({cancelReason}) }
);
revalidatePath('/history');   // 캐시 무효화까지 한 번에

// lib/actions/order.actions.ts ('use server') — PayPal 주문 생성
export async function createPayPalOrder(orderId) {
  const paypalOrder = await paypal.createOrder(...);  // lib/paypal.ts가 외부 API fetch
  // → prisma로 order에 paypal id 저장
}
```
★ 이게 진짜 "api 폴더 없이 서버에서 외부 API 호출". 클라가 이 서버 액션을 함수처럼 부르면 서버에서 실행되고, 그 안에서 외부 API+DB+revalidatePath까지.

### 정리 — 언제 무엇을 (이 프로젝트 실제 기준)
- 서버 액션 직접 fetch: 환불(refund.actions), PayPal(order.actions). 클라가 액션을 함수처럼 호출→서버에서 외부 API+DB.
- Route Handler 경유: 토스 confirm(클라 success 페이지가 우리 API URL에 fetch), Stripe 웹훅(외부가 우리를 호출), SMS, NextAuth.
- 갈리는 기준: 외부가 우리를 부르거나(웹훅) 클라가 명시적 URL로 부르면 Route Handler / 내부 흐름에서 함수처럼 부르면 서버 액션. 시크릿 키는 어느 쪽이든 서버 전용 환경변수라 노출 안 됨.
- ★ 면접 정직 포인트: "confirmPayment는 Route Handler에서 부르고, 환불·PayPal은 서버 액션에서 직접 부른다. 한 프로젝트 안에 두 방식이 섞여 있고, 토스 confirm은 원래 서버 액션으로 하려다 Route Handler로 바꾼 흔적이 있다"고 정확히 말할 수 있는 게 강점.

## 13. Next 고유 기능 (기존 React와 다른 것들) ★
질문: "router push처럼 Next에서 변형되어 쓰는 고유 기능, 이미지 로딩 태그 등"

### next/navigation (라우팅 — React Router 대체)
- useRouter: router.push('/order/123')로 프로그래밍 방식 이동(실제 코드: createOrder 후 router.push(res.redirectTo)).
- redirect('/unauthorized'): 서버 컴포넌트·서버 액션에서 서버 사이드 리다이렉트(React엔 없음).
- usePathname: 현재 경로(admin/main-nav에서 활성 탭 표시).
- useSearchParams: 쿼리스트링 읽기(검색 페이지).
- notFound(): 404 페이지 강제 트리거(상품 없으면).
★ React는 react-router-dom을 따로 깔지만 Next는 next/navigation 내장. redirect·notFound는 Next만의 서버 사이드 기능.

### next/image (이미지 최적화) — <img> 대신 <Image>
```tsx
import Image from 'next/image';
<Image src={item.image} alt={item.name} width={50} height={50} />
```
★ 자동 최적화: WebP 변환, 크기별 리사이징, lazy loading(뷰포트 들어올 때 로드), 레이아웃 시프트 방지(width/height 필수). 일반 <img>보다 성능↑. 실제로 place-order/history 등에서 사용.

### next/link (클라이언트 네비게이션) — <a> 대신 <Link>
```tsx
import Link from 'next/link';
<Link href="/cart">장바구니</Link>
```
★ 페이지 전체 리로드 없이 클라이언트 사이드 전환(prefetch까지). 29개 파일에서 사용. 일반 <a>는 전체 새로고침.

### next/font (폰트 최적화)
```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
```
★ 폰트를 빌드 타임에 self-host → 외부 요청 없이 로드, 레이아웃 시프트 방지. layout.tsx에서.

### revalidatePath (캐시 무효화) — Next 고유
```tsx
import { revalidatePath } from 'next/cache';
revalidatePath(`/order/${orderId}`);  // 이 경로 캐시를 무효화 → 다음 요청 시 새 데이터
```
★ 서버 액션으로 데이터 바꾼 뒤 호출 → 해당 페이지가 최신 데이터로 다시 렌더. 실제로 주문/환불/유저 수정 후 사용(refund→/history, order→/order/[id]). React엔 없는 서버 캐시 개념.

### 메타데이터 API — Next 고유
- export const metadata / generateMetadata로 페이지별 <head>·SEO를 서버에서. (문서34 7번)

## 14. Zod (스키마 검증 라이브러리) ★
질문: zod 간략 설명
정의: TypeScript용 스키마 선언·검증 라이브러리. "데이터가 이 형태여야 한다"를 코드로 선언하고, 런타임에 검증+타입 추론.
```typescript
import { z } from 'zod';
export const signInFormSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
});
```
왜 쓰나:
- 런타임 검증: TypeScript 타입은 컴파일 때만 존재→런타임엔 사라짐. zod는 실제 들어온 데이터를 런타임에 검사(외부 입력은 못 믿으니).
- 타입 자동 추론: z.infer<typeof schema>로 스키마에서 TS 타입 생성 → 검증과 타입이 한 소스(SSOT).
- 에러 메시지 내장: 각 필드에 한글 메시지.
★ 이 프로젝트에서 zod가 양쪽에서:
- 클라이언트 폼: react-hook-form + zodResolver(updateUserSchema)로 입력 즉시 검증(profile-form, update-user-form).
- 서버 액션: schema.parse(data)로 서버에서 재검증(cart/order/product/review/user.actions). 위반 시 throw.
- ★ "클라에서 검증하고 서버에서 또 검증" — 클라 검증은 UX(빠른 피드백), 서버 검증은 보안(클라 우회 가능하니). 같은 zod 스키마를 양쪽에서 재사용.
연결: 앞서 NestJS의 DTO+ValidationPipe와 같은 역할(문서28). Nest는 class-validator, Next/TS 생태계는 zod. "경계에서 입력 검증"이라는 원칙은 동일.

## 확장 요약 (12~14)
- 서버 액션/서버 함수에서 fetch로 외부 API 직접 호출→api 폴더 불필요. 시크릿 키는 서버 전용 환경변수로 노출 방지. 내부 흐름=서버 액션, 외부→우리=Route Handler.
- Next 고유: useRouter/redirect/notFound(next/navigation), <Image>(최적화), <Link>(클라 네비), next/font, revalidatePath(캐시 무효화), 메타데이터 API.
- zod: 런타임 스키마 검증+타입 추론. 클라(zodResolver)+서버(parse) 양쪽 재사용. "경계 검증" 원칙(NestJS DTO와 같은 역할).

---

## 15. 서버 액션 심화 — 호출 위치·본질·Route Handler와의 차이 ★
질문에서 자주 헷갈리는 3가지 정리.

### 호출 위치 — 클라/서버 양쪽 다 (오해 주의)
- ★ 실행 위치와 호출 위치는 별개다. 실행은 항상 서버(고정), 호출은 클라이언트 컴포넌트·서버 컴포넌트 둘 다 가능.
- 오히려 클라이언트 컴포넌트('use client')에서 호출이 흔하다: 폼 제출·버튼 클릭 같은 상호작용(onClick/onSubmit)은 클라에서만 가능→그 안에서 서버 액션 호출.
  'use client'; const res = await createOrder(data); router.push(res.redirectTo);  // 클라에서 서버 액션 호출
- 서버 컴포넌트에선 주로 <form action={createOrder}>로 연결(JS 없이 동작, 프로그레시브 인핸스먼트).
- ★ "서버에서 실행"이 "서버 컴포넌트에서 호출"이란 뜻이 아니다. 클라에서 불러도 몸통은 서버에서 돎.
- 구분: 조회(읽기)=서버 컴포넌트가 렌더하며 직접(서버 액션 아님) / 변경(쓰기)=서버 액션, 주로 클라 상호작용에서 호출.

### 본질 — 결국 HTTP 요청
- 겉보기엔 함수 호출이지만 내부적으로 Next가 자동 생성한 엔드포인트로 POST 요청을 보낸다. 네트워크 탭에 실제 POST가 찍힘.
- 즉 주소가 외부로 노출 안 될 뿐, 본질은 Route Handler(api 폴더 REST 라우터)와 같은 클라이언트-서버 HTTP 통신. URL을 우리가 직접 명명하지 않고 액션 ID로 자동 생성될 뿐.

### Route Handler와 실제로 다른 점 (동작은 같아도)
- 보일러플레이트: 서버 액션=함수 만들고 import해 호출(자동). Route Handler=route.ts 작성+URL 정의+fetch+JSON 직렬화/파싱 수동.
- 타입: 서버 액션=함수 직접 import라 인자·반환 타입 자동 연결(타입 안전). Route Handler=네트워크 건너며 타입 끊김→수동으로 맞춤.
- 폼 통합: 서버 액션=useFormStatus/useActionState로 pending 자동, <form action> 직접 연결. 
- URL 노출: 서버 액션=명시적 URL 없음→우리 앱 내부만 호출. Route Handler=공개 URL→외부(웹훅·서드파티)도 호출 가능.
표 요약:
| | Server Action | Route Handler |
| 본질 | HTTP 요청(같음) | HTTP 요청(같음) |
| URL | 자동·숨김 | 명시적·공개 |
| 호출 주체 | 내부만 | 외부도 가능 |
| 개발 | import, 보일러플레이트 없음 | 엔드포인트 수동 |
| 타입 | 자동 연결 | 수동 |
| 적합 | 내부 폼·CRUD | 웹훅·공개 API |
★ 선택 기준: 내부 변경=Server Action(편의·타입), 외부가 호출=Route Handler(공개 URL·제어). 이 프로젝트가 토스 confirm=클라가 URL로 부르니 Route Handler, 환불·PayPal=내부 흐름이니 서버 액션으로 가른 이유.
면접 한 문장: "서버 액션도 내부적으론 자동 생성 엔드포인트로 가는 POST라 본질은 Route Handler와 같은 HTTP 통신이다. 다만 URL이 숨겨져 내부 전용이고, 함수를 직접 import하니 보일러플레이트 없이 타입이 자동 연결된다. 그래서 내부 폼·CRUD는 서버 액션, 웹훅처럼 외부가 부르는 건 Route Handler로 구분한다."
