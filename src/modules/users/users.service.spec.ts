import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const findOneMock = jest.fn();
  const findMock = jest.fn();
  const createMock = jest.fn();
  const saveMock = jest.fn();
  const userRepository = {
    find: findMock,
    findOne: findOneMock,
    compare: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: createMock,
    save: saveMock,
  } as unknown as Repository<User>;

  beforeEach(() => {
    service = new UsersService(userRepository, {} as any);
    (service as any).contractorContractRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    };
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

  describe('createContractor', () => {
    it('throws ConflictException if email already exists', async () => {
      findOneMock.mockResolvedValueOnce({ id: 'existing_user_id' }); // findOne for email

      const dto = {
        name: 'Jane Smith',
        email: 'contractor@example.com',
        password: 'Password@123',
        code: 'CO1234567',
      };

      await expect(
        service.createContractor(dto, 'admin_id', UserRole.DO),
      ).rejects.toThrow('already exists');
    });

    it('throws ConflictException if code already exists', async () => {
      findOneMock
        .mockResolvedValueOnce(null) // findOne for email
        .mockResolvedValueOnce({ id: 'existing_user_id' }); // findOne for code

      const dto = {
        name: 'Jane Smith',
        email: 'contractor@example.com',
        password: 'Password@123',
        code: 'CO1234567',
      };

      await expect(
        service.createContractor(dto, 'admin_id', UserRole.DO),
      ).rejects.toThrow('already exists');
    });

    it('successfully creates contractor with custom code', async () => {
      findOneMock
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // code check

      const dto = {
        name: 'Jane Smith',
        email: 'contractor@example.com',
        password: 'Password@123',
        code: 'CO1234567',
      };

      const mockSaved = {
        id: 'new_id',
        ...dto,
        role: UserRole.CO,
      };

      createMock.mockReturnValue(mockSaved);
      saveMock.mockResolvedValue(mockSaved);

      const result = await service.createContractor(dto, 'admin_id', UserRole.DO);

      expect(findOneMock).toHaveBeenNthCalledWith(1, { where: { email: dto.email } });
      expect(findOneMock).toHaveBeenNthCalledWith(2, { where: { code: dto.code } });
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ code: dto.code }));
      expect(result).toEqual(expect.objectContaining({ code: dto.code, email: dto.email }));
    });
  });

  describe('update contractor code', () => {
    it('throws ConflictException if code is already taken by another user', async () => {
      findOneMock
        .mockResolvedValueOnce({ id: 'co1', code: 'CO1111111' }) // find by id
        .mockResolvedValueOnce({ id: 'co2', code: 'CO2222222' }); // find by new code

      const dto = {
        code: 'CO2222222',
      };

      await expect(service.update('co1', dto)).rejects.toThrow('already exists');
    });

    it('updates code successfully if not taken', async () => {
      const existingUser = {
        id: 'co1',
        code: 'CO1111111',
        email: 'co1@example.com',
      };

      findOneMock
        .mockResolvedValueOnce(existingUser) // find by id
        .mockResolvedValueOnce(null); // check if code exists

      saveMock.mockImplementation(async (user) => user);

      const dto = {
        code: 'CO2222222',
      };

      const result = await service.update('co1', dto);

      expect(result.code).toBe('CO2222222');
      expect(saveMock).toHaveBeenCalled();
    });
  });
});
