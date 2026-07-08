# [문서48] Prisma — 셋업·스키마·쿼리 기본 (ORM 실무)
> Next.js에서 Prisma를 쓸 때 알아야 할 것 정리. 라이브러리 일반 동작(문법·명령어) + 자주 쓰는 쿼리 케이스 + 내부 처리 멘션 결합.
> ★ 집중 환기용 원자료.

---

## 1. 셋업 순서 한 줄 지도
```
schema.prisma 작성  →  migrate  →  generate  →  PrismaClient 인스턴스 생성  →  쿼리
```
- migrate와 generate는 완전히 다른 대상을 건드린다(아래 3번).
- `migrate dev`는 내부적으로 generate를 포함하므로 개발 중엔 보통 migrate만 신경 쓰면 됨.

## 2. 기본 파일 셋업 (Next 기준)
```bash
npm i prisma -D
npm i @prisma/client
npx prisma init          # prisma/schema.prisma + .env 생성
# .env 에 DATABASE_URL 채우기
npx prisma migrate dev --name init
```
```
# .env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```
클라이언트 인스턴스(싱글톤) — Next 개발 모드 hot reload에서 연결이 계속 새로 생기는 걸 막는다.
```ts
// db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient().$extends({
    result: {
      product: {
        price:  { compute: (p) => p.price.toString() },
        rating: { compute: (p) => p.rating.toString() },
        discountPrice: { compute: (p) => (p.discountPrice ? Number(p.discountPrice) : null) },
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## 3. migrate vs generate — 무엇이 다른가 (핵심)
둘은 서로 다른 대상을 만든다.
- `prisma migrate` — **DB 스키마**를 바꾼다. 스키마 파일의 변경을 실제 테이블 구조로 반영하고 `prisma/migrations/`에 SQL 기록을 남김.
  - `migrate dev --name xxx`: 개발용. 마이그레이션 파일 생성 + DB 적용 + generate까지 자동.
  - `migrate deploy`: 배포용. 이미 만든 마이그레이션 파일을 프로덕션 DB에 적용만(새로 안 만듦).
  - `migrate reset`: DB 날리고 처음부터.
- `prisma generate` — **DB를 안 건드린다.** 스키마를 읽어 `node_modules/@prisma/client`에 타입 붙은 클라이언트 코드를 생성. 이게 있어야 `prisma.product.findMany()` 자동완성·타입이 나옴.
  - 스키마 필드만 바꾸고 DB 구조 변경이 필요 없을 때, 또는 `npm install` 직후 클라이언트 재생성이 필요할 때 단독으로.
  - `db push`(마이그레이션 파일 없이 스키마를 DB에 바로 밀어넣기, 프로토타이핑용)와 헷갈리지 말 것.
★ 한 줄: **migrate는 데이터베이스를, generate는 타입스크립트 클라이언트 코드를 만든다.** generate를 따로 부르는 건 CI/빌드 단계나 클라이언트만 갱신할 때.

## 4. 스키마 정의 문법
```prisma
generator client { provider = "prisma-client-js" }
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  price         Decimal  @db.Decimal(12, 2)
  discountPrice Decimal? @db.Decimal(12, 2)   // ? = nullable
  rating        Decimal  @db.Decimal(3, 2) @default(0)
  subcategories Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])
}

model Category {
  id       String    @id @default(uuid())
  name     String
  products Product[]   // 1:N 관계의 반대편
}
```
자주 쓰는 문법: `@id`, `@default()`, `@unique`, `@relation`, `?`(nullable), `[]`(리스트/관계), `@db.타입`(DB 네이티브 타입), 모델 레벨 `@@index([...])`·`@@unique([...])`.

## 5. 기본 CRUD
```ts
// CREATE
await prisma.product.create({ data: { name, slug, price } });
await prisma.product.createMany({ data: [ {...}, {...} ] });

