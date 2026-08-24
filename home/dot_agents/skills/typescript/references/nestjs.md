# NestJS and TypeScript

Companion to `SKILL.md`. NestJS is decorator-driven, which puts it at odds with a few of the general
rules. Where they conflict, this file wins for Nest code — the framework's idiom is what the next
maintainer will expect.

- [Compiler settings Nest requires](#compiler-settings-nest-requires)
- [DTOs and validation](#dtos-and-validation)
- [Zod instead of class-validator](#zod-instead-of-class-validator)
- [Providers and injection](#providers-and-injection)
- [Repositories](#repositories)
- [Typed configuration](#typed-configuration)
- [Errors and exception filters](#errors-and-exception-filters)
- [Guards and request typing](#guards-and-request-typing)
- [Response shaping](#response-shaping)

## Compiler settings Nest requires

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  }
}
```

Three consequences worth knowing before you touch a Nest `tsconfig.json`:

- **`emitDecoratorMetadata` means Nest code cannot run under a type-stripping runtime.** Node's built-in
  TypeScript support and `erasableSyntaxOnly` both reject constructor parameter properties and metadata
  emission. Nest needs `tsc` or SWC. Do not "modernize" this away.
- **`strictPropertyInitialization: false` is the framework's escape hatch**, usually needed for
  class-validator DTO fields. Prefer constructor parameter properties for dependencies — they are
  initialized, so they need neither the flag nor a `!`.
- **Decorator metadata reads the emitted type**, so a union or an interface type on a DTO field degrades to
  `Object`. That is why class-validator DTOs use classes and concrete types.

## DTOs and validation

```ts
import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
```

Wire the global pipe, and set all three options:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,             // strip properties with no decorator
    forbidNonWhitelisted: true,  // reject them instead, so a typo is an error not a silent drop
    transform: true,             // produce a real DTO instance, not a plain object
  }),
);
```

`whitelist: true` is the one that matters for security. Without it, extra body properties survive into
your service, and a `Object.assign(entity, dto)` becomes mass assignment — a client sets `role: "admin"`
and the validator never objected because it never looked.

`transform: true` is what makes `@Type(() => Number)` and DTO methods work. Without it you have a plain
object wearing a class type, which is exactly the lie the type system is supposed to prevent.

## Zod instead of class-validator

Prefer Zod on a new Nest service, unless the codebase already standardized on class-validator. One
schema gives you the runtime check and the type, with no decorator metadata and no `!` on every field.

```ts
export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  bio: z.string().optional(),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

```ts
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", details: result.error.flatten() });
    }
    return result.data;
  }
}

@Post()
create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto) { ... }
```

The tradeoff to accept knowingly: Swagger generation via `@nestjs/swagger` reads decorator metadata, so a
Zod DTO needs `nestjs-zod` or a hand-written `@ApiBody` to appear in the generated OpenAPI document. Pick
class-validator if generated API docs are a hard requirement and you do not want the extra dependency.

Do not run both. Two validation systems on one endpoint means two places to update and one of them will be
forgotten.

## Providers and injection

Constructor parameter properties, `private readonly`:

```ts
@Injectable()
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly logger: Logger,
  ) {}

  async findOne(id: UserId): Promise<User> {
    const user = await this.users.findById(id);
    if (user === null) throw new NotFoundException(`user ${id} not found`);
    return user;
  }
}
```

This is the one place where positional constructor arguments are correct — Nest resolves them by type, not
by position, so the "pass an object" rule does not apply.

For an interface-typed dependency, the interface has no runtime token, so provide one explicitly:

```ts
export const MAILER = Symbol("MAILER");

@Module({
  providers: [{ provide: MAILER, useClass: SesMailer }],
})
export class MailModule {}

constructor(@Inject(MAILER) private readonly mailer: Mailer) {}
```

A `Symbol` token beats a string token: a typo in a string is a runtime resolution failure at first request,
while a `Symbol` import is a compile error.

## Repositories

Keep the persistence type separate from the domain type. They diverge — nullable columns, join rows,
snake_case names — and merging them pushes the database's shape into your business logic.

```ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  create(input: CreateUserDto): Promise<User>;
  update(id: UserId, patch: Partial<CreateUserDto>): Promise<User>;
}
```

Return `User | null` for a lookup that may miss, and let the service turn it into a
`NotFoundException`. A repository that throws HTTP exceptions has the transport layer's concerns in the
data layer, and it is untestable without the framework.

A row from an untyped driver is external input. A typed ORM (Prisma, Drizzle, Kysely) generates the row
types from the schema — derive from those rather than hand-writing a parallel entity type.

## Typed configuration

```ts
ConfigModule.forRoot({
  validate: (raw) => EnvSchema.parse(raw),   // throws at boot on bad config
  isGlobal: true,
});
```

`ConfigService.get()` returns `T | undefined` by default, which spreads `!` through the codebase. Two
fixes, both better than the `!`:

```ts
// Either: a typed accessor from the validated schema
constructor(private readonly config: ConfigService<Env, true>) {}
const port = this.config.get("PORT", { infer: true });   // number, not number | undefined

