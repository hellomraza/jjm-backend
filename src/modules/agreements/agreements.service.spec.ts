import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { AgreementsService } from './agreements.service';
import { Agreement } from './entities/agreement.entity';

describe('AgreementsService', () => {
  let service: AgreementsService;

  const agreementsRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  } as unknown as Repository<Agreement>;

  const usersRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;

  const workItemsRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<WorkItem>;

  beforeEach(() => {
    service = new AgreementsService(
      agreementsRepository,
      usersRepository,
      workItemsRepository,
    );
    jest.clearAllMocks();
  });

  it('findOne throws when agreement not found', async () => {
    (agreementsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create throws when contractor is missing', async () => {
    (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create({
        contractor_id: 'c1',
        work_id: 'w1',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
