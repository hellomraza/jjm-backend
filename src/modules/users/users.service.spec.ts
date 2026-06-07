import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const findOneMock = jest.fn();
  const findMock = jest.fn();
  const userRepository = {
    find: findMock,
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
      addOrderBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
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
    findOneMock.mockResolvedValue({ id: 'do1', district_id: 'D-001' });

    const result = await service.getAllContractors('do1', UserRole.DO);

    expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(findOneMock).toHaveBeenCalledWith({
      where: { id: 'do1', role: UserRole.DO },
      select: ['id', 'district_id'],
    });
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
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'CASE WHEN user.district_id = :requesterDistrictId THEN 0 ELSE 1 END',
      'ASC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'user.created_at',
      'DESC',
    );
    expect(queryBuilder.setParameter).toHaveBeenCalledWith(
      'requesterDistrictId',
      'D-001',
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
