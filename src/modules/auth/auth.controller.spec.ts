import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('login delegates to AuthService.login', () => {
    const user = {
      id: '1',
      email: 'u@jjm.local',
      role: UserRole.HO,
    };
    const req = { user } as Parameters<AuthController['login']>[0];
    authService.login.mockReturnValue({ access_token: 'token' });

    const result = controller.login(req);

    expect(authService.login).toHaveBeenCalledWith(user);
    expect(result).toEqual({ access_token: 'token' });
  });
});
