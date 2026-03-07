import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './../src/modules/auth/auth.controller';
import { AuthService } from './../src/modules/auth/auth.service';
import { LocalStrategy } from './../src/modules/auth/strategies/local.strategy';
import { UserRole } from './../src/modules/users/entities/user.entity';
import { UsersService } from './../src/modules/users/users.service';

describe('Auth Login (e2e)', () => {
  let app: INestApplication;

  const mockUsersService: Pick<UsersService, 'findByEmail' | 'comparePasswords'>
  = {
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
