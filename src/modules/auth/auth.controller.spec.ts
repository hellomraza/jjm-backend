import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    forgotPasswordByCode: jest.fn(),
    resetPasswordByCode: jest.fn(),
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

  it('forgotPassword delegates to AuthService.forgotPassword', async () => {
    authService.forgotPassword.mockResolvedValue({ message: 'sent' });
    const result = await controller.forgotPassword({ email: 'user@example.com' });
    expect(authService.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(result).toEqual({ message: 'sent' });
  });

  it('resetPassword delegates to AuthService.resetPassword', async () => {
    const dto = { email: 'user@example.com', otp: '123456', newPassword: 'Password@123' };
    authService.resetPassword.mockResolvedValue({ message: 'reset' });
    const result = await controller.resetPassword(dto);
    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'reset' });
  });

  it('forgotPasswordByCode delegates to AuthService.forgotPasswordByCode', async () => {
    authService.forgotPasswordByCode.mockResolvedValue({ message: 'sent' });
    const result = await controller.forgotPasswordByCode({ code: 'USER001' });
    expect(authService.forgotPasswordByCode).toHaveBeenCalledWith('USER001');
    expect(result).toEqual({ message: 'sent' });
  });

  it('resetPasswordByCode delegates to AuthService.resetPasswordByCode', async () => {
    const dto = { code: 'USER001', otp: '123456', newPassword: 'Password@123' };
    authService.resetPasswordByCode.mockResolvedValue({ message: 'reset' });
    const result = await controller.resetPasswordByCode(dto);
    expect(authService.resetPasswordByCode).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'reset' });
  });
});
