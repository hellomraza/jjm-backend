import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByEmail: jest.fn(),
    comparePasswords: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  } as unknown as JwtService;

  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
    );
    jest.clearAllMocks();
  });

  it('validateUser returns user without password when credentials are valid', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'u@jjm.local',
      password: 'hashed',
      role: UserRole.HO,
    });
    usersService.comparePasswords.mockResolvedValue(true);

    const result = await service.validateUser('u@jjm.local', 'Plain@123');

    expect(result).toEqual({
      id: 'u1',
      email: 'u@jjm.local',
      role: UserRole.HO,
    });
  });

  it('login throws for invalid user', () => {
    expect(() => service.login(null as unknown as never)).toThrow(
      UnauthorizedException,
    );
  });
});
