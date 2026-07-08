# [문서49] 병원결제 — Next 서버↔클라이언트 데이터 통신(직렬화)
> Server Component/Server Action이 데이터를 클라이언트로 넘기는 규칙 정리. 라이브러리 일반 동작(Next 직렬화) + 프로젝트 특유 처리(convertToPlainObject·formatError) 결합.
> ★ 집중 환기용 원자료.

---

## 1. 한 줄 지도
Next.js에서 데이터가 서버→클라이언트로 넘어가는 길목은 딱 2개(입력 검증·직렬화)이고, 각 경계에 단일 변환 지점을 두는 게 "막힘 없는 흐름"의 핵심.
- 입력(쓰기) 경계: 폼 문자열 → Zod로 재검증 → Prisma가 DB 타입으로 강제변환.
- 직렬화(읽기) 경계: DB의 클래스 인스턴스(Decimal 등) → plain object → 클라이언트로 전달.

```
[쓰기 WRITE]  UI → DB                  [읽기 READ]  DB → UI
────────────────────────              ────────────────────────
폼 입력 "12.50"(문자열)                 Prisma 쿼리 → Decimal(12.50)
   │ react-hook-form + zodResolver          │  ★ 직렬화 경계($extends 등)
   ▼   (같은 Zod 스키마 검증)                ▼  Decimal → string/number (plain화)
Server Action                          Server Component
   │ 같은 스키마로 재검증(parse)             │  props 전달
   ▼                                       ▼  ★ 직렬화 가능해야 통과
Prisma create/update                   Client Component 렌더
   │ (string → Decimal 자동 강제변환)
   ▼
Postgres (Decimal 저장)
```

## 2. "stringify 해서 넘겨주나?" — 반은 맞다 (검증됨)
개발자가 직접 `JSON.stringify`를 부르지 않는다. Next.js가 자동으로 직렬화한다.
- Server Component → Client Component (props): Next가 내부적으로 React Flight 포맷으로 자동 직렬화. 우리가 stringify 안 함. 단, 넘기는 값이 **직렬화 가능한 plain object**여야 하고 아니면 에러.
- Server Action 반환값: 이것도 Next가 자동 직렬화. 역시 plain object여야 함.
- 즉 "프로토콜"은 자동이고, 개발자 책임은 "넘기는 값을 plain하게 만드는 것" 하나로 좁혀진다.

## 3. 왜 막히나 — Decimal은 클래스라서
Next가 Server→Client로 넘길 수 있는 건 plain object뿐. Prisma의 `Decimal`은 클래스 인스턴스라 그대로 넘기면 `only plain objects can be passed to Client Components` 에러로 막힌다.
- 이 막힘을 뚫는 게 `$extends`(직렬화 경계). Decimal을 string/number로 바꿔 plain하게 만든다 → 이게 `db/prisma.ts`의 존재 이유.
- 함께 쓰는 이중 안전장치: `convertToPlainObject`.

```ts
// utils.ts — Decimal/Date 같은 클래스를 순수 객체로 눌러버리는 방어 장치
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
```
주의: `JSON.parse(JSON.stringify())`는 만능이 아니다. Date를 문자열로 바꾸고, undefined를 삭제한다. 그래서 이건 "프로토콜"이 아니라 보조 방어선일 뿐.
★ 어긋남의 씨앗: 같은 프로젝트에서 `getLatestProducts`는 convertToPlainObject를 쓰는데 `getProductBySlug`/`getProductById`는 손으로 subcategories·discountPrice를 변환. 같은 일을 서로 다른 방식으로 → 변환 창구를 하나로 통일해야 한다.

## 4. 에러 직렬화 — Error 객체는 그대로 못 넘긴다 (검증됨)
`Error`·`ZodError`·`PrismaClientKnownRequestError`는 전부 클래스 → 클라이언트로 곱게 안 넘어감. 그래서 사람이 읽을 문자열로 눌러서 반환한다.

```ts
try {
  // ...작업
  return { success: true, message: '완료되었습니다' };
} catch (error) {
  return { success: false, message: formatError(error) };  // ← 문자열로 직렬화
}
```
★ 핵심 패턴: Server Action은 예외를 밖으로 던지지 않고 `{ success, message }` 형태로 "정상 반환"한다. 클라이언트는 toast로 message를 띄우면 됨.
- 서버 로그엔 원본 에러를 남기고, 클라이언트엔 요약만(민감정보 노출 주의).
- `throw`는 route handler(`app/api`)에서 HTTP 상태코드와 함께 쓸 때만. UI가 부르는 Server Action은 던지지 말고 반환.

