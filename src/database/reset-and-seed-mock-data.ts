import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { seedMockData } from './seed-mock-data';

async function resetAllData(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    await dataSource.transaction(async (manager) => {
      await manager.query('SET FOREIGN_KEY_CHECKS = 0');

      const tables: Array<{ table_name: string }> = await manager.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);

      const excludedTables = new Set(['migrations', 'typeorm_metadata']);
      const cleanupOrder = [
        'photos',
        'agreements',
        'work_item_employee_assignments',
        'work_item_components',
        'work_items',
        'users',
        'blocks',
        'panchayats',
        'villages',
        'subdivisions',
        'circles',
        'zones',
        'components',
        'districts',
      ];

      const tablePriority = new Map(
        cleanupOrder.map((tableName, index) => [tableName, index]),
      );

      tables.sort((left, right) => {
        const leftPriority = tablePriority.get(left.table_name) ?? 999;
        const rightPriority = tablePriority.get(right.table_name) ?? 999;
        return leftPriority - rightPriority;
      });

      for (const { table_name: tableName } of tables) {
        if (excludedTables.has(tableName)) {
          continue;
        }

        await manager.query(`DELETE FROM \`${tableName}\``);
      }

      await manager.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    console.log('✅ Database data reset completed successfully');
  } finally {
    await app.close();
  }
}

async function resetAndSeedMockData(): Promise<void> {
  await resetAllData();
  await seedMockData();
}

if (require.main === module) {
  resetAndSeedMockData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to reset and seed mock data:', error);
      process.exit(1);
    });
}
