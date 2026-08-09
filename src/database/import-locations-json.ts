import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Block } from '../modules/locations/entities/block.entity';
import { District } from '../modules/locations/entities/district.entity';
import { Panchayat } from '../modules/locations/entities/panchayat.entity';

type DistrictJson = {
  district_id?: number;
  districtid?: number;
  districtname: string;
  district_code: string | number;
};

type BlockJson = {
  blockid: number;
  blockname: string;
  block_code: string | number;
  district_id: number;
};

type PanchayatJson = {
  panchayatid: number;
  panchayatname: string;
  panchayat_code: string | number;
  blockid?: number;
  block_id?: number;
};

async function chunkInsert<T extends object>(
  dataSource: DataSource,
  entityClass: new () => T,
  items: Partial<T>[],
  chunkSize: number = 500,
): Promise<number> {
  let totalInserted = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await dataSource.createQueryBuilder().insert().into(entityClass).values(chunk as any).execute();
    totalInserted += chunk.length;
  }
  return totalInserted;
}

export async function importLocationsFromJson() {
  console.log('🚀 Starting import for Districts, Blocks, and Panchayats from JSON files...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const rootDir = process.cwd();
    const districtsPath = path.join(rootDir, 'districts.json');
    const blocksPath = path.join(rootDir, 'blocks.json');
    const panchayatsPath = path.join(rootDir, 'panchayats.json');

    if (!fs.existsSync(districtsPath)) {
      throw new Error(`districts.json not found at ${districtsPath}`);
    }
    if (!fs.existsSync(blocksPath)) {
      throw new Error(`blocks.json not found at ${blocksPath}`);
    }
    if (!fs.existsSync(panchayatsPath)) {
      throw new Error(`panchayats.json not found at ${panchayatsPath}`);
    }

    const rawDistricts: DistrictJson[] = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    const rawBlocks: BlockJson[] = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));
    const rawPanchayats: PanchayatJson[] = JSON.parse(fs.readFileSync(panchayatsPath, 'utf8'));

    console.log(`📦 Loaded JSON data:`);
    console.log(`   - Districts: ${rawDistricts.length}`);
    console.log(`   - Blocks: ${rawBlocks.length}`);
    console.log(`   - Panchayats: ${rawPanchayats.length}`);

    // --- AUTOMATIC BACKUP BEFORE ANY MODIFICATION ---
    console.log('💾 Creating automatic pre-import database backup...');
    const backupsDir = path.join(rootDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const backupDistricts = await dataSource.query(`SELECT * FROM districts`);
    const backupBlocks = await dataSource.query(`SELECT * FROM blocks`);
    const backupPanchayats = await dataSource.query(`SELECT * FROM panchayats`);
    const backupUsers = await dataSource.query(`SELECT id, district_id, district_name FROM users WHERE district_id IS NOT NULL`);
    const backupWorkItems = await dataSource.query(`SELECT id, district_id, block_id, panchayat_id FROM work_items`);
    const backupAgreements = await dataSource.query(`SELECT id, agreementno, contractor_id, division_code FROM agreements`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `location_backup_${timestamp}.json`;
    const backupPath = path.join(backupsDir, backupFileName);

    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          districts: backupDistricts,
          blocks: backupBlocks,
          panchayats: backupPanchayats,
          users: backupUsers,
          work_items: backupWorkItems,
          agreements: backupAgreements,
        },
        null,
        2,
      ),
    );
    console.log(`✅ Pre-import backup successfully created at: ./backups/${backupFileName}`);

    // Map JSON data to entity structures
    const districtRecords: Partial<District>[] = rawDistricts.map((d) => ({
      districtid: Number(d.district_id ?? d.districtid),
      districtname: String(d.districtname).trim(),
      district_code: String(d.district_code).trim(),
    }));

    const blockRecords: Partial<Block>[] = rawBlocks.map((b) => ({
      blockid: Number(b.blockid),
      blockname: String(b.blockname).trim(),
      block_code: String(b.block_code).trim(),
      district_id: Number(b.district_id),
    }));

    const panchayatRecords: Partial<Panchayat>[] = rawPanchayats.map((p) => ({
      panchayatid: Number(p.panchayatid),
      panchayatname: String(p.panchayatname).trim(),
      panchayat_code: String(p.panchayat_code).trim(),
      block_id: p.blockid ?? p.block_id ? Number(p.blockid ?? p.block_id) : null,
    }));

    console.log('🧹 Truncating old location master tables (panchayats, blocks, districts)...');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('TRUNCATE TABLE panchayats');
    await dataSource.query('TRUNCATE TABLE blocks');
    await dataSource.query('TRUNCATE TABLE districts');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('📥 Inserting new districts...');
    const insertedDistricts = await chunkInsert(dataSource, District, districtRecords, 500);

    console.log('📥 Inserting new blocks...');
    const insertedBlocks = await chunkInsert(dataSource, Block, blockRecords, 500);

    console.log('📥 Inserting new panchayats...');
    const insertedPanchayats = await chunkInsert(dataSource, Panchayat, panchayatRecords, 1000);

    console.log('✅ Location tables populated with new JSON data!');
    console.log(`   - Total Districts inserted: ${insertedDistricts}`);
    console.log(`   - Total Blocks inserted: ${insertedBlocks}`);
    console.log(`   - Total Panchayats inserted: ${insertedPanchayats}`);

    console.log('🔄 Re-linking all existing users & work_items to infer valid new location data...');

    const validDistrictCodes = districtRecords.map((d) => String(d.district_code));

    // Group blocks by district_id
    const districtIdToBlocksMap = new Map<number, Partial<Block>[]>();
    for (const b of blockRecords) {
      if (b.district_id) {
        if (!districtIdToBlocksMap.has(b.district_id)) {
          districtIdToBlocksMap.set(b.district_id, []);
        }
        districtIdToBlocksMap.get(b.district_id)!.push(b);
      }
    }

    // Group panchayats by block_id
    const blockIdToPanchayatsMap = new Map<number, Partial<Panchayat>[]>();
    for (const p of panchayatRecords) {
      if (p.block_id) {
        if (!blockIdToPanchayatsMap.has(p.block_id)) {
          blockIdToPanchayatsMap.set(p.block_id, []);
        }
        blockIdToPanchayatsMap.get(p.block_id)!.push(p);
      }
    }

    const getRandomElement = <T>(array: T[]): T =>
      array[Math.floor(Math.random() * array.length)];

    // 1. Update Users (DOs & COs) to infer new District data
    const users = await dataSource.query(
      `SELECT id, district_id, district_name FROM users WHERE district_id IS NOT NULL AND district_id != ''`,
    );
    let updatedUsersCount = 0;

    for (const user of users) {
      if (!validDistrictCodes.includes(String(user.district_id))) {
        const randomDistrict = getRandomElement(districtRecords);
        await dataSource.query(
          `UPDATE users SET district_id = ?, district_name = ? WHERE id = ?`,
          [randomDistrict.district_code, randomDistrict.districtname, user.id],
        );
        updatedUsersCount++;
      }
    }
    console.log(`   - Users updated to infer new district data: ${updatedUsersCount}`);

    // 2. Update Work Items to infer new District, Block, and Panchayat data
    const workItems = await dataSource.query(
      `SELECT id, district_id, block_id, panchayat_id FROM work_items`,
    );
    let updatedWorkItemsCount = 0;

    for (const wi of workItems) {
      let isUpdated = false;
      let newDistrictCode = wi.district_id;
      let newBlockCode = wi.block_id;
      let newPanchayatCode = wi.panchayat_id;

      // Match or infer District
      let selectedDistrict = districtRecords.find(
        (d) => String(d.district_code) === String(wi.district_id),
      );
      if (!selectedDistrict) {
        selectedDistrict = getRandomElement(districtRecords);
        newDistrictCode = selectedDistrict.district_code;
        isUpdated = true;
      }

      // Match or infer Block
      const availableBlocks =
        districtIdToBlocksMap.get(selectedDistrict.districtid!) || blockRecords;
      let selectedBlock = availableBlocks.find(
        (b) => String(b.block_code) === String(wi.block_id),
      );
      if (!selectedBlock) {
        selectedBlock = getRandomElement(availableBlocks);
        newBlockCode = selectedBlock.block_code;
        isUpdated = true;
      }

      // Match or infer Panchayat
      if (wi.panchayat_id || isUpdated) {
        const availablePanchayats =
          blockIdToPanchayatsMap.get(selectedBlock.blockid!) || panchayatRecords;
        let selectedPanchayat = availablePanchayats.find(
          (p) => String(p.panchayat_code) === String(wi.panchayat_id),
        );
        if (!selectedPanchayat) {
          selectedPanchayat = getRandomElement(availablePanchayats);
          newPanchayatCode = selectedPanchayat.panchayat_code;
          isUpdated = true;
        }
      }

      if (isUpdated) {
        await dataSource.query(
          `UPDATE work_items SET district_id = ?, block_id = ?, panchayat_id = ? WHERE id = ?`,
          [newDistrictCode, newBlockCode, newPanchayatCode, wi.id],
        );
        updatedWorkItemsCount++;
      }
    }
    console.log(`   - Work items updated to infer new location hierarchy: ${updatedWorkItemsCount}`);

    console.log(`🎉 Import complete! In case you need to revert, run: yarn restore:locations ${backupFileName}`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  importLocationsFromJson()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Location import failed:', err);
      process.exit(1);
    });
}
