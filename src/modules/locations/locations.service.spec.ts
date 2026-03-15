import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Block } from './entities/block.entity';
import { Circle } from './entities/circle.entity';
import { District } from './entities/district.entity';
import { Panchayat } from './entities/panchayat.entity';
import { Subdivision } from './entities/subdivision.entity';
import { Village } from './entities/village.entity';
import { Zone } from './entities/zone.entity';
import { LocationsService } from './locations.service';
import { LocationMasterType } from './locations.types';

describe('LocationsService', () => {
  let service: LocationsService;

  const districtRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  } as unknown as Repository<District>;

  const blockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  } as unknown as Repository<Block>;

  const panchayatRepository =
    districtRepository as unknown as Repository<Panchayat>;
  const villageRepository = blockRepository as unknown as Repository<Village>;
  const subdivisionRepository =
    districtRepository as unknown as Repository<Subdivision>;
  const circleRepository = districtRepository as unknown as Repository<Circle>;
  const zoneRepository = districtRepository as unknown as Repository<Zone>;

  beforeEach(() => {
    service = new LocationsService(
      districtRepository,
      blockRepository,
      panchayatRepository,
      villageRepository,
      subdivisionRepository,
      circleRepository,
      zoneRepository,
    );
    jest.clearAllMocks();
  });

  it('create throws when district_id missing for blocks', async () => {
    await expect(
      service.create(LocationMasterType.BLOCKS, { name: 'B', code: 'B1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('findOne throws when record does not exist', async () => {
    (districtRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.findOne(LocationMasterType.DISTRICTS, 1),
    ).rejects.toThrow(NotFoundException);
  });
});
