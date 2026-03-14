import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddWorkItemLocationAndSchemeFields1762453200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasDistrictsTable = await queryRunner.hasTable('districts');
    if (!hasDistrictsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'districts',
          columns: [
            {
              name: 'districtid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'districtname',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'district_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'districts',
        new TableIndex({
          name: 'IDX_DISTRICTS_CODE',
          columnNames: ['district_code'],
        }),
      );
    }

    const hasBlocksTable = await queryRunner.hasTable('blocks');
    if (!hasBlocksTable) {
      await queryRunner.createTable(
        new Table({
          name: 'blocks',
          columns: [
            {
              name: 'blockid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'blockname',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'block_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'district_id',
              type: 'int',
              isNullable: false,
            },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_BLOCKS_DISTRICT_ID',
              columnNames: ['district_id'],
              referencedTableName: 'districts',
              referencedColumnNames: ['districtid'],
              onDelete: 'RESTRICT',
              onUpdate: 'CASCADE',
            }),
          ],
        }),
      );

      await queryRunner.createIndex(
        'blocks',
        new TableIndex({
          name: 'IDX_BLOCKS_CODE',
          columnNames: ['block_code'],
        }),
      );

      await queryRunner.createIndex(
        'blocks',
        new TableIndex({
          name: 'IDX_BLOCKS_DISTRICT_ID',
          columnNames: ['district_id'],
        }),
      );
    }

    const hasPanchayatsTable = await queryRunner.hasTable('panchayats');
    if (!hasPanchayatsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'panchayats',
          columns: [
            {
              name: 'panchayatid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'panchayatname',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'panchayat_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'panchayats',
        new TableIndex({
          name: 'IDX_PANCHAYATS_CODE',
          columnNames: ['panchayat_code'],
        }),
      );
    }

    const hasVillagesTable = await queryRunner.hasTable('villages');
    if (!hasVillagesTable) {
      await queryRunner.createTable(
        new Table({
          name: 'villages',
          columns: [
            {
              name: 'villageid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'villagename',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'village_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'district_id',
              type: 'int',
              isNullable: false,
            },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_VILLAGES_DISTRICT_ID',
              columnNames: ['district_id'],
              referencedTableName: 'districts',
              referencedColumnNames: ['districtid'],
              onDelete: 'RESTRICT',
              onUpdate: 'CASCADE',
            }),
          ],
        }),
      );

      await queryRunner.createIndex(
        'villages',
        new TableIndex({
          name: 'IDX_VILLAGES_CODE',
          columnNames: ['village_code'],
        }),
      );

      await queryRunner.createIndex(
        'villages',
        new TableIndex({
          name: 'IDX_VILLAGES_DISTRICT_ID',
          columnNames: ['district_id'],
        }),
      );
    }

    const hasSubdivisionsTable = await queryRunner.hasTable('subdivisions');
    if (!hasSubdivisionsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'subdivisions',
          columns: [
            {
              name: 'subdivisionid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'subdivisionname',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'subdivision_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'subdivisions',
        new TableIndex({
          name: 'IDX_SUBDIVISIONS_CODE',
          columnNames: ['subdivision_code'],
        }),
      );
    }

    const hasCirclesTable = await queryRunner.hasTable('circles');
    if (!hasCirclesTable) {
      await queryRunner.createTable(
        new Table({
          name: 'circles',
          columns: [
            {
              name: 'circleid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'circlename',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'circle_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'circles',
        new TableIndex({
          name: 'IDX_CIRCLES_CODE',
          columnNames: ['circle_code'],
        }),
      );
    }

    const hasZonesTable = await queryRunner.hasTable('zones');
    if (!hasZonesTable) {
      await queryRunner.createTable(
        new Table({
          name: 'zones',
          columns: [
            {
              name: 'zoneid',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'zonename',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'zone_code',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'zones',
        new TableIndex({
          name: 'IDX_ZONES_CODE',
          columnNames: ['zone_code'],
        }),
      );
    }

    const workItemsTable = await queryRunner.getTable('work_items');
    if (!workItemsTable) {
      return;
    }

    const addColumnIfMissing = async (column: TableColumn): Promise<void> => {
      const hasColumn = workItemsTable.columns.some(
        (existingColumn) => existingColumn.name === column.name,
      );

      if (!hasColumn) {
        await queryRunner.addColumn('work_items', column);
      }
    };

    await addColumnIfMissing(
      new TableColumn({
        name: 'block_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'panchayat_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'village_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'subdivision_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'circle_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'zone_id',
        type: 'int',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'schemetype',
        type: 'varchar',
        length: '100',
        isNullable: false,
        default: "'UNKNOWN'",
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'nofhtc',
        type: 'varchar',
        length: '110',
        isNullable: true,
        default: null,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'amount_approved',
        type: 'double',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'payment_amount',
        type: 'double',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'serial_no',
        type: 'int',
        isNullable: true,
      }),
    );

    const latestWorkItemsTable = await queryRunner.getTable('work_items');
    const createIndexIfMissing = async (
      name: string,
      columnNames: string[],
    ) => {
      const exists =
        latestWorkItemsTable?.indices.some((index) => index.name === name) ??
        false;

      if (!exists) {
        await queryRunner.createIndex(
          'work_items',
          new TableIndex({
            name,
            columnNames,
          }),
        );
      }
    };

    await createIndexIfMissing('IDX_WORK_ITEMS_BLOCK_ID', ['block_id']);
    await createIndexIfMissing('IDX_WORK_ITEMS_PANCHAYAT_ID', ['panchayat_id']);
    await createIndexIfMissing('IDX_WORK_ITEMS_VILLAGE_ID', ['village_id']);
    await createIndexIfMissing('IDX_WORK_ITEMS_SUBDIVISION_ID', [
      'subdivision_id',
    ]);
    await createIndexIfMissing('IDX_WORK_ITEMS_CIRCLE_ID', ['circle_id']);
    await createIndexIfMissing('IDX_WORK_ITEMS_ZONE_ID', ['zone_id']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const workItemsTable = await queryRunner.getTable('work_items');

    const dropIndexIfExists = async (name: string): Promise<void> => {
      const exists = workItemsTable?.indices.some(
        (index) => index.name === name,
      );
      if (exists) {
        await queryRunner.dropIndex('work_items', name);
      }
    };

    await dropIndexIfExists('IDX_WORK_ITEMS_BLOCK_ID');
    await dropIndexIfExists('IDX_WORK_ITEMS_PANCHAYAT_ID');
    await dropIndexIfExists('IDX_WORK_ITEMS_VILLAGE_ID');
    await dropIndexIfExists('IDX_WORK_ITEMS_SUBDIVISION_ID');
    await dropIndexIfExists('IDX_WORK_ITEMS_CIRCLE_ID');
    await dropIndexIfExists('IDX_WORK_ITEMS_ZONE_ID');

    const dropColumnIfExists = async (name: string): Promise<void> => {
      const latestWorkItemsTable = await queryRunner.getTable('work_items');
      const exists =
        latestWorkItemsTable?.columns.some((column) => column.name === name) ??
        false;

      if (exists) {
        await queryRunner.dropColumn('work_items', name);
      }
    };

    await dropColumnIfExists('serial_no');
    await dropColumnIfExists('payment_amount');
    await dropColumnIfExists('amount_approved');
    await dropColumnIfExists('nofhtc');
    await dropColumnIfExists('schemetype');
    await dropColumnIfExists('zone_id');
    await dropColumnIfExists('circle_id');
    await dropColumnIfExists('subdivision_id');
    await dropColumnIfExists('village_id');
    await dropColumnIfExists('panchayat_id');
    await dropColumnIfExists('block_id');

    const dropTableIfExists = async (name: string): Promise<void> => {
      const exists = await queryRunner.hasTable(name);
      if (exists) {
        await queryRunner.dropTable(name);
      }
    };

    await dropTableIfExists('zones');
    await dropTableIfExists('circles');
    await dropTableIfExists('subdivisions');
    await dropTableIfExists('villages');
    await dropTableIfExists('panchayats');
    await dropTableIfExists('blocks');
    await dropTableIfExists('districts');
  }
}