## 5. "금액을 문자로 직렬화" — 쉬운 설명
컴퓨터의 `number`(부동소수점)는 돈 계산에서 미세하게 틀린다.
```
0.1 + 0.2   // → 0.30000000000000004  ❌
19.99 * 3   // → 59.970000000000006   ❌
```
- 가격이 12000.50원인데 계산하다 12000.4999...가 되면 영수증 금액이 어긋남.
- 그래서 DB(Postgres)는 돈을 Decimal(정확한 10진수)로 저장. 하지만 JS엔 Decimal 타입이 없어서, 클라이언트로 넘기는 순간 부정확한 number로 바뀔 위험.
- 해법: `"12000.50"`처럼 **문자열로 넘긴다.** 문자열은 숫자 오차가 절대 안 생김. 계산이 필요할 때만 정확한 라이브러리(Prisma.Decimal)나 정수(원 단위)로 한다.
- 비유: 정밀한 측정값을 "대충 반올림되는 저울(number)"에 다시 얹지 않고, 종이에 적힌 숫자 그대로(string) 전달. 저울에 올리는 순간(=number 변환) 틀어지니까.
★ 그래서 "price는 string인데 discountPrice만 number라 위험"하다. 할인가만 오차 나는 저울에 올려둔 셈 → 둘 다 string으로 통일해야 한다.

## 6. 모범적인 응답 방식 (원칙)
"경계를 넘는 것은 항상 plain object, 결과는 항상 같은 모양(shape)."
- ① 성공/실패를 예외가 아니라 반환값으로. 고정된 결과 타입을 못박기.
```ts
type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; message: string };
```
- ② 직렬화 변환은 한 곳에서. 액션마다 convertToPlainObject/손변환/$extends가 뒤섞이지 않게, 읽기 경로는 $extends 하나로 통일 → `getProductById`의 손 `Number(discountPrice)`가 사라짐.
- ③ 에러는 formatError로 문자열화(이미 하고 있음). 서버 로그엔 원본, 클라이언트엔 요약.
- ④ throw는 route handler에서만, HTTP 상태코드와 함께.

## 7. 읽기 타입은 "저장형+직렬화"에서 파생
`z.infer<insertSchema> & { DB 필드 }`로 손으로 덧붙이는 방식은 동작하지만, rating·subcategories처럼 입력엔 없고 조회엔 있는 필드가 손 관리라 어긋나기 쉽다. 더 견고한 방식은 Prisma 생성 타입에서 Decimal만 치환:
```ts
import type { Product as PrismaProduct } from '@prisma/client';

// 저장형 타입에서 Decimal 필드만 직렬화형으로 치환 → $extends 결과와 정확히 일치
export type Product = Omit<PrismaProduct, 'price' | 'rating' | 'discountPrice'> & {
  price: string;
  rating: string;
  discountPrice: number | null;
};
```
→ 스키마에 필드를 추가하면 타입이 자동으로 따라오고, 손으로 `& {}` 관리하다 빠뜨리는 일이 없어진다.

## 8. 관심사별 진실 공급원(SSOT) 분리
핵심은 "하나가 전부를 생성"이 아니라, 관심사별로 진실 공급원을 나누되 경계에서 변환을 한 곳에 모으는 것.

| 관심사 | 진실 공급원 | 용도 |
|---|---|---|
| 저장 형태 | Prisma schema | DB 구조·마이그레이션 |
| 입력 검증 | Zod (insert/update*Schema) | 폼·Server Action 검증 |
| 읽기 형태(직렬화) | $extends 변환 규칙 | 클라이언트로 넘길 plain 타입 |

3가지 규칙: ① 돈은 한 표현(string)으로 통일, 계산은 Decimal/정수로. ② 변환은 무조건 $extends 한 곳에서만(액션·컴포넌트에 `.toString()`/`Number()`를 흩뿌리지 말 것, 새 Decimal 필드는 반드시 여기 규칙 추가). ③ 읽기 타입은 Zod가 아니라 Prisma 생성 타입에서 파생.

## 핵심 요약 (한 문단)
Next.js는 Server Component→Client Component props와 Server Action 반환값을 React Flight로 자동 직렬화하므로 개발자는 stringify를 직접 부르지 않는다. 대신 넘기는 값이 plain object여야 하는데, Prisma Decimal·Error 같은 클래스 인스턴스는 막히므로 읽기 경로는 $extends로 Decimal을 string/number로 눌러 plain화하고(보조로 convertToPlainObject), 에러는 formatError로 문자열화해 `{success, message}`로 정상 반환한다. 돈은 부동소수 오차를 피하려 string으로 직렬화하고 계산 시에만 Decimal/정수로 다룬다. 모범 형태는 고정된 ActionResult 타입 + 단일 변환 창구(입력=Zod, 직렬화=$extends) + 읽기 타입을 Prisma 생성 타입에서 파생.