// READ
await prisma.product.findUnique({ where: { id } });   // @id/@unique 필드로만
await prisma.product.findFirst({ where: { slug } });    // 비고유 조건 첫 행
await prisma.product.findMany({ where: { rating: { gte: 4 } } });

// UPDATE
await prisma.product.update({ where: { id }, data: { price } });
await prisma.product.updateMany({ where: { categoryId }, data: { discount: 10 } });

// UPSERT (있으면 update, 없으면 create)
await prisma.product.upsert({ where: { slug }, update: { price }, create: { name, slug, price } });

// DELETE
await prisma.product.delete({ where: { id } });
await prisma.product.deleteMany({ where: { rating: { lt: 1 } } });
```
`findUnique` vs `findFirst`: findUnique는 `@id`/`@unique` 필드로만 조회 가능하고 내부 최적화가 더 걸림. 비고유 조건이면 findFirst.

## 6. where — 필터 연산자
```ts
await prisma.product.findMany({
  where: {
    price: { gte: 10, lte: 100 },                     // >=, <= (gt/lt/equals/not)
    rating: { in: [4, 5] },                           // IN, notIn
    name: { contains: '셔츠', mode: 'insensitive' },   // LIKE, 대소문자 무시
    slug: { startsWith: 'sale-' },                    // endsWith
    discountPrice: { not: null },
    AND: [{ price: { gt: 10 } }, { rating: { gte: 4 } }],
    OR:  [{ categoryId: 'a' }, { categoryId: 'b' }],
    NOT: { name: { contains: '단종' } },
  },
});
```

## 7. 정렬·페이지네이션·부분선택
```ts
await prisma.product.findMany({
  where: { categoryId },
  orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],  // 다중 정렬
  skip: (page - 1) * PAGE_SIZE,                          // offset
  take: PAGE_SIZE,
  select: { id: true, name: true, price: true },         // 필요한 컬럼만
});
```
- `select`(이것만) vs `include`(관계 추가로) — 동시 사용 불가.
- 커서 페이지네이션(대용량에 유리, offset보다 성능 좋음):
```ts
await prisma.product.findMany({ take: 20, skip: 1, cursor: { id: lastId }, orderBy: { id: 'asc' } });
```

## 8. 조인(관계 조회) — include / select
Prisma엔 SQL의 `JOIN` 키워드가 없다. 관계 필드를 include/select로 가져오면 처리됨.
★ (내부 처리 멘션) 기본은 **관계마다 별도 쿼리 후 앱에서 병합**. `relationLoadStrategy: "join"` 지정 시 DB 단일 LATERAL JOIN 한 방으로 전환(Postgres).
```ts
// 부모 → 자식 (1:N)
await prisma.category.findUnique({
  where: { id },
  include: { products: { where: { rating: { gte: 4 } }, orderBy: { price: 'asc' }, take: 5 } },
});

// 자식 → 부모 (N:1)
await prisma.product.findMany({
  select: { name: true, price: true, category: { select: { name: true } } },
});

// 관계 조건으로 필터 (조인 없이 WHERE에만 관계 사용)
await prisma.product.findMany({
  where: {
    category: { name: 'Shirts' },        // N:1: 부모 조건
    // reviews: { some: { rating: 5 } },  // 1:N: some / every / none
  },
});

// 관계 개수만
await prisma.category.findMany({ include: { _count: { select: { products: true } } } });
```
관계 쓰기(연결/생성):
```ts
await prisma.product.create({ data: { name, price, category: { connect: { id: categoryId } } } });
await prisma.product.create({ data: { name, price, category: { create: { name: 'New Cat' } } } });
// data: { category: { disconnect: true } }  // 연결 해제
```

## 9. 집계 — aggregate / groupBy / count
```ts
// 전체 집계
await prisma.product.aggregate({
  where: { categoryId },
  _count: true, _avg: { rating: true }, _sum: { price: true }, _min: { price: true }, _max: { price: true },
});

