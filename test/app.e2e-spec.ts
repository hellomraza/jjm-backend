import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from './../src/common/guards/jwt-auth.guard';
import { RolesGuard } from './../src/common/guards/roles.guard';
import { AuthController } from './../src/modules/auth/auth.controller';
import { AuthService } from './../src/modules/auth/auth.service';
import { LocalStrategy } from './../src/modules/auth/strategies/local.strategy';
import { UserRole } from './../src/modules/users/entities/user.entity';
import { UsersController } from './../src/modules/users/users.controller';
import { UsersService } from './../src/modules/users/users.service';

describe('Auth Login (e2e)', () => {
  let app: INestApplication;

  const mockUsersService: Pick<
    UsersService,
    'findByEmail' | 'comparePasswords'
  > = {
    findByEmail: jest.fn(async (email: string) => {
      if (email !== 'test.user@jjm.local') {
        return null;
      }

      return {
        id: 1,
        email: 'test.user@jjm.local',
        password: 'hashed-password',
        name: 'Test User',
        role: UserRole.DO,
        district_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }),
    comparePasswords: jest.fn(async (plainPassword: string) => {
      return plainPassword === 'Test@1234';
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService, LocalStrategy, UsersService],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/login returns token for valid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test.user@jjm.local',
        password: 'Test@1234',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('access_token');
        expect(typeof response.body.access_token).toBe('string');
        expect(response.body.access_token.length).toBeGreaterThan(0);
      });
  });

  it('POST /auth/login returns 401 for bad password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test.user@jjm.local',
        password: 'WrongPassword123',
      })
      .expect(401);
  });

  it('POST /auth/login returns 401 for unknown user', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'missing.user@jjm.local',
        password: 'Test@1234',
      })
      .expect(401);
  });
});

describe('RBAC Users Endpoints (e2e)', () => {
  let app: INestApplication;

  const mockUsersService: Pick<
    UsersService,
    'create' | 'findAll' | 'findOne' | 'update' | 'remove'
  > = {
    create: jest.fn(async (dto) => ({ id: 2, ...dto })),
    findAll: jest.fn(async () => ({
      data: [{ id: 1, email: 'u@jjm.local', name: 'U', role: UserRole.EM }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    })),
    findOne: jest.fn(async (id: number) => ({
      id,
      email: 'u@jjm.local',
      name: 'U',
      role: UserRole.EM,
      district_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
    })),
    update: jest.fn(async (id: number, dto) => ({ id, ...dto })),
    remove: jest.fn(async () => undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [UsersService, RolesGuard],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const roleHeader = req.headers['x-test-role'];
          const role = Array.isArray(roleHeader)
            ? roleHeader[0]
            : roleHeader || UserRole.EM;

          req.user = {
            userId: 1,
            email: 'tester@jjm.local',
            role,
          };

          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /users allows EM role', () => {
    return request(app.getHttpServer())
      .get('/users')
      .set('x-test-role', UserRole.EM)
      .expect(200);
  });

  it('POST /users denies EM role with 403', () => {
    return request(app.getHttpServer())
      .post('/users')
      .set('x-test-role', UserRole.EM)
      .send({
        email: 'new@jjm.local',
        password: 'Test@1234',
        name: 'New User',
        role: UserRole.EM,
      })
      .expect(403);
  });

  it('POST /users allows DO role', () => {
    return request(app.getHttpServer())
      .post('/users')
      .set('x-test-role', UserRole.DO)
      .send({
        email: 'new@jjm.local',
        password: 'Test@1234',
        name: 'New User',
        role: UserRole.EM,
      })
      .expect(201);
  });

  it('DELETE /users/:id only allows HO role', async () => {
    await request(app.getHttpServer())
      .delete('/users/1')
      .set('x-test-role', UserRole.DO)
      .expect(403);

    await request(app.getHttpServer())
      .delete('/users/1')
      .set('x-test-role', UserRole.HO)
      .expect(200);
  });
});
