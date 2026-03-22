# AI Coding Rules — JJM Work Monitoring System

> **NestJS Backend** | **TypeORM** | **MySQL** | **JWT Auth** | **RBAC**

This document defines **strict coding rules and architectural guidelines** for any AI agent generating code in this repository.

> **The AI MUST follow ALL rules in this file before generating or modifying any code.**

---

## Table of Contents

| #  | Section                                       |
|----|-----------------------------------------------|
| 1  | [Global Development Rules](#1-global-development-rules) |
| 2  | [File Size Rules](#2-file-size-rules)         |
| 3  | [Module Structure](#3-module-structure-rule)  |
| 4  | [Controller Rules](#4-controller-rules)       |
| 5  | [Service Rules](#5-service-rules)             |
| 6  | [DTO Rules](#6-dto-rules)                     |
| 7  | [Entity Rules](#7-entity-rules)               |
| 8  | [Authentication Rules](#8-authentication-rules) |
| 9  | [Authorization Rules](#9-authorization-rules) |
| 10 | [Database Rules](#10-database-rules)          |
| 11 | [Error Handling](#11-error-handling-rules)     |
| 12 | [Logging Rules](#12-logging-rules)            |
| 13 | [File Upload Rules](#13-file-upload-rules)    |
| 14 | [S3 Storage](#14-s3-storage-rule)             |
| 15 | [Map / Location](#15-map-location-rule)       |
| 16 | [Security Rules](#16-security-rules)          |
| 17 | [Performance Rules](#17-performance-rules)    |
| 18 | [Testability](#18-testability-rule)           |
| 19 | [Pre-Generation Checklist](#19-pre-generation-checklist) |

---

## 1. Global Development Rules

### AI **MUST**:

- Follow **NestJS best practices** and idiomatic patterns
- Use **modular architecture** (one feature per module)
- Use **DTO validation** on every incoming request
- Write **clean, maintainable, and well-commented** code
- Avoid generating unnecessary abstractions or over-engineering
- Keep functions **small, single-purpose, and readable**
- Use **async/await** consistently (never mix with raw Promises)
- Use **dependency injection** via NestJS constructors

### AI **MUST NOT**:

- Modify unrelated files or modules
- Introduce breaking changes to existing APIs
- Bypass validation or authentication
- Expose sensitive data (passwords, tokens, internal IDs)
- Use `any` type — always define proper TypeScript interfaces/types

---

## 2. File Size Rules

To keep the codebase safe and maintainable:

| File Type   | Max Lines |
|-------------|-----------|
| Controller  | **200**   |
| Service     | **300**   |
| Entity      | **100**   |
| DTO         | **50**    |
| Module      | **50**    |

> **If a file exceeds its limit:** split into smaller, focused services or helper files.

---

## 3. Module Structure Rule

Every feature module **must** follow this exact directory structure:

```
src/
  module-name/
    module-name.module.ts
    module-name.controller.ts
    module-name.service.ts
    dto/
      create-module-name.dto.ts
      update-module-name.dto.ts
    entities/
      module-name.entity.ts
```

> **Naming convention:** Use `kebab-case` for all file and folder names.

---

## 4. Controller Rules

### Controllers **MUST**:

- Contain **only routing and request-handling logic**
- Delegate all business logic to **services**
- Use proper **HTTP method decorators** (`@Get`, `@Post`, `@Patch`, `@Delete`)
- Use **`@Body()`**, **`@Param()`**, **`@Query()`** decorators for input
- Apply **guards and decorators** for auth and RBAC

### Controllers **MUST NOT**:

- Contain database queries or repository calls
- Contain heavy computation or business logic
- Contain manual validation logic (use DTOs instead)

### Example:

```typescript
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('HO', 'DO')
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }
}
```

---

## 5. Service Rules

Services contain **all business logic**.

### Services **MAY**:

- Access **repositories** via TypeORM
- Perform validation checks and transformations
- Call **other services** via dependency injection
- Throw **NestJS HTTP exceptions** (`NotFoundException`, etc.)

### Services **MUST NOT**:

- Return raw database entities directly — use **mapped response objects**
- Expose sensitive fields (e.g., `password`, `token`)
- Accept or reference `Request`/`Response` objects (that's the controller's job)

### Example:

```typescript
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project #${id} not found`);
    }
    return project;
  }
}
```

---

## 6. DTO Rules

Every request body **must** use DTO validation.

### Required Libraries:

- `class-validator` — for decorators (`@IsString`, `@IsEmail`, etc.)
- `class-transformer` — for transformation (`@Transform`, `@Exclude`)

### Rules:

- Every `POST` / `PATCH` endpoint **must** have a dedicated DTO
- Use `Create*Dto` for creation, `Update*Dto` for updates
- `Update*Dto` should extend `PartialType(Create*Dto)`
- Always apply `ValidationPipe` globally or per-route

### Example:

```typescript
import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

```typescript
import { PartialType } from '@nestjs/mapped-types';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

---

## 7. Entity Rules

Entities represent **database tables** and must be kept clean.

### Rules:

- Use **TypeORM decorators** (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`, etc.)
- Use **clear, descriptive column names** (snake_case in DB)
- Avoid placing business logic inside entities
- Define **relations** explicitly (`@ManyToOne`, `@OneToMany`, etc.)
- Always include `created_at` and `updated_at` timestamp columns

### Example:

```typescript
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  district_id: number;

  @ManyToOne(() => District, (district) => district.projects)
  @JoinColumn({ name: 'district_id' })
  district: District;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

## 8. Authentication Rules

| Aspect     | Technology         |
|------------|--------------------|
| Tokens     | **JWT** (access + refresh) |
| Strategy   | **Passport.js**    |
| Hashing    | **bcrypt**         |

### Rules:

- **Never** store plaintext passwords
- Hash passwords with `bcrypt` (min 10 salt rounds)
- Use `@nestjs/passport` with `JwtStrategy` and `LocalStrategy`
- Store JWT secret in **environment variables** (never hardcoded)
- Implement token expiration (`expiresIn: '1d'` or similar)

---

## 9. Authorization Rules

Role-Based Access Control (**RBAC**) must be enforced.

### Defined Roles:

| Role | Description            |
|------|------------------------|
| `HO` | Head Office            |
| `DO` | District Office        |
| `CO` | Contractor             |
| `EM` | Employee / Field Staff |

### Rules:

- Authorization **must** use custom guards (`RolesGuard`)
- Decorate routes with `@Roles()` decorator
- Guards must check the user's role from the JWT payload

### Example:

```typescript
@Roles('DO')
@UseGuards(JwtAuthGuard, RolesGuard)
@Post('approve')
approve(@Body() dto: ApproveDto) {
  return this.service.approve(dto);
}
```

---

## 10. Database Rules

| Aspect   | Technology |
|----------|------------|
| Database | **MySQL**  |
| ORM      | **TypeORM**|

### Rules:

- **Never** run raw SQL unless absolutely necessary (and document why)
- Use **TypeORM repositories** for all data access
- Always **validate inputs** before database operations
- Use **transactions** for multi-step writes
- Use **migrations** for schema changes (never sync in production)

---

## 11. Error Handling Rules

Use **NestJS built-in HTTP exceptions** — do NOT return manual error objects.

### Approved Exceptions:

```typescript
throw new BadRequestException('Invalid input data');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Insufficient permissions');
throw new NotFoundException('Resource not found');
throw new ConflictException('Duplicate entry');
throw new InternalServerErrorException('Unexpected error');
```

### Rules:

- Always provide a **meaningful error message**
- Use a **global exception filter** for unhandled errors
- Never expose stack traces or internal details to the client

---

## 12. Logging Rules

Use the **NestJS built-in `Logger`** — never use `console.log` in production code.

### Usage:

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('ProjectsService');

logger.log('Project created successfully');
logger.warn('Deprecated endpoint called');
logger.error('Failed to create project', error.stack);
```

### Rules:

- Create a logger instance with the **class name** as context
- Log **important operations**: create, update, delete, auth events
- Log **errors with stack traces**
- Never log sensitive data (passwords, tokens, full request bodies)

---

## 13. File Upload Rules

### Configuration:

| Setting         | Value                     |
|-----------------|---------------------------|
| Allowed formats | `jpg`, `png`, `jpeg`, `pdf` |
| Max file size   | **5 MB**                  |
| Handler         | `@nestjs/platform-express` (Multer) |

### Rules:

- Validate file type and size **before** processing
- Use `FileInterceptor` / `FilesInterceptor` decorators
- Reject uploads that don't meet format or size requirements
- Sanitize file names before storage

---

## 14. S3 Storage Rule

All uploaded files **must** be stored in **AWS S3**.

### Database must store:

| Field       | Type       | Description                    |
|-------------|------------|--------------------------------|
| `image_url` | `string`   | Full S3 URL of the uploaded file |
| `latitude`  | `decimal`  | GPS latitude of the upload     |
| `longitude` | `decimal`  | GPS longitude of the upload    |
| `timestamp` | `datetime` | Time the image was captured    |

### Rules:

- Use the **AWS SDK v3** (`@aws-sdk/client-s3`)
- Store S3 credentials in **environment variables**
- Use **presigned URLs** for secure access when needed
- Organize files in buckets by date or module: `uploads/projects/2026-03-06/`

---

## 15. Map Location Rule

Every uploaded image **must** contain geo-location metadata:

| Required Field | Type      |
|----------------|-----------|
| `latitude`     | `decimal` |
| `longitude`    | `decimal` |
| `timestamp`    | `datetime`|

> **If any field is missing, reject the request** with `BadRequestException`.

### Validation Example:

```typescript
if (!dto.latitude || !dto.longitude || !dto.timestamp) {
  throw new BadRequestException('Geo-location data (latitude, longitude, timestamp) is required');
}
```

---

## 16. Security Rules

| Aspect          | Implementation                |
|-----------------|-------------------------------|
| Password hashing| **bcrypt** (10+ salt rounds)  |
| Tokens          | **JWT** (signed, with expiry) |
| Rate limiting   | **@nestjs/throttler**         |
| CORS            | Configured per environment    |
| Helmet          | Enabled for HTTP headers      |

### Additional Rules:

- Never expose internal error details to the client
- Validate and sanitize **all** user inputs
- Use **environment variables** for all secrets and config
- Enable **HTTPS** in production
- Implement **rate limiting** on auth endpoints (login, register)

---

## 17. Performance Rules

### Required Database Indexes:

Add indexes on **all frequently queried columns**:

```typescript
@Index()
@Column()
email: string;

@Index()
@Column()
district_id: number;

@Index()
@Column()
contractor_id: number;

@Index()
@Column()
component_id: number;

@Index()
@Column()
employee_id: number;
```

### Additional Performance Rules:

- Use **pagination** on all list endpoints (`take` / `skip`)
- Avoid **N+1 queries** — use `relations` or `QueryBuilder` joins
- Use **caching** for frequently accessed, rarely changing data
- Keep response payloads lean — return only necessary fields

---

## 18. Testability Rule

### Rules:

- Services must be written so they can be **unit tested easily**
- Avoid tight coupling between modules — use **dependency injection**
- Mock external dependencies (database, S3, etc.) in tests
- Every service method should have at least **one corresponding test**
- Use `@nestjs/testing` for creating test modules

### Example:

```typescript
describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: Repository<Project>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repo = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should throw NotFoundException for invalid ID', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});
```

---

## 19. Pre-Generation Checklist

Before generating **any** code, AI must verify **all** of the following:

- [ ] Correct **module** — file is placed in the right feature module
- [ ] Correct **DTO** — request validation is in place with `class-validator`
- [ ] Correct **service** — business logic is in the service layer, not controller
- [ ] Correct **guards** — `JwtAuthGuard` and `RolesGuard` applied where needed
- [ ] Correct **validation** — inputs are validated, edge cases are handled
- [ ] Correct **error handling** — NestJS exceptions used, meaningful messages
- [ ] Correct **naming** — follows kebab-case files, PascalCase classes, camelCase methods
- [ ] Correct **imports** — module dependencies registered in `*.module.ts`
- [ ] **No sensitive data** exposed in responses
- [ ] **File size limits** respected

---

> **This document is the single source of truth for AI code generation in this project.**
> Any code that violates these rules must be rejected and regenerated.
