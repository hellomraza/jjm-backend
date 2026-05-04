import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../app.module';
import { Agreement } from '../modules/agreements/entities/agreement.entity';
import { Component } from '../modules/components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../modules/components/entities/work-item-component.entity';
import { Block } from '../modules/locations/entities/block.entity';
import { Circle } from '../modules/locations/entities/circle.entity';
import { District } from '../modules/locations/entities/district.entity';
import { Panchayat } from '../modules/locations/entities/panchayat.entity';
import { Subdivision } from '../modules/locations/entities/subdivision.entity';
import { Village } from '../modules/locations/entities/village.entity';
import { Zone } from '../modules/locations/entities/zone.entity';
import { Photo } from '../modules/photos/entities/photo.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { WorkItemEmployeeAssignment } from '../modules/work-items/entities/work-item-employee-assignment.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../modules/work-items/entities/work-item.entity';

type SeedUser = {
  email: string;
  name: string;
  role: UserRole;
  district_id?: number;
};

type SeedComponent = {
  name: string;
  unit: string;
  order_number: number;
};

const STATIC_COMPONENTS: SeedComponent[] = [
  {
    name: 'Supply & Installation of Submersible Pump',
    unit: 'No.',
    order_number: 1,
  },
  {
    name: 'Pumping Mains',
    unit: 'Mtr.',
    order_number: 2,
  },
  {
    name: 'OHT',
    unit: 'No.',
    order_number: 3,
  },
  {
    name: 'Chlorinator',
    unit: 'No.',
    order_number: 4,
  },
  {
    name: 'Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
  },
  {
    name: 'FHTC',
    unit: 'No.',
    order_number: 6,
  },
  {
    name: 'Electricity Charge For Power Connection',
    unit: 'No.',
    order_number: 7,
  },
  {
    name: 'Boundary Wall',
    unit: 'Mtr.',
    order_number: 8,
  },
  {
    name: 'Sump Well',
    unit: 'No.',
    order_number: 9,
  },
  {
    name: 'Switch Room',
    unit: 'No.',
    order_number: 10,
  },
  {
    name: 'Chlorinator Room',
    unit: 'No.',
    order_number: 11,
  },
  {
    name: 'Survey and DPR',
    unit: 'No.',
    order_number: 12,
  },
];

const buildSeedNumericCode = (offset: number): string => {
  return `${Date.now()}${offset.toString().padStart(4, '0')}`.slice(-12);
};

const getCurrentFinancialYear = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

