# [문서] DTO 설계 — 엔티티·Zod·Enum 일관 규칙 (Nest·Next)
> "DTO 필수인가? 규칙은? 엔티티/Zod/Enum과 관계는? 유려하게 어떻게?"에 대한 정리.
> 핵심: 각 관심사의 진실을 한 곳에 두고 나머지는 파생.

---

## 1. DTO는 필수인가? — "아마도"의 정체
결론: 문법적으론 필수 아니지만 실무에선 사실상 필수. 단 "모든 곳"은 아님.
DTO(Data Transfer Object) = 계층·경계를 넘나드는 데이터의 형태 정의. 필요 이유:
- 입력 검증의 자리: 외부 입력(신뢰 불가)이 들어오는 경계에서 형태·타입 강제.
- 엔티티 보호: DB 엔티티 그대로 노출하면 내부 구조 새고, 원치 않는 필드까지 받거나 반환.
- 명시적 계약: "이 API는 이런 형태를 받고 준다"를 코드로 문서화.
생략 가능: 단순 조회(파라미터 1개), 경계 안 넘는 내부 함수. 하지만 외부 입력·응답 지점엔 거의 항상 둠.

## 2. 일관된 규칙 — 방향별로 나눈다
- 요청 DTO(Request/Input): 외부→우리. 검증 목적. 동작별로: Create{E}Dto, Update{E}Dto, SignInDto.
- 응답 DTO(Response/Output): 우리→외부. 노출 제어 목적. {E}ResponseDto — 엔티티에서 민감 필드 제거.
네이밍 관례:
- Create{Entity}Dto — 생성(모든 필수 필드)
- Update{Entity}Dto — 수정(대부분 optional, 파생)
- {Entity}ResponseDto — 응답(노출할 필드만)
- {Entity}QueryDto — 목록 필터·페이지네이션
★ DRY: Update는 Create의 부분집합인 경우 많음 → 파생. Nest는 PartialType(CreateDto), Zod는 .partial(). 중복 정의 피하고 한 소스에서.

## 3. 엔티티와의 관계 — 절대 섞지 마라
DTO ≠ 엔티티. 목적이 다름:
- 엔티티: DB 테이블 매핑(저장 형태). ORM 소유. 모든 컬럼·관계·내부 필드.
- DTO: 경계 넘는 데이터 형태. 앱 계층. 필요한 것만.
왜 분리:
- 엔티티를 요청에 쓰면 → 사용자가 isAdmin:true 주입 가능(Mass Assignment 취약점).
- 엔티티를 응답에 쓰면 → password·내부 플래그 노출.
- 엔티티 구조 바뀌면 → API 계약이 의도치 않게 바뀜.
흐름: 요청 DTO(검증) → 서비스 → 엔티티(DB 저장) → 서비스 → 응답 DTO(노출 제어). 서비스가 DTO↔엔티티 변환. 경계=DTO, 내부·DB=엔티티.

## 4. Zod와의 관계 — "같은 자리, 다른 도구"
Zod는 DTO를 만드는 한 방법. 대체가 아니라 구현 수단.
- Nest(전통): 클래스 + 데코레이터(class-validator).
  class CreateUserDto { @IsEmail() email: string; @MinLength(8) password: string; }
- Zod(스키마 기반, Next/TS): 스키마가 곧 DTO + 타입.
  const s = z.object({ email: z.string().email(), password: z.string().min(8) });
  type CreateUserDto = z.infer<typeof s>;   // 타입 자동 파생
★ Zod 강점: 검증+타입이 한 소스(SSOT). z.infer로 스키마에서 타입 뽑으니 검증 규칙과 타입이 절대 안 어긋남.

## 5. Enum과의 관계 — 제한된 값의 SSOT
Enum = "정해진 값 중 하나". DTO에서 필드의 허용값 제한.
  enum OrderStatus { PENDING='PENDING', PAID='PAID', SHIPPED='SHIPPED' }
  // Nest: @IsEnum(OrderStatus) status: OrderStatus;
  // Zod: status: z.nativeEnum(OrderStatus)  // 또는 z.enum([...])
