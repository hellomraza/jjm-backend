import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

export async function restoreLocationsBackup(backupFileName?: string) {
  console.log('🔄 Starting restoration of location data from backup file...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    let targetFile = backupFileName;
    if (!targetFile) {
      const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.json')).sort().reverse();
      if (files.length === 0) {
        console.log('ℹ️  No backups found in ./backups directory. A backup snapshot is automatically created when you run `yarn import:locations`.');
        return;
      }
      targetFile = files[0];
    }

    const backupPath = path.join(backupsDir, targetFile);
    console.log(`📂 Restoring from backup file: ${backupPath}`);

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('TRUNCATE TABLE panchayats');
    await dataSource.query('TRUNCATE TABLE blocks');
    await dataSource.query('TRUNCATE TABLE districts');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    if (backupData.districts && backupData.districts.length > 0) {
      console.log(`📥 Restoring ${backupData.districts.length} districts...`);
      for (let i = 0; i < backupData.districts.length; i += 500) {
        const chunk = backupData.districts.slice(i, i + 500);
        await dataSource.createQueryBuilder().insert().into('districts').values(chunk).execute();
      }
    }

    if (backupData.blocks && backupData.blocks.length > 0) {
      console.log(`📥 Restoring ${backupData.blocks.length} blocks...`);
      for (let i = 0; i < backupData.blocks.length; i += 500) {
        const chunk = backupData.blocks.slice(i, i + 500);
        await dataSource.createQueryBuilder().insert().into('blocks').values(chunk).execute();
      }
    }

    if (backupData.panchayats && backupData.panchayats.length > 0) {
      console.log(`📥 Restoring ${backupData.panchayats.length} panchayats...`);
      for (let i = 0; i < backupData.panchayats.length; i += 1000) {
        const chunk = backupData.panchayats.slice(i, i + 1000);
        await dataSource.createQueryBuilder().insert().into('panchayats').values(chunk).execute();
      }
    }

    if (backupData.users && backupData.users.length > 0) {
      console.log(`📥 Restoring ${backupData.users.length} users location columns...`);
      for (const u of backupData.users) {
        await dataSource.query(
          `UPDATE users SET district_id = ?, district_name = ? WHERE id = ?`,
          [u.district_id ?? null, u.district_name ?? null, u.id],
        );
      }
    }

    if (backupData.work_items && backupData.work_items.length > 0) {
      console.log(`📥 Restoring ${backupData.work_items.length} work items location columns...`);
      for (const wi of backupData.work_items) {
        await dataSource.query(
          `UPDATE work_items SET district_id = ?, block_id = ?, panchayat_id = ? WHERE id = ?`,
          [wi.district_id ?? null, wi.block_id ?? null, wi.panchayat_id ?? null, wi.id],
        );
      }
    }

    console.log('✅ Database restoration completed successfully!');
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  const argFile = process.argv[2];
  restoreLocationsBackup(argFile)
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database restoration failed:', err);
      process.exit(1);
    });
}
