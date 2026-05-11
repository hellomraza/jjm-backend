import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const findOneMock = jest.fn();
  const userRepository = {
    findOne: findOneMock,
    compare: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  it('getAllContractors excludes temporary import contractors', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'co1',
          email: 'contractor@example.com',
          name: 'Real Contractor',
          role: UserRole.CO,
          password: 'secret',
        },
      ]),
    };

    (userRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      queryBuilder,
    );

    const result = await service.getAllContractors();

    expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.where).toHaveBeenCalledWith('user.role = :role', {
      role: UserRole.CO,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('NOT'),
      {
        temporaryEmailPattern: 'temp-contractor-%@import.local',
        temporaryNamePattern: 'Temporary Contractor %',
      },
    );
    expect(result).toEqual([
      {
        id: 'co1',
        email: 'contractor@example.com',
        name: 'Real Contractor',
        role: UserRole.CO,
      },
    ]);
  });
});
