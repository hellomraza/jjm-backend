import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Block } from './entities/block.entity';
import { Circle } from './entities/circle.entity';
import { District } from './entities/district.entity';
import { Panchayat } from './entities/panchayat.entity';
import { Subdivision } from './entities/subdivision.entity';
import { Village } from './entities/village.entity';
import { Zone } from './entities/zone.entity';
import { LocationMasterType } from './locations.types';

type LocationConfig = {
  repository: Repository<ObjectLiteral>;
  idField: string;
  nameField: string;
  codeField: string;
  requiresDistrict: boolean;
};

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Panchayat)
    private readonly panchayatRepository: Repository<Panchayat>,
    @InjectRepository(Village)
    private readonly villageRepository: Repository<Village>,
    @InjectRepository(Subdivision)
    private readonly subdivisionRepository: Repository<Subdivision>,
    @InjectRepository(Circle)
    private readonly circleRepository: Repository<Circle>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
  ) {}

  private getConfig(type: LocationMasterType): LocationConfig {
    switch (type) {
      case LocationMasterType.DISTRICTS:
        return {
          repository: this.districtRepository,
          idField: 'districtid',
          nameField: 'districtname',
          codeField: 'district_code',
          requiresDistrict: false,
        };
      case LocationMasterType.BLOCKS:
        return {
          repository: this.blockRepository,
          idField: 'blockid',
          nameField: 'blockname',
          codeField: 'block_code',
          requiresDistrict: true,
        };
      case LocationMasterType.PANCHAYATS:
        return {
          repository: this.panchayatRepository,
          idField: 'panchayatid',
          nameField: 'panchayatname',
          codeField: 'panchayat_code',
          requiresDistrict: false,
        };
      case LocationMasterType.VILLAGES:
        return {
          repository: this.villageRepository,
          idField: 'villageid',
          nameField: 'villagename',
          codeField: 'village_code',
          requiresDistrict: true,
        };
      case LocationMasterType.SUBDIVISIONS:
        return {
          repository: this.subdivisionRepository,
          idField: 'subdivisionid',
          nameField: 'subdivisionname',
          codeField: 'subdivision_code',
          requiresDistrict: false,
        };
      case LocationMasterType.CIRCLES:
        return {
          repository: this.circleRepository,
          idField: 'circleid',
          nameField: 'circlename',
          codeField: 'circle_code',
          requiresDistrict: false,
        };
      case LocationMasterType.ZONES:
        return {
          repository: this.zoneRepository,
          idField: 'zoneid',
          nameField: 'zonename',
          codeField: 'zone_code',
          requiresDistrict: false,
        };
      default:
        throw new BadRequestException('Unsupported location type');
    }
  }

  private buildPayload(
    config: LocationConfig,
    payload: CreateLocationDto | UpdateLocationDto,
  ): Record<string, unknown> {
    const mappedPayload: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      mappedPayload[config.nameField] = payload.name;
    }

    if (payload.code !== undefined) {
      mappedPayload[config.codeField] = payload.code;
    }

    if (config.requiresDistrict) {
      if (
        'district_id' in payload &&
        payload.district_id !== undefined &&
        payload.district_id !== null
      ) {
        mappedPayload.district_id = payload.district_id;
      }
    }

    return mappedPayload;
  }

  async create(type: LocationMasterType, dto: CreateLocationDto) {
    const config = this.getConfig(type);

    if (config.requiresDistrict && !dto.district_id) {
      throw new BadRequestException('district_id is required for this master');
    }

    const entityPayload = this.buildPayload(config, dto);
    const entity = config.repository.create(entityPayload);
    return config.repository.save(entity);
  }

  async findAll(type: LocationMasterType, page = 1, limit = 20) {
    const config = this.getConfig(type);
    const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
    const safeLimit = Number.isNaN(Number(limit)) ? 20 : Number(limit);

    const [items, total] = await config.repository.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: {
        [config.idField]: 'ASC',
      },
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findOne(type: LocationMasterType, id: number) {
    const config = this.getConfig(type);
    const item = await config.repository.findOne({
      where: {
        [config.idField]: id,
      },
    });

    if (!item) {
      throw new NotFoundException(`${type} record #${id} not found`);
    }

    return item;
  }

  async update(type: LocationMasterType, id: number, dto: UpdateLocationDto) {
    const config = this.getConfig(type);
    const item = await this.findOne(type, id);

    if (
      config.requiresDistrict &&
      dto.district_id !== undefined &&
      dto.district_id === null
    ) {
      throw new BadRequestException(
        'district_id cannot be null for this master',
      );
    }

    Object.assign(item, this.buildPayload(config, dto));
    return config.repository.save(item);
  }

  async remove(type: LocationMasterType, id: number): Promise<void> {
    const config = this.getConfig(type);
    const item = await this.findOne(type, id);
    await config.repository.remove(item);
  }
}
