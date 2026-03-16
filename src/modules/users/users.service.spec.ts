import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const findOneMock = jest.fn();
  const userRepository = {
    findOne: findOneMock,
    compare: jest.fn(),
  } as unknown as Repository<User>;

  beforeEach(() => {
    service = new UsersService(userRepository);
    jest.clearAllMocks();
  });

  it('findByEmail delegates to repository', async () => {
    findOneMock.mockResolvedValue({ id: 'u1' });

    const result = await service.findByEmail('u@jjm.local');

    expect(findOneMock).toHaveBeenCalled();
    expect(result).toEqual({ id: 'u1' });
  });

  it('findOne throws when user is missing', async () => {
    findOneMock.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
