# AI Backend Development Guide — JJM Work Monitoring System

> **NestJS** | **TypeORM** | **MySQL** | **JWT** | **RBAC** | **AWS S3** | **Google Maps**

This document defines **all rules, architecture decisions, coding standards, and step-by-step tasks** for building the backend using AI.

> **The AI agent must strictly follow ALL rules in this document. This ensures the backend is built safely, modularly, and following best practices.**

---

## Table of Contents

### Part A — Rules & Standards

| #   | Section                                                            |
| --- | ------------------------------------------------------------------ |
| 1   | [Global AI Execution Rules](#section-1--global-ai-execution-rules) |
| 2   | [Technology Decisions](#section-2--backend-technology-decisions)   |
| 3   | [Project Structure](#section-3--project-structure)                 |
| 4   | [Module Rules](#section-4--module-rules)                           |
| 5   | [Security Rules](#section-5--security-rules)                       |
| 6   | [Validation Rules](#section-6--validation-rules)                   |
| 7   | [Database Rules](#section-7--database-rules)                       |
| 8   | [Photo Upload Rules](#section-8--photo-upload-rules)               |
| 9   | [Map Location Rule](#section-9--map-location-rule)                 |
| 10  | [Performance Rules](#section-10--performance-rules)                |
| 11  | [Error Handling Rules](#section-11--error-handling-rules)          |
| 12  | [Logging Rules](#section-12--logging-rules)                        |
| 13  | [AI Code Review Checklist](#section-13--ai-code-review-checklist)  |

### Part B — Build Task Plan

| Task | Module                                                      |
| ---- | ----------------------------------------------------------- |
| 1    | [Project Setup](#task-1--project-setup)                     |
| 2    | [Database Configuration](#task-2--database-configuration)   |
| 3    | [Users Module](#task-3--users-module)                       |
| 4    | [Auth Module](#task-4--auth-module)                         |
| 5    | [Role Authorization](#task-5--role-authorization)           |
| 6    | [Work Items Module](#task-6--work-items-module)             |
| 7    | [Component Module](#task-7--component-module)               |
| 8    | [Photo Module](#task-8--photo-module)                       |
| 9    | [Contractor Verification](#task-9--contractor-verification) |
| 10   | [District Approval](#task-10--district-approval)            |
| 11   | [Transaction Safety](#task-11--transaction-safety)          |
| 12   | [Database Performance](#task-12--database-performance)      |

---

# Part A — Rules & Standards

---

# SECTION 1 — Global AI Execution Rules

## Task Execution Rules

AI must follow these rules when executing tasks:

- Execute **only ONE task at a time**
- **Never** start the next task automatically
- After completing a task:
  1. Mark all subtasks `[x]`
  2. Mark the task `[x]`
  3. **Stop execution**
  4. **Wait for human instruction**

> **Violating the execution order will result in rejected code.**

---

## Git Workflow Rules

### Branching:

Each **task = one Git branch**.

| Convention  | Format             | Example                 |
| ----------- | ------------------ | ----------------------- |
| Branch name | `feature/<module>` | `feature/project-setup` |
| Branch name | `fix/<module>`     | `fix/auth-token-expiry` |

### Commits:

Each **subtask = one commit**.

| Type     | Format                              | Example                                |
| -------- | ----------------------------------- | -------------------------------------- |
| Feature  | `feat(<module>): <description>`     | `feat(auth): implement login endpoint` |
| Fix      | `fix(<module>): <description>`      | `fix(users): hash password on update`  |
| Refactor | `refactor(<module>): <description>` | `refactor(photos): extract S3 service` |
| Docs     | `docs(<module>): <description>`     | `docs(readme): update API endpoints`   |
| Test     | `test(<module>): <description>`     | `test(auth): add login unit tests`     |

---

## File Change Limits

To keep AI safe and changes reviewable:

| Scope          | Max Files Changed |
| -------------- | ----------------- |
| Per **task**   | **5–8 files**     |
| Per **commit** | **1–3 files**     |

> If a task requires more files, split it into smaller subtasks.

### Package Management Rule:

> **CRITICAL: AI must NEVER modify `package.json` file directly.**
> Use `yarn add` or `yarn add -D` to install dependencies instead.

---

# SECTION 2 — Backend Technology Decisions

| Concern          | Technology           | Package                                |
| ---------------- | -------------------- | -------------------------------------- |
| Framework        | **NestJS**           | `@nestjs/core`                         |
| Database         | **MySQL**            | `mysql2`                               |
| ORM              | **TypeORM**          | `typeorm`, `@nestjs/typeorm`           |
| Authentication   | **JWT**              | `@nestjs/jwt`, `@nestjs/passport`      |
| Password Hashing | **bcrypt**           | `bcryptjs`                             |
| Validation       | **class-validator**  | `class-validator`, `class-transformer` |
| File Upload      | **Multer**           | `@nestjs/platform-express`             |
| Cloud Storage    | **AWS S3**           | `@aws-sdk/client-s3`                   |
| Maps             | **Google Maps API**  | `@googlemaps/google-maps-services-js`  |
| Config           | **Environment Vars** | `@nestjs/config`                       |

---

# SECTION 3 — Project Structure

The backend must follow this exact structure:

```
src/
├── config/                          # App configuration
│   ├── database.config.ts           # TypeORM config
│   └── s3.config.ts                 # AWS S3 config
│
├── common/                          # Shared utilities
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        # JWT authentication guard
│   │   └── roles.guard.ts           # RBAC authorization guard
│   ├── decorators/
│   │   └── roles.decorator.ts       # @Roles() decorator
│   ├── interceptors/
│   │   └── transform.interceptor.ts # Response transformation
│   └── filters/
│       └── http-exception.filter.ts # Global exception filter
│
├── modules/
│   ├── auth/                        # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   └── dto/
│   │       └── login.dto.ts
│   │
│   ├── users/                       # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── work-items/                  # Work order management
│   │   ├── work-items.module.ts
│   │   ├── work-items.controller.ts
│   │   ├── work-items.service.ts
│   │   ├── dto/
│   │   │   ├── create-work-item.dto.ts
│   │   │   └── update-work-item.dto.ts
│   │   └── entities/
│   │       └── work-item.entity.ts
│   │
│   ├── components/                  # Component tracking
│   │   ├── components.module.ts
│   │   ├── components.controller.ts
│   │   ├── components.service.ts
│   │   ├── dto/
│   │   │   ├── create-component.dto.ts
│   │   │   └── update-component.dto.ts
│   │   └── entities/
│   │       └── component.entity.ts
│   │
│   ├── photos/                      # Photo upload & processing
│   │   ├── photos.module.ts
│   │   ├── photos.controller.ts
│   │   ├── photos.service.ts
│   │   ├── dto/
│   │   │   └── upload-photo.dto.ts
│   │   └── entities/
│   │       └── photo.entity.ts
│   │
│   └── assignments/                 # Task assignments
│       ├── assignments.module.ts
│       ├── assignments.controller.ts
│       ├── assignments.service.ts
│       ├── dto/
│       │   ├── create-assignment.dto.ts
│       │   └── update-assignment.dto.ts
│       └── entities/
│           └── assignment.entity.ts
│
├── database/
│   ├── migrations/                  # TypeORM migrations
│   └── seeds/                       # Seed data for development
│
├── app.module.ts                    # Root module
└── main.ts                          # Entry point
```

---

# SECTION 4 — Module Rules

Every module **must** contain the following files:

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `*.module.ts`          | Registers providers, imports, exports |
| `*.controller.ts`      | HTTP routing only                     |
| `*.service.ts`         | All business logic                    |
| `entities/*.entity.ts` | TypeORM entity (DB table)             |
| `dto/create-*.dto.ts`  | Validated creation DTO                |
| `dto/update-*.dto.ts`  | Validated update DTO (`PartialType`)  |

### Example — Users Module:

```
src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
└── entities/
    └── user.entity.ts
```

### Module Registration Example:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

# SECTION 5 — Security Rules

### Password Hashing:

| Setting     | Value            |
| ----------- | ---------------- |
| Algorithm   | **bcrypt**       |
| Salt rounds | **10** (minimum) |

```typescript
import * as bcrypt from 'bcryptjs';

// Hashing
const hashed = await bcrypt.hash(password, 10);

// Comparing
const isMatch = await bcrypt.compare(plainText, hashed);
```

> **Passwords must NEVER be returned in any API response.**

### Authentication:

| Aspect   | Implementation          |
| -------- | ----------------------- |
| Strategy | **JWT via Passport.js** |
| Guard    | `JwtAuthGuard`          |
| Secret   | Stored in `.env`        |
| Expiry   | `expiresIn: '1d'`       |

### Authorization (RBAC):

| Role | Full Name              | Access Level                             |
| ---- | ---------------------- | ---------------------------------------- |
| `HO` | Head Office            | Full system access                       |
| `DO` | District Office        | Approve/reject work orders, view reports |
| `CO` | Contractor             | Create work orders, view assigned tasks  |
| `EM` | Employee / Field Staff | View assigned tasks, upload photos       |

```typescript
// Protecting an endpoint
@Roles('HO', 'DO')
@UseGuards(JwtAuthGuard, RolesGuard)
@Patch(':id/approve')
approve(@Param('id', ParseIntPipe) id: number) {
  return this.service.approve(id);
}
```

---

# SECTION 6 — Validation Rules

All request bodies **must** use DTO validation.

### Required Libraries:

| Library             | Purpose               |
| ------------------- | --------------------- |
| `class-validator`   | Validation decorators |
| `class-transformer` | Type transformation   |

### Common Decorators:

| Decorator        | Purpose                    |
| ---------------- | -------------------------- |
| `@IsString()`    | Must be a string           |
| `@IsEmail()`     | Must be a valid email      |
| `@IsNotEmpty()`  | Must not be empty          |
| `@MinLength(n)`  | Minimum character length   |
| `@IsNumber()`    | Must be a number           |
| `@IsEnum(Role)`  | Must be a valid enum value |
| `@IsOptional()`  | Field is optional          |
| `@IsLatitude()`  | Must be valid latitude     |
| `@IsLongitude()` | Must be valid longitude    |

### Example:

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsNotEmpty()
  name: string;
}
```

> **Invalid requests must be rejected** with `BadRequestException`. Enable `ValidationPipe` globally in `main.ts`.

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

---

# SECTION 7 — Database Rules

| Setting     | Value       |
| ----------- | ----------- |
| Database    | **MySQL**   |
| ORM         | **TypeORM** |
| Sync (prod) | **false**   |

### Rules:

- Use **repositories** for all data access
- **Avoid raw SQL** — use TypeORM QueryBuilder if complex queries are needed
- Use **transactions** for critical multi-step operations
- Use **migrations** for all schema changes in production
- **Never** use `synchronize: true` in production

### TypeORM Config Example:

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
};
```

---

# SECTION 8 — Photo Upload Rules

### Upload Configuration:

| Setting       | Value                          |
| ------------- | ------------------------------ |
| Handler       | **Multer** (`FileInterceptor`) |
| Allowed types | `jpg`, `jpeg`, `png`           |
| Max file size | **10 MB**                      |
| Storage       | **AWS S3**                     |

### Required Metadata (stored in database):

| Field          | Type       | Required | Description                       |
| -------------- | ---------- | -------- | --------------------------------- |
| `image_url`    | `string`   | Yes      | Full S3 URL of uploaded image     |
| `latitude`     | `decimal`  | Yes      | GPS latitude of capture location  |
| `longitude`    | `decimal`  | Yes      | GPS longitude of capture location |
| `timestamp`    | `datetime` | Yes      | Time the photo was taken          |
| `employee_id`  | `number`   | Yes      | ID of the uploading employee      |
| `component_id` | `number`   | Yes      | ID of the related component       |

### Upload Controller Example:

```typescript
@Post('upload')
@Roles('EM')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
      cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
}))
async uploadPhoto(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadPhotoDto,
) {
  return this.photosService.upload(file, dto);
}
```

---

# SECTION 9 — Map Location Rule

Every photo upload **must** include geo-location metadata:

| Required Field | Type       | Validation        |
| -------------- | ---------- | ----------------- |
| `latitude`     | `decimal`  | `@IsLatitude()`   |
| `longitude`    | `decimal`  | `@IsLongitude()`  |
| `timestamp`    | `datetime` | `@IsDateString()` |

> **If any geo-location field is missing → reject the request** with `BadRequestException`.

```typescript
// upload-photo.dto.ts
export class UploadPhotoDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsDateString()
  timestamp: string;

  @IsNumber()
  employee_id: number;

  @IsNumber()
  component_id: number;
}
```

---

# SECTION 10 — Performance Rules

### Required Database Indexes:

| Table           | Column(s)                      | Type      |
| --------------- | ------------------------------ | --------- |
| `users`         | `email`                        | Single    |
| `work_items`    | `district_id`                  | Single    |
| `work_items`    | `contractor_id`                | Single    |
| `photo_uploads` | `component_id`                 | Single    |
| `photo_uploads` | `employee_id`                  | Single    |
| `photo_uploads` | `work_item_id`, `component_id` | Composite |

### Entity Index Example:

```typescript
@Entity('photo_uploads')
@Index(['work_item_id', 'component_id']) // composite index
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  employee_id: number;

  @Index()
  @Column()
  component_id: number;

  @Column()
  work_item_id: number;
}
```

### Additional Performance Rules:

- Use **pagination** on all list endpoints (`take` / `skip`)
- Avoid **N+1 queries** — use `relations` or `QueryBuilder` joins
- Use **selective column loading** when full entity is not needed
- Apply **caching** for frequently accessed, rarely changing data

---

# SECTION 11 — Error Handling Rules

Use **NestJS built-in HTTP exceptions** — never return manual error objects.

### Approved Exceptions:

| Exception                      | HTTP Code | Use Case                    |
| ------------------------------ | --------- | --------------------------- |
| `BadRequestException`          | 400       | Invalid input               |
| `UnauthorizedException`        | 401       | Missing/invalid credentials |
| `ForbiddenException`           | 403       | Insufficient permissions    |
| `NotFoundException`            | 404       | Resource not found          |
| `ConflictException`            | 409       | Duplicate entry             |
| `InternalServerErrorException` | 500       | Unexpected server error     |

### Usage:

```typescript
throw new NotFoundException(`Work item #${id} not found`);
throw new BadRequestException('Latitude and longitude are required');
throw new ForbiddenException('Only DO role can approve work items');
throw new ConflictException('Component already approved');
```

### Rules:

- Always provide a **meaningful error message**
- Never expose **stack traces** or internal details to the client
- Use a **global exception filter** for consistent error formatting

---

# SECTION 12 — Logging Rules

Use the **NestJS built-in `Logger`** — never use `console.log`.

### Proper Usage:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  async upload(file: Express.Multer.File, dto: UploadPhotoDto) {
    this.logger.log(`Uploading photo for component ${dto.component_id}`);
    try {
      // upload logic
      this.logger.log('Photo uploaded successfully to S3');
    } catch (error) {
      this.logger.error('Failed to upload photo to S3', error.stack);
      throw new InternalServerErrorException('Photo upload failed');
    }
  }
}
```

### Rules:

| Level            | Use For                                 |
| ---------------- | --------------------------------------- |
| `logger.log()`   | Successful operations, important events |
| `logger.warn()`  | Deprecated usage, non-critical issues   |
| `logger.error()` | Failures with stack traces              |

- **Never** log sensitive data (passwords, tokens, full request bodies)
- Create logger with **class name** as context

---

# SECTION 13 — AI Code Review Checklist

Before committing code, AI must verify **all** items below:

### General Checks:

- [ ] Only **relevant files** changed
- [ ] Commit message follows **standard format**
- [ ] No **`console.log`** statements left
- [ ] No **debugging code** remains
- [ ] No **commented-out code** left

### Architecture Checks:

- [ ] Controllers contain **no business logic**
- [ ] Services contain **all business logic**
- [ ] **DTO validation** exists for every request body
- [ ] Entities **match database schema**
- [ ] Module **imports/providers registered** correctly

### Security Checks:

- [ ] Passwords **hashed with bcrypt**
- [ ] Passwords **never returned** in responses
- [ ] **JWT authentication** applied
- [ ] **RolesGuard** used where required
- [ ] No **sensitive data** in responses

### Database Checks:

- [ ] TypeORM entities are **correct**
- [ ] **Repository pattern** used
- [ ] No **unsafe raw queries**
- [ ] **Transactions** used for critical operations

### Upload Checks:

- [ ] **Multer** used for file handling
- [ ] File **type validated**
- [ ] File **size validated**
- [ ] **S3 upload** implemented
- [ ] All **metadata stored** in database

---

# Part B — Build Task Plan

---

# TASK 1 — Project Setup [x]

| Setting | Value                   |
| ------- | ----------------------- |
| Branch  | `feature/project-setup` |
| Files   | 5–8                     |

### Subtasks:

- [x] Initialize NestJS project with `@nestjs/cli`
- [x] Install all required dependencies (see [Section 2](#section-2--backend-technology-decisions))
- [x] Setup folder structure (see [Section 3](#section-3--project-structure))
- [x] Configure environment variables with `@nestjs/config`
- [x] Enable `ValidationPipe` globally in `main.ts`
- [x] Setup CORS and Helmet for security headers

### Dependencies to Install:

Use **Yarn** (do NOT use npm):

```bash
# Core
yarn add @nestjs/config @nestjs/typeorm typeorm mysql2

# Auth
yarn add @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs
yarn add -D @types/passport-jwt @types/bcryptjs

# Validation
yarn add class-validator class-transformer

# File Upload & Storage
yarn add @aws-sdk/client-s3

# Security
yarn add @nestjs/throttler helmet
```

> **Important:** Use `yarn add` for production dependencies and `yarn add -D` for dev dependencies. Never modify `package.json` directly.

---

# TASK 2 — Database Configuration [x]

| Setting | Value                     |
| ------- | ------------------------- |
| Branch  | `feature/database-config` |
| Files   | 2–4                       |

### Subtasks:

- [x] Create `config/database.config.ts` with TypeORM options
- [x] Configure MySQL connection using environment variables
- [x] Enable entity auto-loading via glob pattern
- [x] Setup migration directory (`src/database/migrations`)
- [x] **Note:** Migration scripts are already configured in `package.json` (do not modify)

### Environment Variables Required:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=secret
DB_NAME=jjm_work_monitoring
```

### Migration Scripts (already in package.json):

```bash
# Generate new migration
yarn typeorm migration:generate -d src/config/database.config.ts

# Run pending migrations
yarn typeorm migration:run -d src/config/database.config.ts

# Revert last migration
yarn typeorm migration:revert -d src/config/database.config.ts
```

> These commands are already available via `yarn`. Do not modify `package.json`.

---

# TASK 3 — Users Module [x]

| Setting | Value                  |
| ------- | ---------------------- |
| Branch  | `feature/users-module` |
| Files   | 5–7                    |

### Subtasks:

- [x] Create `User` entity with TypeORM decorators
- [x] Create `CreateUserDto` and `UpdateUserDto` with validation
- [x] Create `UsersService` with CRUD operations
- [x] Create `UsersController` with protected routes
- [x] Implement **password hashing** on create/update
- [x] **Exclude password** from all responses

### User Entity Fields:

| Field         | Type     | Constraints                 |
| ------------- | -------- | --------------------------- |
| `id`          | `number` | `@PrimaryGeneratedColumn()` |
| `email`       | `string` | `@Index()`, unique          |
| `password`    | `string` | Hashed with bcrypt          |
| `name`        | `string` | Not empty                   |
| `role`        | `enum`   | `HO`, `DO`, `CO`, `EM`      |
| `district_id` | `number` | Nullable for HO             |
| `created_at`  | `Date`   | `@CreateDateColumn()`       |
| `updated_at`  | `Date`   | `@UpdateDateColumn()`       |

---

# TASK 4 — Auth Module

| Setting | Value                 |
| ------- | --------------------- |
| Branch  | `feature/auth-module` |
| Files   | 5–7                   |

### Subtasks:

- [ ] Create Auth module, controller, and service
- [ ] Implement **login endpoint** (`POST /auth/login`)
- [ ] Implement **JWT strategy** (`JwtStrategy`)
- [ ] Implement **Local strategy** (`LocalStrategy`)
- [ ] Create `JwtAuthGuard`
- [ ] Create `LoginDto` with validation

### Login Flow:

```
1. Client sends { email, password } → POST /auth/login
2. LocalStrategy validates email exists
3. Service compares password with bcrypt
4. If valid → generate JWT with { userId, email, role }
5. Return { access_token: "<jwt>" }
```

### JWT Payload Structure:

```typescript
interface JwtPayload {
  sub: number; // userId
  email: string;
  role: string; // 'HO' | 'DO' | 'CO' | 'EM'
}
```

---

# TASK 5 — Role Authorization

| Setting | Value          |
| ------- | -------------- |
| Branch  | `feature/rbac` |
| Files   | 3–4            |

### Subtasks:

- [ ] Create `@Roles()` custom decorator
- [ ] Create `RolesGuard` that reads roles from JWT payload
- [ ] Apply guards to **all protected endpoints**
- [ ] Test each role has correct access

### Roles Decorator:

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### Roles Guard:

```typescript
// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

---

# TASK 6 — Work Items Module

| Setting | Value                |
| ------- | -------------------- |
| Branch  | `feature/work-items` |
| Files   | 5–7                  |

### Subtasks:

- [ ] Create `WorkItem` entity
- [ ] Create `CreateWorkItemDto` and `UpdateWorkItemDto`
- [ ] Create `WorkItemsService` with CRUD + status management
- [ ] Create `WorkItemsController` with role-protected routes

### Work Item Entity Fields:

| Field                 | Type      | Constraints                           |
| --------------------- | --------- | ------------------------------------- |
| `id`                  | `number`  | `@PrimaryGeneratedColumn()`           |
| `title`               | `string`  | Not empty                             |
| `description`         | `text`    | Optional                              |
| `district_id`         | `number`  | `@Index()`, FK to districts           |
| `contractor_id`       | `number`  | `@Index()`, FK to users               |
| `latitude`            | `decimal` | GPS location                          |
| `longitude`           | `decimal` | GPS location                          |
| `progress_percentage` | `decimal` | Default: `0`                          |
| `status`              | `enum`    | `PENDING`, `IN_PROGRESS`, `COMPLETED` |
| `created_at`          | `Date`    | `@CreateDateColumn()`                 |
| `updated_at`          | `Date`    | `@UpdateDateColumn()`                 |

---

# TASK 7 — Component Module

| Setting | Value                |
| ------- | -------------------- |
| Branch  | `feature/components` |
| Files   | 5–7                  |

### Subtasks:

- [ ] Create `Component` entity with status tracking
- [ ] Create DTOs with validation
- [ ] Implement **sequential approval rule** in service
- [ ] Implement approval/rejection logic

### Sequential Approval Rule:

> **Component N+1 CANNOT start before Component N is approved.**

```typescript
async startComponent(workItemId: number, componentNumber: number): Promise<void> {
  if (componentNumber > 1) {
    const previous = await this.componentRepo.findOne({
      where: { workItemId, componentNumber: componentNumber - 1 },
    });

    if (!previous || previous.status !== ComponentStatus.APPROVED) {
      throw new BadRequestException(
        `Component ${componentNumber - 1} must be approved before starting Component ${componentNumber}`,
      );
    }
  }
  // proceed
}
```

### Component Entity Fields:

| Field              | Type       | Constraints                                      |
| ------------------ | ---------- | ------------------------------------------------ |
| `id`               | `number`   | `@PrimaryGeneratedColumn()`                      |
| `work_item_id`     | `number`   | FK to work_items                                 |
| `component_number` | `number`   | Sequential order (1, 2, 3...)                    |
| `name`             | `string`   | Component name                                   |
| `status`           | `enum`     | `PENDING`, `IN_PROGRESS`, `APPROVED`, `REJECTED` |
| `approved_by`      | `number`   | Nullable, FK to users                            |
| `approved_at`      | `datetime` | Nullable                                         |
| `created_at`       | `Date`     | `@CreateDateColumn()`                            |
| `updated_at`       | `Date`     | `@UpdateDateColumn()`                            |

---

# TASK 8 — Photo Module

| Setting | Value                  |
| ------- | ---------------------- |
| Branch  | `feature/photo-upload` |
| Files   | 5–7                    |

### Subtasks:

- [ ] Create `Photo` entity with all metadata fields
- [ ] Setup **Multer file upload** with type/size validation
- [ ] Integrate **AWS S3** for cloud storage
- [ ] Create `UploadPhotoDto` with geo-location validation
- [ ] Store all metadata in database after successful upload

### Photo Entity Fields:

| Field          | Type       | Constraints                  |
| -------------- | ---------- | ---------------------------- |
| `id`           | `number`   | `@PrimaryGeneratedColumn()`  |
| `image_url`    | `string`   | S3 URL                       |
| `latitude`     | `decimal`  | Required                     |
| `longitude`    | `decimal`  | Required                     |
| `timestamp`    | `datetime` | Required                     |
| `employee_id`  | `number`   | `@Index()`, FK to users      |
| `component_id` | `number`   | `@Index()`, FK to components |
| `work_item_id` | `number`   | FK to work_items             |
| `created_at`   | `Date`     | `@CreateDateColumn()`        |

---

# TASK 9 — Contractor Verification

| Setting | Value                        |
| ------- | ---------------------------- |
| Branch  | `feature/photo-verification` |
| Files   | 3–5                          |

### Subtasks:

- [ ] Create endpoint for contractor to **review uploaded photos**
- [ ] Implement logic to **select the best photo** for a component
- [ ] Create endpoint to **forward selected photo to DO** for approval
- [ ] Add validation: only `CO` role can perform verification

### Flow:

```
1. EM uploads multiple photos for a component
2. CO reviews all photos for that component
3. CO selects the best photo → PATCH /photos/:id/select
4. Selected photo is forwarded to DO for approval
```

---

# TASK 10 — District Approval

| Setting | Value                        |
| ------- | ---------------------------- |
| Branch  | `feature/component-approval` |
| Files   | 3–5                          |

### Subtasks:

- [ ] Create **approval endpoint** (`PATCH /components/:id/approve`)
- [ ] Create **rejection endpoint** (`PATCH /components/:id/reject`)
- [ ] Update **component status** on approval/rejection
- [ ] **Recalculate work item progress %** after component approval
- [ ] Only `DO` and `HO` roles can approve

### Progress Calculation:

```typescript
// After approving a component, recalculate work item progress
async recalculateProgress(workItemId: number): Promise<void> {
  const total = await this.componentRepo.count({ where: { workItemId } });
  const approved = await this.componentRepo.count({
    where: { workItemId, status: ComponentStatus.APPROVED },
  });
  const progress = (approved / total) * 100;

  await this.workItemRepo.update(workItemId, { progress_percentage: progress });
}
```

---

# TASK 11 — Transaction Safety

| Setting | Value                        |
| ------- | ---------------------------- |
| Branch  | `feature/transaction-safety` |
| Files   | 3–5                          |

### Subtasks:

- [ ] Wrap **approval operations** in database transactions
- [ ] Implement **row-level locking** (`pessimistic_write`) for approvals
- [ ] Prevent **duplicate approvals** with status check before update
- [ ] Add **conflict detection** with `ConflictException`

### Transaction-Safe Approval:

```typescript
async approveComponent(componentId: number, userId: number): Promise<void> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Lock the row to prevent concurrent modifications
    const component = await queryRunner.manager.findOne(Component, {
      where: { id: componentId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!component) throw new NotFoundException('Component not found');
    if (component.status === ComponentStatus.APPROVED) {
      throw new ConflictException('Component already approved');
    }

    component.status = ComponentStatus.APPROVED;
    component.approved_by = userId;
    component.approved_at = new Date();

    await queryRunner.manager.save(component);
    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

# TASK 12 — Database Performance

| Setting | Value                |
| ------- | -------------------- |
| Branch  | `feature/db-indexes` |
| Files   | 3–5                  |

### Subtasks:

- [ ] Add **single-column indexes** (see [Section 10](#section-10--performance-rules))
- [ ] Add **composite indexes** for common query patterns
- [ ] Review and **optimize slow queries**
- [ ] Add **pagination** to all list endpoints
- [ ] Verify no **N+1 queries** exist

### Pagination Helper:

```typescript
// In service
async findAll(page: number = 1, limit: number = 20) {
  const [items, total] = await this.repo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { created_at: 'DESC' },
  });

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

---

# Task Completion Rule

After finishing **any** task, AI must:

1. Mark all subtasks as complete: `[x]`
2. Mark the task as complete
3. **Stop execution immediately**
4. **Wait for human instruction** before proceeding

> **Do NOT auto-proceed to the next task. Always wait for explicit approval.**
