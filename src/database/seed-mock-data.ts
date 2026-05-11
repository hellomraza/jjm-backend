import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../app.module';
import { Component } from '../modules/components/entities/component.entity';
import { Block } from '../modules/locations/entities/block.entity';
import { Circle } from '../modules/locations/entities/circle.entity';
import { District } from '../modules/locations/entities/district.entity';
import { Panchayat } from '../modules/locations/entities/panchayat.entity';
import { Subdivision } from '../modules/locations/entities/subdivision.entity';
import { Village } from '../modules/locations/entities/village.entity';
import { Zone } from '../modules/locations/entities/zone.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';

type SeedUser = {
  email: string;
  name: string;
  role: UserRole;
  district_id?: string;
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

const usedLocationCodes = new Set<string>();

const generateLocationCode = (): string => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const firstDigit = Math.random() < 0.5 ? '5' : '6';
    const suffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const code = `${firstDigit}${suffix}`;

    if (!usedLocationCodes.has(code)) {
      usedLocationCodes.add(code);
      return code;
    }
  }

  throw new Error('Unable to generate unique location code');
};

export async function seedMockData() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    const userRepo = dataSource.getRepository(User);
    const componentRepo = dataSource.getRepository(Component);
    const districtRepo = dataSource.getRepository(District);
    const blockRepo = dataSource.getRepository(Block);
    const panchayatRepo = dataSource.getRepository(Panchayat);
    const villageRepo = dataSource.getRepository(Village);
    const subdivisionRepo = dataSource.getRepository(Subdivision);
    const circleRepo = dataSource.getRepository(Circle);
    const zoneRepo = dataSource.getRepository(Zone);

    let queryRunner = dataSource.createQueryRunner();

    const requiredBaseTables = ['users', 'components'];

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

    // Guard: add missing timestamp columns if table existed without them
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

    // Normalize legacy schemas where users.district_id might still be int
    await queryRunner.query(
      'ALTER TABLE users MODIFY COLUMN district_id varchar(100) NULL',
    );

    await queryRunner.release();

    const passwordPlain = 'Mock@1234';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const seedUsers: SeedUser[] = [
      {
        email: 'ho@gmail.com',
        name: 'Head Office',
        role: UserRole.HO,
      },
      {
        email: 'do1@gmail.com',
        name: 'District Officer 1',
        role: UserRole.DO,
      },
      {
        email: 'do2@gmail.com',
        name: 'District Officer 2',
        role: UserRole.DO,
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

    const ho = usersByEmail.get('ho@gmail.com');
    const do1 = usersByEmail.get('do1@gmail.com');
    const do2 = usersByEmail.get('do2@gmail.com');

    if (!ho || !do1 || !do2) {
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
        { districtname: 'Balod', district_code: generateLocationCode() },
        {
          districtname: 'Balodabazar-Bhatapara',
          district_code: generateLocationCode(),
        },
        {
          districtname: 'Balrampur-Ramanujganj',
          district_code: generateLocationCode(),
        },
        { districtname: 'Bastar', district_code: generateLocationCode() },
        { districtname: 'Bemetara', district_code: generateLocationCode() },
        { districtname: 'Bijapur', district_code: generateLocationCode() },
        { districtname: 'Bilaspur', district_code: generateLocationCode() },
        {
          districtname: 'Dakshin Bastar Dantewada',
          district_code: generateLocationCode(),
        },
        { districtname: 'Dhamtari', district_code: generateLocationCode() },
        { districtname: 'Durg', district_code: generateLocationCode() },
        { districtname: 'Gariyaband', district_code: generateLocationCode() },
        {
          districtname: 'Gaurela-Pendra-Marwahi',
          district_code: generateLocationCode(),
        },
        {
          districtname: 'Janjgir-Champa',
          district_code: generateLocationCode(),
        },
        { districtname: 'Jashpur', district_code: generateLocationCode() },
        { districtname: 'Kabeerdham', district_code: generateLocationCode() },
        {
          districtname: 'Khairagarh-Chhuikhadan-Gandai',
          district_code: generateLocationCode(),
        },
        { districtname: 'Kondagaon', district_code: generateLocationCode() },
        { districtname: 'Korba', district_code: generateLocationCode() },
        { districtname: 'Korea', district_code: generateLocationCode() },
        { districtname: 'Mahasamund', district_code: generateLocationCode() },
        {
          districtname: 'Manendragarh-Chirmiri-Bharatpur(M C B)',
          district_code: generateLocationCode(),
        },
        {
          districtname: 'Mohla-Manpur-Ambagarh Chouki',
          district_code: generateLocationCode(),
        },
        { districtname: 'Mungeli', district_code: generateLocationCode() },
        { districtname: 'Narayanpur', district_code: generateLocationCode() },
        { districtname: 'Raigarh', district_code: generateLocationCode() },
        { districtname: 'Raipur', district_code: generateLocationCode() },
        {
          districtname: 'Rajnandgaon',
          district_code: generateLocationCode(),
        },
        { districtname: 'Sakti', district_code: generateLocationCode() },
        {
          districtname: 'Sarangarh-Bilaigarh',
          district_code: generateLocationCode(),
        },
        { districtname: 'Sukma', district_code: generateLocationCode() },
        { districtname: 'Surajpur', district_code: generateLocationCode() },
        { districtname: 'Surguja', district_code: generateLocationCode() },
        {
          districtname: 'Uttar Bastar Kanker',
          district_code: generateLocationCode(),
        },
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
        .where('block.block_code LIKE :prefix', { prefix: 'BLK-%' })
        .getMany();

      if (existingBlocks.length > 0) {
        await blockRepo.delete({
          blockid: In(existingBlocks.map((block) => block.blockid)),
        });
      }

      // Real Chhattisgarh blocks for selected districts
      const realBlocks = [
        // Raipur blocks
        {
          blockname: 'Abhanpur',
          block_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        {
          blockname: 'Arang',
          block_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        {
          blockname: 'Asind',
          block_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        // Durg blocks
        {
          blockname: 'Durg',
          block_code: generateLocationCode(),
          districtname: 'Durg',
        },
        {
          blockname: 'Dhamdha',
          block_code: generateLocationCode(),
          districtname: 'Durg',
        },
        {
          blockname: 'Bhilai',
          block_code: generateLocationCode(),
          districtname: 'Durg',
        },
        // Bilaspur blocks
        {
          blockname: 'Bilaspur',
          block_code: generateLocationCode(),
          districtname: 'Bilaspur',
        },
        {
          blockname: 'Takhatpur',
          block_code: generateLocationCode(),
          districtname: 'Bilaspur',
        },
        {
          blockname: 'Gaurela',
          block_code: generateLocationCode(),
          districtname: 'Bilaspur',
        },
        // Korba blocks
        {
          blockname: 'Korba',
          block_code: generateLocationCode(),
          districtname: 'Korba',
        },
        {
          blockname: 'Katghora',
          block_code: generateLocationCode(),
          districtname: 'Korba',
        },
        {
          blockname: 'Karmgarh',
          block_code: generateLocationCode(),
          districtname: 'Korba',
        },
      ];

      for (const block of realBlocks) {
        const district = seededDistricts.find(
          (d) => d.districtname === block.districtname,
        );
        if (district) {
          await blockRepo.save(
            blockRepo.create({
              blockname: block.blockname,
              block_code: block.block_code,
              district_id: district.districtid,
            }),
          );
        }
      }

      seededBlocks = await blockRepo.find({
        take: 12,
        order: { blockid: 'ASC' },
      });
    }

    if (hasPanchayatsTable) {
      const existingPanchayats = await panchayatRepo
        .createQueryBuilder('panchayat')
        .where('panchayat.panchayat_code LIKE :prefix', { prefix: 'PAN-%' })
        .getMany();

      if (existingPanchayats.length > 0) {
        await panchayatRepo.delete({
          panchayatid: In(
            existingPanchayats.map((panchayat) => panchayat.panchayatid),
          ),
        });
      }

      const realPanchayats = [
        {
          panchayatname: 'Abhanpur',
          panchayat_code: generateLocationCode(),
        },
        { panchayatname: 'Arang', panchayat_code: generateLocationCode() },
        { panchayatname: 'Asind', panchayat_code: generateLocationCode() },
        { panchayatname: 'Durg', panchayat_code: generateLocationCode() },
        { panchayatname: 'Dhamdha', panchayat_code: generateLocationCode() },
        { panchayatname: 'Bhilai', panchayat_code: generateLocationCode() },
        {
          panchayatname: 'Bilaspur',
          panchayat_code: generateLocationCode(),
        },
        {
          panchayatname: 'Takhatpur',
          panchayat_code: generateLocationCode(),
        },
        {
          panchayatname: 'Katghora',
          panchayat_code: generateLocationCode(),
        },
        { panchayatname: 'Raigarh', panchayat_code: generateLocationCode() },
        {
          panchayatname: 'Manendragarh',
          panchayat_code: generateLocationCode(),
        },
        { panchayatname: 'Surguja', panchayat_code: generateLocationCode() },
      ];

      seededPanchayats = await panchayatRepo.save(
        realPanchayats.map((p) =>
          panchayatRepo.create({
            panchayatname: p.panchayatname,
            panchayat_code: p.panchayat_code,
          }),
        ),
      );
    }

    if (hasVillagesTable && seededDistricts.length > 0) {
      const existingVillages = await villageRepo
        .createQueryBuilder('village')
        .where('village.village_code LIKE :prefix', { prefix: 'VIL-%' })
        .getMany();

      if (existingVillages.length > 0) {
        await villageRepo.delete({
          villageid: In(existingVillages.map((village) => village.villageid)),
        });
      }

      // Real Chhattisgarh villages
      const realVillages = [
        {
          villagename: 'Abhanpur',
          village_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        {
          villagename: 'Arang',
          village_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        {
          villagename: 'Asind',
          village_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        {
          villagename: 'Khamharia',
          village_code: generateLocationCode(),
          districtname: 'Raipur',
        },
        {
          villagename: 'Durg City',
          village_code: generateLocationCode(),
          districtname: 'Durg',
        },
        {
          villagename: 'Dhamdha',
          village_code: generateLocationCode(),
          districtname: 'Durg',
        },
        {
          villagename: 'Bhilai',
          village_code: generateLocationCode(),
          districtname: 'Durg',
        },
        {
          villagename: 'Jamul',
          village_code: generateLocationCode(),
          districtname: 'Durg',
        },
        {
          villagename: 'Bilaspur City',
          village_code: generateLocationCode(),
          districtname: 'Bilaspur',
        },
        {
          villagename: 'Takhatpur',
          village_code: generateLocationCode(),
          districtname: 'Bilaspur',
        },
        {
          villagename: 'Korba City',
          village_code: generateLocationCode(),
          districtname: 'Korba',
        },
        {
          villagename: 'Katghora',
          village_code: generateLocationCode(),
          districtname: 'Korba',
        },
      ];

      for (const village of realVillages) {
        const district = seededDistricts.find(
          (d) => d.districtname === village.districtname,
        );
        if (district) {
          await villageRepo.save(
            villageRepo.create({
              villagename: village.villagename,
              village_code: village.village_code,
              district_id: district.districtid,
            }),
          );
        }
      }

      seededVillages = await villageRepo.find({
        take: 12,
        order: { villageid: 'ASC' },
      });
    }

    if (hasSubdivisionsTable) {
      const existingSubdivisions = await subdivisionRepo
        .createQueryBuilder('subdivision')
        .where('subdivision.subdivision_code LIKE :prefix', {
          prefix: 'SUB-%',
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

      const realSubdivisions = [
        {
          subdivisionname: 'Raipur Sadar',
          subdivision_code: generateLocationCode(),
        },
        { subdivisionname: 'Durg', subdivision_code: generateLocationCode() },
        {
          subdivisionname: 'Bilaspur',
          subdivision_code: generateLocationCode(),
        },
        { subdivisionname: 'Korba', subdivision_code: generateLocationCode() },
        {
          subdivisionname: 'Raigarh',
          subdivision_code: generateLocationCode(),
        },
        {
          subdivisionname: 'Janjgir-Champa',
          subdivision_code: generateLocationCode(),
        },
        {
          subdivisionname: 'Jashpur',
          subdivision_code: generateLocationCode(),
        },
        {
          subdivisionname: 'Surguja',
          subdivision_code: generateLocationCode(),
        },
        { subdivisionname: 'Bastar', subdivision_code: generateLocationCode() },
        {
          subdivisionname: 'Rajnandgaon',
          subdivision_code: generateLocationCode(),
        },
        {
          subdivisionname: 'Dhamtari',
          subdivision_code: generateLocationCode(),
        },
        {
          subdivisionname: 'Mahasamund',
          subdivision_code: generateLocationCode(),
        },
      ];

      seededSubdivisions = await subdivisionRepo.save(
        realSubdivisions.map((s) =>
          subdivisionRepo.create({
            subdivisionname: s.subdivisionname,
            subdivision_code: s.subdivision_code,
          }),
        ),
      );
    }

    if (hasCirclesTable) {
      const existingCircles = await circleRepo
        .createQueryBuilder('circle')
        .where('circle.circle_code LIKE :prefix', { prefix: 'CIR-%' })
        .getMany();

      if (existingCircles.length > 0) {
        await circleRepo.delete({
          circleid: In(existingCircles.map((circle) => circle.circleid)),
        });
      }

      const realCircles = [
        {
          circlename: 'Raipur Circle',
          circle_code: generateLocationCode(),
        },
        { circlename: 'Durg Circle', circle_code: generateLocationCode() },
        {
          circlename: 'Bilaspur Circle',
          circle_code: generateLocationCode(),
        },
        { circlename: 'Korba Circle', circle_code: generateLocationCode() },
        {
          circlename: 'Raigarh Circle',
          circle_code: generateLocationCode(),
        },
        {
          circlename: 'Janjgir Circle',
          circle_code: generateLocationCode(),
        },
        { circlename: 'Jashpur Circle', circle_code: generateLocationCode() },
        { circlename: 'Surguja Circle', circle_code: generateLocationCode() },
        { circlename: 'Bastar Circle', circle_code: generateLocationCode() },
        {
          circlename: 'Rajnandgaon Circle',
          circle_code: generateLocationCode(),
        },
        { circlename: 'Dhamtari Circle', circle_code: generateLocationCode() },
        {
          circlename: 'Mahasamund Circle',
          circle_code: generateLocationCode(),
        },
      ];

      seededCircles = await circleRepo.save(
        realCircles.map((c) =>
          circleRepo.create({
            circlename: c.circlename,
            circle_code: c.circle_code,
          }),
        ),
      );
    }

    if (hasZonesTable) {
      const existingZones = await zoneRepo
        .createQueryBuilder('zone')
        .where('zone.zone_code LIKE :prefix', { prefix: 'ZON-%' })
        .getMany();

      if (existingZones.length > 0) {
        await zoneRepo.delete({
          zoneid: In(existingZones.map((zone) => zone.zoneid)),
        });
      }

      const realZones = [
        { zonename: 'Raipur Zone', zone_code: generateLocationCode() },
        { zonename: 'Durg Zone', zone_code: generateLocationCode() },
        { zonename: 'Bilaspur Zone', zone_code: generateLocationCode() },
        { zonename: 'Korba Zone', zone_code: generateLocationCode() },
        { zonename: 'Raigarh Zone', zone_code: generateLocationCode() },
        { zonename: 'Janjgir Zone', zone_code: generateLocationCode() },
        { zonename: 'Jashpur Zone', zone_code: generateLocationCode() },
        { zonename: 'Surguja Zone', zone_code: generateLocationCode() },
        { zonename: 'Bastar Zone', zone_code: generateLocationCode() },
        { zonename: 'Rajnandgaon Zone', zone_code: generateLocationCode() },
        { zonename: 'Dhamtari Zone', zone_code: generateLocationCode() },
        { zonename: 'Mahasamund Zone', zone_code: generateLocationCode() },
      ];

      seededZones = await zoneRepo.save(
        realZones.map((z) =>
          zoneRepo.create({
            zonename: z.zonename,
            zone_code: z.zone_code,
          }),
        ),
      );
    }

    if (seededDistricts.length < 2) {
      throw new Error('At least two districts are required for DO mock users');
    }

    do1.district_id = seededDistricts[0].district_code;
    do1.district_name = seededDistricts[0].districtname;
    do2.district_id = seededDistricts[1].district_code;
    do2.district_name = seededDistricts[1].districtname;
    await userRepo.save([do1, do2]);

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

    console.log('✅ Mock data seeded successfully');
    console.log(`Users: ${allMockUsers.length}`);
    console.log(`Districts: ${seededDistricts.length}`);
    console.log(`Blocks: ${seededBlocks.length}`);
    console.log(`Panchayats: ${seededPanchayats.length}`);
    console.log(`Villages: ${seededVillages.length}`);
    console.log(`Subdivisions: ${seededSubdivisions.length}`);
    console.log(`Circles: ${seededCircles.length}`);
    console.log(`Zones: ${seededZones.length}`);
    console.log(`Components: ${componentsToSave.length}`);
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