// 그룹별 집계 (SQL GROUP BY)
await prisma.product.groupBy({
  by: ['categoryId'],
  where: { rating: { gte: 3 } },                 // WHERE (그룹 전)
  _count: { _all: true }, _avg: { price: true },
  having: { price: { _avg: { gt: 50 } } },        // HAVING (그룹 후)
  orderBy: { _count: { categoryId: 'desc' } },
});

await prisma.product.count({ where: { categoryId } });
await prisma.product.findMany({ distinct: ['categoryId'] });  // 중복 제거
```

## 10. 트랜잭션 & 원자 연산
```ts
// 순차 배열 — 모두 성공 or 모두 롤백
await prisma.$transaction([
  prisma.product.update({ where: { id }, data: { stock: { decrement: 1 } } }),
  prisma.order.create({ data: { productId: id } }),
]);

// 인터랙티브 — 중간 로직/분기 가능, throw 시 자동 롤백
await prisma.$transaction(async (tx) => {
  const p = await tx.product.findUnique({ where: { id } });
  if (p.stock < 1) throw new Error('품절');
  await tx.product.update({ where: { id }, data: { stock: { decrement: 1 } } });
});
```
원자적 필드 연산:
```ts
data: { stock: { decrement: 1 }, views: { increment: 1 } }  // increment/multiply/divide/set
```
★ (내부 처리 멘션) `increment` 등은 DB에서 `SET stock = stock - 1`로 **원자적 처리** → race condition 회피. `stock: p.stock - 1`처럼 읽어온 값으로 계산하면 동시성 문제가 생기니 이 방식이 안전.

## 11. Raw 쿼리
```ts
await prisma.$queryRaw`SELECT * FROM "Product" WHERE price > ${min}`;
await prisma.$executeRaw`UPDATE "Product" SET stock = 0 WHERE id = ${id}`;
```
★ (내부 처리 멘션) 태그드 템플릿의 보간값은 **파라미터 바인딩**으로 처리되어 SQL 인젝션이 자동 방지됨. `$queryRawUnsafe`는 문자열 보간이라 위험 → 신뢰 가능한 입력에만.

## 12. 내부적으로 그렇게 처리되는 것들 (멘션 모음)
- 관계 로딩: include/select는 기본 **관계마다 별도 쿼리 후 앱에서 병합**. `relationLoadStrategy: "join"`이면 DB 단일 JOIN.
- `findUnique` 배칭: 같은 tick에 여러 findUnique가 나가면 자동으로 **하나의 `IN` 쿼리로 배칭** → N+1 완화.
- 원자 연산/트랜잭션: increment 등과 `$transaction`은 **DB 레벨에서 원자적** 실행.
- `$queryRaw` 태그드 템플릿: 보간값이 **파라미터 바인딩** → 인젝션 방지.

## 핵심 요약 (한 문단)
Prisma 셋업은 schema 작성 → migrate(DB 구조 변경, migrations 폴더에 SQL 기록) → generate(타입 붙은 클라이언트 코드 생성, DB 안 건드림) → 싱글톤 PrismaClient 인스턴스 순이며, migrate dev는 generate를 포함한다. 스키마는 model + `@id`/`@default`/`@unique`/`@relation`/`?`/`[]`/`@db.타입`으로 정의하고, 쿼리는 CRUD + where 연산자 + orderBy/skip/take + select/include로 구성한다. 조인 키워드는 없고 관계 필드를 include/select로 가져오면 기본은 별도 쿼리 병합(옵션으로 단일 JOIN), findUnique는 자동 IN 배칭으로 N+1을 완화한다. 집계는 aggregate/groupBy(having)/count, 동시성은 원자 연산(increment)과 $transaction으로 DB 레벨에서 안전하게, raw는 태그드 템플릿의 파라미터 바인딩으로 인젝션을 막는다.