★ 일관성: Enum을 한 곳 정의, DTO·엔티티·DB(Prisma enum)가 모두 참조. Prisma 스키마에 enum 정의하면 타입까지 생성되니 그걸 SSOT로.

## 6. 유려한 구현 — Nest
```
export enum Role { USER='USER', ADMIN='ADMIN' }              // 1. Enum 한 곳

export class CreateUserDto {                                  // 2. 요청 DTO(class-validator)
  @IsEmail() email: string;
  @MinLength(8) password: string;
  @IsEnum(Role) @IsOptional() role?: Role;
}
export class UpdateUserDto extends PartialType(CreateUserDto) {}  // 3. Update 파생(DRY)

export class UserResponseDto {                               // 4. 응답 DTO(노출 제어)
  @Expose() id: string; @Expose() email: string;             // password 없음→자동 제외
}

@Post() create(@Body() dto: CreateUserDto) {                 // 5. ValidationPipe 자동 검증
  return this.service.create(dto);                           // 서비스가 DTO→엔티티
}
```
규칙: 전역 ValidationPipe(whitelist:true로 정의 안 된 필드 자동 제거→Mass Assignment 방지) / 요청은 동작별, Update는 PartialType / 응답은 @Expose·@Exclude로 노출 제어(인터셉터 자동 직렬화) / Enum은 한 곳, @IsEnum 참조.

## 7. 유려한 구현 — Next
```
import { Role } from '@prisma/client';                       // 1. Enum(Prisma가 SSOT)

// lib/validators.ts — 2. Zod 스키마 = DTO(한 곳)
export const createUserSchema = z.object({
  email: z.string().email(), password: z.string().min(8),
  role: z.nativeEnum(Role).optional(),
});
export const updateUserSchema = createUserSchema.partial();  // 파생(DRY)

export type CreateUserInput = z.infer<typeof createUserSchema>;  // 3. 타입 파생

'use server';                                                // 4. 서버 액션: 경계에서 parse
export async function createUser(data: unknown) {
  const parsed = createUserSchema.parse(data);               // 검증+타입 확정
  return prisma.user.create({ data: parsed });
}

const form = useForm({ resolver: zodResolver(createUserSchema) });  // 5. 클라 폼: 같은 스키마
```
규칙: Zod 스키마를 lib/validators.ts에 모아 DTO겸 타입 소스 / 타입은 z.infer 파생 / Update는 .partial() / 클라(zodResolver)+서버(parse) 같은 스키마 재사용 / Enum은 Prisma SSOT, z.nativeEnum 참조.

## 8. 전체 관통 원칙
```
Enum    → 한 곳 정의(Prisma/공용), 모두 참조
DTO     → 방향별(요청/응답)·동작별, Update는 파생
검증    → 경계에서(Nest: ValidationPipe / Next: parse·zodResolver)
엔티티  → DB 전용, DTO와 분리(서비스가 변환)
타입    → 스키마에서 파생(Zod z.infer, Nest는 클래스 자체)
```
★ 핵심 통찰: DTO·Zod·Enum·엔티티는 각자 다른 역할이지만, "각 관심사의 진실을 한 곳에 두고 나머지는 파생"시키면 유려해짐. Enum 한 곳, 검증 스키마 한 곳, 거기서 타입·Update DTO 파생 → 필드 하나 추가할 때 여러 곳 안 고쳐도 됨.

## 면접 한 문장
"DTO는 경계를 넘는 데이터 형태이자 검증 지점이라 외부 입력·응답엔 사실상 필수입니다. 엔티티와는 분리해 서비스가 변환하고(Mass Assignment·과다노출 방지), 요청/응답·동작별로 나누되 Update는 Create에서 파생합니다. Nest는 class-validator DTO+ValidationPipe, Next는 Zod 스키마를 DTO 겸 타입 소스로 써서 클라·서버가 재사용하고, Enum은 한 곳에 정의해 DTO·엔티티·DB가 모두 참조하게 합니다."
