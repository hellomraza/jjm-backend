import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
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

  describe('login', () => {
    it('login delegates to AuthService.login and sets HTTP-only cookie', () => {
      const user = {
        id: '1',
        email: 'u@jjm.local',
        role: UserRole.HO,
      };
      const req = { user } as Parameters<AuthController['login']>[0];
      const loginResponse = { 
        access_token: 'token',
        user: { id: '1', email: 'u@jjm.local', role: UserRole.HO },
      };
      
      // Mock Response object with necessary methods
      const mockRes = {
        cookie: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      authService.login.mockReturnValue(loginResponse);

      controller.login(req, mockRes);

      // Verify service was called with user
      expect(authService.login).toHaveBeenCalledWith(user);
      
      // Verify cookie was set with correct options
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        loginResponse.access_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      
      // Verify response JSON was sent
      expect(mockRes.json).toHaveBeenCalledWith(loginResponse);
    });
  });

  describe('logout', () => {
    it('logout clears the authentication cookie', () => {
      const mockRes = {
        clearCookie: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      controller.logout(mockRes);

      // Verify cookie was cleared with correct options
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      
      // Verify response JSON was sent
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Logged out successfully' 
      });
    });
  });
});