// Or: skip ConfigService and import the validated object directly
import { env } from "./config/env";
```

The second is simpler and fully typed. Use `ConfigService` when you need Nest's per-module config
namespacing or test-time overriding; otherwise the plain module is less machinery.

## Errors and exception filters

Nest's built-in HTTP exceptions are the idiom — use them at the controller and service layer rather than a
custom hierarchy that a filter then has to translate.

```ts
throw new NotFoundException(`user ${id} not found`);
throw new ConflictException({ code: "EMAIL_TAKEN", message: "Email already registered" });
```

A catch-all filter for consistent response shape and for keeping internals out of the response body:

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;

    this.logger.error("request failed", exception instanceof Error ? exception.stack : String(exception));

    res.status(status).json({
      error: {
        code: isHttp ? exception.name : "INTERNAL_ERROR",
        // A 500 message can carry a query string or a connection string. Never forward it.
        message: isHttp ? exception.message : "Internal server error",
      },
    });
  }
}
```

The `exception: unknown` parameter is the correct type and forces the narrowing. The log gets the detail;
the client gets a code.

## Guards and request typing

`Request` has no `user` property, so an auth guard that attaches one leaves every consumer casting.
Declare it once via module augmentation instead of casting at each use:

```ts
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
```

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const payload = this.verify(req.headers.authorization);   // returns AuthenticatedUser
    req.user = payload;
    return true;
  }
}
```

Keep `user` optional in the declaration — it is genuinely absent on unguarded routes, and pretending
otherwise is the lie the type system was meant to catch. Read it through a typed decorator that asserts
presence on guarded routes:

```ts
export const CurrentUser = createParamDecorator((_data, ctx: ExecutionContext): AuthenticatedUser => {
  const { user } = ctx.switchToHttp().getRequest<Request>();
  if (user === undefined) throw new UnauthorizedException();
  return user;
});
```

Verify a JWT's claims rather than trusting the decoded payload's shape. A decoded token is attacker-
controlled data until the signature and the claims are both checked.

## Response shaping

The entity you load is not the object you return. Map explicitly:

```ts
type UserResponse = Pick<User, "id" | "email" | "name">;

const toResponse = ({ id, email, name }: User): UserResponse => ({ id, email, name });
```

Annotating a handler's return type as `UserResponse` does not redact anything — the type erases and
`res.json(entity)` still serializes `passwordHash`. `class-transformer`'s `@Exclude()` plus
`ClassSerializerInterceptor` is the framework answer, but it only works on class instances, so it silently
does nothing for a plain object from Prisma. The explicit mapping function always works, so prefer it at
any boundary carrying secrets.