export async function seedMockData() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    const userRepo = dataSource.getRepository(User);
    const workItemRepo = dataSource.getRepository(WorkItem);
    const componentRepo = dataSource.getRepository(Component);
    const workItemComponentRepo = dataSource.getRepository(WorkItemComponent);
    const photoRepo = dataSource.getRepository(Photo);
    const workItemEmployeeAssignmentRepo = dataSource.getRepository(
      WorkItemEmployeeAssignment,
    );
    const agreementRepo = dataSource.getRepository(Agreement);
    const districtRepo = dataSource.getRepository(District);
    const blockRepo = dataSource.getRepository(Block);
    const panchayatRepo = dataSource.getRepository(Panchayat);
    const villageRepo = dataSource.getRepository(Village);
    const subdivisionRepo = dataSource.getRepository(Subdivision);
    const circleRepo = dataSource.getRepository(Circle);
    const zoneRepo = dataSource.getRepository(Zone);

    let queryRunner = dataSource.createQueryRunner();

    const requiredBaseTables = [
      'users',
      'work_items',
      'components',
      'work_item_components',
      'photos',
    ];

    const getMissingBaseTables = async (): Promise<string[]> => {
      const missing: string[] = [];
      for (const tableName of requiredBaseTables) {
        const exists = await queryRunner.hasTable(tableName);
        if (!exists) {
          missing.push(tableName);
        }
      }
      return missing;
    };

    let missingBaseTables = await getMissingBaseTables();

    if (missingBaseTables.length > 0) {
      console.warn(
        `Missing base tables detected (${missingBaseTables.join(', ')}). Running schema synchronize before seeding...`,
      );

      await queryRunner.release();
      await dataSource.synchronize(false);
      queryRunner = dataSource.createQueryRunner();

      missingBaseTables = await getMissingBaseTables();
      if (missingBaseTables.length > 0) {
        throw new Error(
          `Missing required base tables after synchronize: ${missingBaseTables.join(', ')}. Check DB connection and entity configuration, then run yarn mock-data again.`,
        );
      }
    }

    let hasUserCodeColumn = await queryRunner.hasColumn('users', 'code');
    let hasWorkCodeColumn = await queryRunner.hasColumn(
      'work_items',
      'work_code',
    );

    // Create location master tables inline if migrations haven't been run yet
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS districts (
        districtid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        districtname VARCHAR(255) NOT NULL,
        district_code VARCHAR(100) NOT NULL,
        INDEX IDX_DISTRICTS_CODE (district_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        blockid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        blockname VARCHAR(255) NOT NULL,
        block_code VARCHAR(100) NOT NULL,
        district_id INT NOT NULL,
        INDEX IDX_BLOCKS_CODE (block_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS panchayats (
        panchayatid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        panchayatname VARCHAR(255) NOT NULL,
        panchayat_code VARCHAR(100) NOT NULL,
        INDEX IDX_PANCHAYATS_CODE (panchayat_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS villages (
        villageid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        villagename VARCHAR(255) NOT NULL,
        village_code VARCHAR(100) NOT NULL,
        district_id INT NOT NULL,
        INDEX IDX_VILLAGES_CODE (village_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subdivisions (
        subdivisionid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        subdivisionname VARCHAR(255) NOT NULL,
        subdivision_code VARCHAR(100) NOT NULL,
        INDEX IDX_SUBDIVISIONS_CODE (subdivision_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS circles (
        circleid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        circlename VARCHAR(255) NOT NULL,
        circle_code VARCHAR(100) NOT NULL,
        INDEX IDX_CIRCLES_CODE (circle_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zones (
        zoneid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        zonename VARCHAR(255) NOT NULL,
        zone_code VARCHAR(100) NOT NULL,
        INDEX IDX_ZONES_CODE (zone_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS agreements (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        agreementno VARCHAR(100) NOT NULL,
        agreementyear VARCHAR(9) NOT NULL,
        contractor_id VARCHAR(36) NOT NULL,
        work_id VARCHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_AGREEMENTS_NO (agreementno),
        INDEX IDX_AGREEMENTS_CONTRACTOR (contractor_id),
        INDEX IDX_AGREEMENTS_WORK (work_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS work_item_employee_assignments (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        work_item_id VARCHAR(36) NOT NULL,
        employee_id VARCHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY UQ_WORK_ITEM_EMPLOYEE_ASSIGNMENT (work_item_id, employee_id),
        INDEX IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_WORK_ITEM_ID (work_item_id),
        INDEX IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_EMPLOYEE_ID (employee_id)
      )
    `);

    // Guard: add missing timestamp columns if table existed without them
    const hasAgrCreatedAt = await queryRunner.hasColumn(
      'agreements',
      'created_at',
    );
    if (!hasAgrCreatedAt) {
      await queryRunner.query(
        'ALTER TABLE agreements ADD COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)',
      );
    }
    const hasAgrUpdatedAt = await queryRunner.hasColumn(
      'agreements',
      'updated_at',
    );
    if (!hasAgrUpdatedAt) {
      await queryRunner.query(
        'ALTER TABLE agreements ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)',
      );
    }

    const hasAgreementsTable = true;
    const hasDistrictsTable = true;
    const hasBlocksTable = true;
    const hasPanchayatsTable = true;
    const hasVillagesTable = true;
    const hasSubdivisionsTable = true;
    const hasCirclesTable = true;
    const hasZonesTable = true;

    if (!hasUserCodeColumn) {
      await queryRunner.query(
        'ALTER TABLE users ADD COLUMN code varchar(14) NULL',
      );
      hasUserCodeColumn = true;
    }

    if (!hasWorkCodeColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN work_code varchar(13) NULL',
      );
      hasWorkCodeColumn = true;
    }

    // Normalize legacy schemas where users.district_id might still be varchar
    await queryRunner.query(
      'ALTER TABLE users MODIFY COLUMN district_id int NULL',
    );

    // Normalize legacy schemas where district_id might still be varchar
    await queryRunner.query(
      'ALTER TABLE work_items MODIFY COLUMN district_id int NOT NULL',
    );

    const hasBlockIdColumn = await queryRunner.hasColumn(
      'work_items',
      'block_id',
    );
    if (!hasBlockIdColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN block_id int NULL',
      );
    }

    const hasPanchayatIdColumn = await queryRunner.hasColumn(
      'work_items',
      'panchayat_id',
    );
    if (!hasPanchayatIdColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN panchayat_id int NULL',
      );
    }

    const hasVillageIdColumn = await queryRunner.hasColumn(
      'work_items',
      'village_id',
    );
    if (!hasVillageIdColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN village_id int NULL',
      );
    }

    const hasSubdivisionIdColumn = await queryRunner.hasColumn(
      'work_items',
      'subdivision_id',
    );
    if (!hasSubdivisionIdColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN subdivision_id int NULL',
      );
    }

    const hasCircleIdColumn = await queryRunner.hasColumn(
      'work_items',
      'circle_id',
    );
    if (!hasCircleIdColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN circle_id int NULL',
      );
    }

    const hasZoneIdColumn = await queryRunner.hasColumn(
      'work_items',
      'zone_id',
    );
    if (!hasZoneIdColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN zone_id int NULL',
      );
    }

    const hasSchemetypeColumn = await queryRunner.hasColumn(
      'work_items',
      'schemetype',
    );
    if (!hasSchemetypeColumn) {
      await queryRunner.query(
        "ALTER TABLE work_items ADD COLUMN schemetype varchar(100) NOT NULL DEFAULT 'UNKNOWN'",
      );
    }

    const hasNofhtcColumn = await queryRunner.hasColumn('work_items', 'nofhtc');
    if (!hasNofhtcColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN nofhtc varchar(110) NULL',
      );
    }

    const hasAmountApprovedColumn = await queryRunner.hasColumn(
      'work_items',
      'amount_approved',
    );
    if (!hasAmountApprovedColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN amount_approved double NULL',
      );
    }

    const hasPaymentAmountColumn = await queryRunner.hasColumn(
      'work_items',
      'payment_amount',
    );
    if (!hasPaymentAmountColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN payment_amount double NULL',
      );
    }

    const hasSerialNoColumn = await queryRunner.hasColumn(
      'work_items',
      'serial_no',
    );
    if (!hasSerialNoColumn) {
      await queryRunner.query(
        'ALTER TABLE work_items ADD COLUMN serial_no int NULL',
      );
    }

    const hasComponentProgressColumn = await queryRunner.hasColumn(
      'work_item_components',
      'progress',
    );
    if (!hasComponentProgressColumn) {
      await queryRunner.query(
        'ALTER TABLE work_item_components ADD COLUMN progress decimal(12,2) NOT NULL DEFAULT 0',
      );
    }

    await queryRunner.release();

    const passwordPlain = 'Mock@1234';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const seedUsers: SeedUser[] = [
      {
        email: 'ho.mock@jjm.local',
        name: 'Head Office Mock',
        role: UserRole.HO,
      },
      {
        email: 'do.mock@jjm.local',
        name: 'District Officer Mock',
        role: UserRole.DO,
        district_id: 10,
      },
      {
        email: 'co.mock.1@jjm.local',
        name: 'Contractor Mock 1',
        role: UserRole.CO,
        district_id: 10,
      },
      {
        email: 'co.mock.2@jjm.local',
        name: 'Contractor Mock 2',
        role: UserRole.CO,
        district_id: 11,
      },
      {
        email: 'em.mock.1@jjm.local',
        name: 'Employee Mock 1',
        role: UserRole.EM,
        district_id: 10,
      },
      {
        email: 'em.mock.2@jjm.local',
        name: 'Employee Mock 2',
        role: UserRole.EM,
        district_id: 11,
      },
    ];

    await userRepo.upsert(
      seedUsers.map((user, index) => ({
        ...(hasUserCodeColumn
          ? { code: `${user.role}${buildSeedNumericCode(index + 1)}` }
          : {}),
        email: user.email,
        name: user.name,
        role: user.role,
        district_id: user.district_id,
        password: passwordHash,
      })),
      ['email'],
    );

    const allMockUsers = await userRepo.find({
      where: {
        email: In(seedUsers.map((user) => user.email)),
      },
    });

    const usersByEmail = new Map(
      allMockUsers.map((user) => [user.email, user]),
    );

    const contractor1 = usersByEmail.get('co.mock.1@jjm.local');
    const contractor2 = usersByEmail.get('co.mock.2@jjm.local');
    const employee1 = usersByEmail.get('em.mock.1@jjm.local');
    const employee2 = usersByEmail.get('em.mock.2@jjm.local');
    const districtOfficer = usersByEmail.get('do.mock@jjm.local');

    if (
      !contractor1 ||
      !contractor2 ||
      !employee1 ||
      !employee2 ||
      !districtOfficer
    ) {
      throw new Error('Failed to resolve seeded users');
    }

    let seededDistricts: District[] = [];
    let seededBlocks: Block[] = [];
    let seededPanchayats: Panchayat[] = [];
    let seededVillages: Village[] = [];
    let seededSubdivisions: Subdivision[] = [];
    let seededCircles: Circle[] = [];
    let seededZones: Zone[] = [];

    if (hasDistrictsTable) {
      // Clean up any legacy MOCK-prefixed districts
      const oldMockDistricts = await districtRepo
        .createQueryBuilder('district')
        .where('district.district_code LIKE :prefix', { prefix: 'MOCK-%' })
        .getMany();
      if (oldMockDistricts.length > 0) {
        await districtRepo.delete({
          districtid: In(oldMockDistricts.map((d) => d.districtid)),
        });
      }

      const chhatisgarhDistricts = [
        { districtname: 'Balod', district_code: 'CG-BAL' },
        { districtname: 'Balodabazar-Bhatapara', district_code: 'CG-BABA' },
        { districtname: 'Balrampur-Ramanujganj', district_code: 'CG-BARA' },
        { districtname: 'Bastar', district_code: 'CG-BST' },
        { districtname: 'Bemetara', district_code: 'CG-BEM' },
        { districtname: 'Bijapur', district_code: 'CG-BJP' },
        { districtname: 'Bilaspur', district_code: 'CG-BLS' },
        {
          districtname: 'Dakshin Bastar Dantewada',
          district_code: 'CG-DBD',
        },
        { districtname: 'Dhamtari', district_code: 'CG-DHT' },
        { districtname: 'Durg', district_code: 'CG-DRG' },
        { districtname: 'Gariyaband', district_code: 'CG-GRB' },
        { districtname: 'Gaurela-Pendra-Marwahi', district_code: 'CG-GPM' },
        { districtname: 'Janjgir-Champa', district_code: 'CG-JJC' },
        { districtname: 'Jashpur', district_code: 'CG-JSP' },
        { districtname: 'Kabeerdham', district_code: 'CG-KBD' },
        {
          districtname: 'Khairagarh-Chhuikhadan-Gandai',
          district_code: 'CG-KCG',
        },
        { districtname: 'Kondagaon', district_code: 'CG-KDG' },
        { districtname: 'Korba', district_code: 'CG-KRB' },
        { districtname: 'Korea', district_code: 'CG-KOR' },
        { districtname: 'Mahasamund', district_code: 'CG-MHM' },
        {
          districtname: 'Manendragarh-Chirmiri-Bharatpur(M C B)',
          district_code: 'CG-MCB',
        },
        {
          districtname: 'Mohla-Manpur-Ambagarh Chouki',
          district_code: 'CG-MMAC',
        },
        { districtname: 'Mungeli', district_code: 'CG-MNG' },
        { districtname: 'Narayanpur', district_code: 'CG-NRP' },
        { districtname: 'Raigarh', district_code: 'CG-RGH' },
        { districtname: 'Raipur', district_code: 'CG-RPR' },
        { districtname: 'Rajnandgaon', district_code: 'CG-RNG' },
        { districtname: 'Sakti', district_code: 'CG-SKT' },
        { districtname: 'Sarangarh-Bilaigarh', district_code: 'CG-SBG' },
        { districtname: 'Sukma', district_code: 'CG-SKM' },
        { districtname: 'Surajpur', district_code: 'CG-SRP' },
        { districtname: 'Surguja', district_code: 'CG-SRG' },
        { districtname: 'Uttar Bastar Kanker', district_code: 'CG-UBK' },
      ];

      const existingCodes = new Set(
        (await districtRepo.find({ select: ['district_code'] })).map(
          (d) => d.district_code,
        ),
      );

      const toInsert = chhatisgarhDistricts.filter(
        (d) => !existingCodes.has(d.district_code),
      );

      if (toInsert.length > 0) {
        await districtRepo.save(toInsert.map((d) => districtRepo.create(d)));
      }

      seededDistricts = await districtRepo.find({
        where: {
          district_code: In(chhatisgarhDistricts.map((d) => d.district_code)),
        },
        order: { districtid: 'ASC' },
      });
    }

    if (hasBlocksTable && seededDistricts.length > 0) {
      const existingBlocks = await blockRepo
        .createQueryBuilder('block')
        .where('block.block_code LIKE :prefix', { prefix: 'MOCK-%' })
        .getMany();

      if (existingBlocks.length > 0) {
        await blockRepo.delete({
          blockid: In(existingBlocks.map((block) => block.blockid)),
        });
      }

      seededBlocks = await blockRepo.save([
        blockRepo.create({
          blockname: 'Mock Block 10-A',
          block_code: 'MOCK-BLK-10A',
          district_id: seededDistricts[0].districtid,
        }),
        blockRepo.create({
          blockname: 'Mock Block 10-B',
          block_code: 'MOCK-BLK-10B',
          district_id: seededDistricts[0].districtid,
        }),
        blockRepo.create({
          blockname: 'Mock Block 11-A',
          block_code: 'MOCK-BLK-11A',
          district_id: seededDistricts[1].districtid,
        }),
      ]);
    }

    if (hasPanchayatsTable) {
      const existingPanchayats = await panchayatRepo
        .createQueryBuilder('panchayat')
        .where('panchayat.panchayat_code LIKE :prefix', { prefix: 'MOCK-%' })
        .getMany();

      if (existingPanchayats.length > 0) {
        await panchayatRepo.delete({
          panchayatid: In(
            existingPanchayats.map((panchayat) => panchayat.panchayatid),
          ),
        });
      }

      seededPanchayats = await panchayatRepo.save([
        panchayatRepo.create({
          panchayatname: 'Mock Panchayat 10-A',
          panchayat_code: 'MOCK-PAN-10A',
        }),
        panchayatRepo.create({
          panchayatname: 'Mock Panchayat 11-A',
          panchayat_code: 'MOCK-PAN-11A',
        }),
      ]);
    }

    if (hasVillagesTable && seededDistricts.length > 0) {
      const existingVillages = await villageRepo
        .createQueryBuilder('village')
        .where('village.village_code LIKE :prefix', { prefix: 'MOCK-%' })
        .getMany();

      if (existingVillages.length > 0) {
        await villageRepo.delete({
          villageid: In(existingVillages.map((village) => village.villageid)),
        });
      }

      seededVillages = await villageRepo.save([
        villageRepo.create({
          villagename: 'Mock Village 10-A',
          village_code: 'MOCK-VIL-10A',
          district_id: seededDistricts[0].districtid,
        }),
        villageRepo.create({
          villagename: 'Mock Village 10-B',
          village_code: 'MOCK-VIL-10B',
          district_id: seededDistricts[0].districtid,
        }),
        villageRepo.create({
          villagename: 'Mock Village 11-A',
          village_code: 'MOCK-VIL-11A',
          district_id: seededDistricts[1].districtid,
        }),
      ]);
    }

    if (hasSubdivisionsTable) {
      const existingSubdivisions = await subdivisionRepo
        .createQueryBuilder('subdivision')
        .where('subdivision.subdivision_code LIKE :prefix', {
          prefix: 'MOCK-%',
        })
        .getMany();

      if (existingSubdivisions.length > 0) {
        await subdivisionRepo.delete({
          subdivisionid: In(
            existingSubdivisions.map(
              (subdivision) => subdivision.subdivisionid,
            ),
          ),
        });
      }

      seededSubdivisions = await subdivisionRepo.save([
        subdivisionRepo.create({
          subdivisionname: 'Mock Subdivision 10-A',
          subdivision_code: 'MOCK-SUB-10A',
        }),
        subdivisionRepo.create({
          subdivisionname: 'Mock Subdivision 11-A',
          subdivision_code: 'MOCK-SUB-11A',
        }),
      ]);
    }

    if (hasCirclesTable) {
      const existingCircles = await circleRepo
        .createQueryBuilder('circle')
        .where('circle.circle_code LIKE :prefix', { prefix: 'MOCK-%' })
        .getMany();

      if (existingCircles.length > 0) {
        await circleRepo.delete({
          circleid: In(existingCircles.map((circle) => circle.circleid)),
        });
      }

      seededCircles = await circleRepo.save([
        circleRepo.create({
          circlename: 'Mock Circle 10-A',
          circle_code: 'MOCK-CIR-10A',
        }),
        circleRepo.create({
          circlename: 'Mock Circle 11-A',
          circle_code: 'MOCK-CIR-11A',
        }),
      ]);
    }

    if (hasZonesTable) {
      const existingZones = await zoneRepo
        .createQueryBuilder('zone')
        .where('zone.zone_code LIKE :prefix', { prefix: 'MOCK-%' })
        .getMany();

      if (existingZones.length > 0) {
        await zoneRepo.delete({
          zoneid: In(existingZones.map((zone) => zone.zoneid)),
        });
      }

      seededZones = await zoneRepo.save([
        zoneRepo.create({
          zonename: 'Mock Zone 10-A',
          zone_code: 'MOCK-ZON-10A',
        }),
        zoneRepo.create({
          zonename: 'Mock Zone 11-A',
          zone_code: 'MOCK-ZON-11A',
        }),
      ]);
    }

    const existingMockWorkItems = await workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.title LIKE :prefix', { prefix: 'MOCK-%' })
      .getMany();

    if (existingMockWorkItems.length > 0) {
      const mockWorkItemIds = existingMockWorkItems.map(
        (workItem) => workItem.id,
      );
      if (hasAgreementsTable) {
        await agreementRepo.delete({ work_id: In(mockWorkItemIds) });
      }
      await workItemEmployeeAssignmentRepo.delete({
        work_item_id: In(mockWorkItemIds),
      });
      await photoRepo.delete({ work_item_id: In(mockWorkItemIds) });
      await workItemComponentRepo.delete({ work_item_id: In(mockWorkItemIds) });
      await workItemRepo.delete({ id: In(mockWorkItemIds) });
    }

    const workItems = await workItemRepo.save([
      workItemRepo.create({
        ...(hasWorkCodeColumn
          ? { work_code: `W${buildSeedNumericCode(101)}` }
          : {}),
        title: 'MOCK-Work Item 1',
        description: 'Mock data for district 10 - in progress',
        district_id: 10,
        block_id: seededBlocks[0]?.blockid,
        panchayat_id: seededPanchayats[0]?.panchayatid,
        village_id: seededVillages[0]?.villageid,
        subdivision_id: seededSubdivisions[0]?.subdivisionid,
        circle_id: seededCircles[0]?.circleid,
        zone_id: seededZones[0]?.zoneid,
        schemetype: 'PWS',
        nofhtc: '1250',
        amount_approved: 1250000,
        payment_amount: 450000,
        serial_no: 1,
        contractor_id: contractor1.id,
        latitude: 25.5941,
        longitude: 85.1376,
        progress_percentage: 33.33,
        status: WorkItemStatus.IN_PROGRESS,
      }),
      workItemRepo.create({
        ...(hasWorkCodeColumn
          ? { work_code: `W${buildSeedNumericCode(102)}` }
          : {}),
        title: 'MOCK-Work Item 2',
        description: 'Mock data for district 11 - pending',
        district_id: 11,
        block_id: seededBlocks[2]?.blockid,
        panchayat_id: seededPanchayats[1]?.panchayatid,
        village_id: seededVillages[2]?.villageid,
        subdivision_id: seededSubdivisions[1]?.subdivisionid,
        circle_id: seededCircles[1]?.circleid,
        zone_id: seededZones[1]?.zoneid,
        schemetype: 'SVS',
        nofhtc: '980',
        amount_approved: 980000,
        payment_amount: 125000,
        serial_no: 2,
        contractor_id: contractor2.id,
        latitude: 25.3176,
        longitude: 82.9739,
        progress_percentage: 0,
        status: WorkItemStatus.PENDING,
      }),
      workItemRepo.create({
        ...(hasWorkCodeColumn
          ? { work_code: `W${buildSeedNumericCode(103)}` }
          : {}),
        title: 'MOCK-Work Item 3',
        description: 'Mock data for district 10 - completed',
        district_id: 10,
        block_id: seededBlocks[1]?.blockid,
        panchayat_id: seededPanchayats[0]?.panchayatid,
        village_id: seededVillages[1]?.villageid,
        subdivision_id: seededSubdivisions[0]?.subdivisionid,
        circle_id: seededCircles[0]?.circleid,
        zone_id: seededZones[0]?.zoneid,
        schemetype: 'PWS',
        nofhtc: '1570',
        amount_approved: 1570000,
        payment_amount: 1570000,
        serial_no: 3,
        contractor_id: contractor1.id,
        latitude: 28.6139,
        longitude: 77.209,
        progress_percentage: 100,
        status: WorkItemStatus.COMPLETED,
      }),
    ]);

    // Ensure all 12 master components exist with correct order_number/unit
    // (repair existing bad data as well, e.g. all order_number = 0)
    const existingComponents = await componentRepo.find();
    const existingByName = new Map(
      existingComponents.map((component) => [component.name, component]),
    );

    const componentsToSave = STATIC_COMPONENTS.map((staticComponent) => {
      const existing = existingByName.get(staticComponent.name);

      if (existing) {
        existing.unit = staticComponent.unit;
        existing.order_number = staticComponent.order_number;
        return existing;
      }

      return componentRepo.create({
        name: staticComponent.name,
        unit: staticComponent.unit,
        order_number: staticComponent.order_number,
      });
    });

    await componentRepo.save(componentsToSave);

    // Fetch all 12 master components to create mappings
    const masterComponents = await componentRepo.find({
      where: { name: In(STATIC_COMPONENTS.map((component) => component.name)) },
      order: { order_number: 'ASC' },
    });

    if (masterComponents.length !== 12) {
      throw new Error(
        `Expected 12 master components, found ${masterComponents.length}. Run seed-component-templates first.`,
      );
    }

    // Create work_item_components mappings
    const workItemComponentsToCreate: WorkItemComponent[] = [];
    for (const workItem of workItems) {
      for (const masterComponent of masterComponents) {
        // Determine mapping status based on work item status
        let mappingStatus: WorkItemComponentStatus;
        if (workItem.status === WorkItemStatus.COMPLETED) {
          mappingStatus = WorkItemComponentStatus.APPROVED;
        } else if (
          workItem.status === WorkItemStatus.IN_PROGRESS &&
          masterComponent.order_number === 1
        ) {
          mappingStatus = WorkItemComponentStatus.APPROVED;
        } else if (
          workItem.status === WorkItemStatus.IN_PROGRESS &&
          masterComponent.order_number === 2
        ) {
          mappingStatus = WorkItemComponentStatus.IN_PROGRESS;
        } else {
          mappingStatus = WorkItemComponentStatus.PENDING;
        }

        const mapping = new WorkItemComponent();
        mapping.work_item_id = workItem.id;
        mapping.component_id = masterComponent.id;
        mapping.quantity =
          masterComponent.unit === 'Mtr.'
            ? 100 + masterComponent.order_number * 10
            : 1 + masterComponent.order_number;
        mapping.progress =
          mappingStatus === WorkItemComponentStatus.APPROVED
            ? mapping.quantity
            : mappingStatus === WorkItemComponentStatus.IN_PROGRESS
              ? Number((mapping.quantity * 0.5).toFixed(2))
              : 0;
        mapping.remarks = undefined;
        mapping.status = mappingStatus;
        mapping.approved_photo_id = undefined;

        workItemComponentsToCreate.push(mapping);
      }
    }

    const savedWorkItemComponents = await workItemComponentRepo.save(
      workItemComponentsToCreate,
    );

    // Create photos linked to work_item_components mappings
    const photosToCreate: Photo[] = [];

    for (const workItem of workItems) {
      // Get mappings for this work item
      const workItemMappings = savedWorkItemComponents.filter(
        (m) => m.work_item_id === workItem.id,
      );

      if (workItemMappings.length !== 12) {
        throw new Error(
          `Expected 12 mappings for work item ${workItem.id}, found ${workItemMappings.length}`,
        );
      }

      const mapping1 = workItemMappings[0]; // First component
      const mapping2 = workItemMappings[1]; // Second component

      const baseLat = Number(workItem.latitude) || 25.0;
      const baseLong = Number(workItem.longitude) || 85.0;

      photosToCreate.push(
        photoRepo.create({
          image_url: `https://mock-bucket.s3.ap-south-1.amazonaws.com/work-items/${workItem.id}/component-${mapping1.id}/photo-1.jpg`,
          latitude: baseLat,
          longitude: baseLong,
          timestamp: new Date(),
          employee_id: employee1.id,
          component_id: mapping1.id,
          work_item_id: workItem.id,
          is_selected: true,
          selected_by: workItem.contractor_id,
          selected_at: new Date(),
          is_forwarded_to_do: true,
          forwarded_at: new Date(),
        }),
      );

      photosToCreate.push(
        photoRepo.create({
          image_url: `https://mock-bucket.s3.ap-south-1.amazonaws.com/work-items/${workItem.id}/component-${mapping1.id}/photo-2.jpg`,
          latitude: baseLat + 0.0005,
          longitude: baseLong + 0.0005,
          timestamp: new Date(),
          employee_id: employee2.id,
          component_id: mapping1.id,
          work_item_id: workItem.id,
          is_selected: false,
          selected_by: null,
          selected_at: null,
          is_forwarded_to_do: false,
          forwarded_at: null,
        }),
      );

      photosToCreate.push(
        photoRepo.create({
          image_url: `https://mock-bucket.s3.ap-south-1.amazonaws.com/work-items/${workItem.id}/component-${mapping2.id}/photo-1.jpg`,
          latitude: baseLat + 0.001,
          longitude: baseLong + 0.001,
          timestamp: new Date(),
          employee_id: employee1.id,
          component_id: mapping2.id,
          work_item_id: workItem.id,
          is_selected: false,
          selected_by: null,
          selected_at: null,
          is_forwarded_to_do: false,
          forwarded_at: null,
        }),
      );
    }

    const savedPhotos = await photoRepo.save(photosToCreate);

    const workItemEmployeeAssignmentsToCreate: WorkItemEmployeeAssignment[] = [
      workItemEmployeeAssignmentRepo.create({
        work_item_id: workItems[0].id,
        employee_id: employee1.id,
      }),
      workItemEmployeeAssignmentRepo.create({
        work_item_id: workItems[1].id,
        employee_id: employee2.id,
      }),
      workItemEmployeeAssignmentRepo.create({
        work_item_id: workItems[2].id,
        employee_id: employee1.id,
      }),
    ];

    const savedWorkItemEmployeeAssignments =
      await workItemEmployeeAssignmentRepo.save(
        workItemEmployeeAssignmentsToCreate,
      );

    let agreementsCount = 0;
    if (hasAgreementsTable) {
      const financialYear = getCurrentFinancialYear();

      const existingWorkItemAgreements = await agreementRepo.find({
        where: {
          work_id: In(workItems.map((workItem) => workItem.id)),
        },
      });

      if (existingWorkItemAgreements.length > 0) {
        await agreementRepo.delete({
          id: In(existingWorkItemAgreements.map((agreement) => agreement.id)),
        });
      }

      const latestAgreementInYear = await agreementRepo.findOne({
        where: { agreementyear: financialYear },
        order: { created_at: 'DESC' },
      });

      const lastSequence =
        latestAgreementInYear?.agreementno.match(/(\d+)$/)?.[1];
      let nextSequence = lastSequence ? Number(lastSequence) + 1 : 1;

      const savedAgreements = await agreementRepo.save(
        workItems.map((workItem) => {
          const agreementno = `AGR-${financialYear}-${String(nextSequence).padStart(4, '0')}`;
          nextSequence += 1;

          return agreementRepo.create({
            agreementno,
            agreementyear: financialYear,
            contractor_id: workItem.contractor_id,
            work_id: workItem.id,
          });
        }),
      );

      agreementsCount = savedAgreements.length;
    }

    console.log('✅ Mock data seeded successfully');
    console.log(`Users: ${allMockUsers.length}`);
    console.log(`Districts: ${seededDistricts.length}`);
    console.log(`Blocks: ${seededBlocks.length}`);
    console.log(`Panchayats: ${seededPanchayats.length}`);
    console.log(`Villages: ${seededVillages.length}`);
    console.log(`Subdivisions: ${seededSubdivisions.length}`);
    console.log(`Circles: ${seededCircles.length}`);
    console.log(`Zones: ${seededZones.length}`);
    console.log(`Work Items: ${workItems.length}`);
    console.log(`Agreements: ${agreementsCount}`);
    console.log(`Work Item Components: ${savedWorkItemComponents.length}`);
    console.log(
      `Work Item Employee Assignments: ${savedWorkItemEmployeeAssignments.length}`,
    );
    console.log(`Photos: ${savedPhotos.length}`);
    console.log('Mock user password:', passwordPlain);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  seedMockData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to seed mock data:', error);
      process.exit(1);
    });
}
