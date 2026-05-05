import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePhotoStatusesTable1762563607000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('photo_statuses');
    if (hasTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'photo_statuses',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'UUID()',
          },
          {
            name: 'photo_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'work_item_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'component_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['UPLOADED', 'SELECTED', 'APPROVED'],
            default: "'UPLOADED'",
          },
          {
            name: 'selected_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'selected_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'approved_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indices
    await queryRunner.createIndex(
      'photo_statuses',
      new TableIndex({
        name: 'IDX_PHOTO_STATUS_PHOTO_ID',
        columnNames: ['photo_id'],
      }),
    );

    await queryRunner.createIndex(
      'photo_statuses',
      new TableIndex({
        name: 'IDX_PHOTO_STATUS_WORK_ITEM_ID',
        columnNames: ['work_item_id'],
      }),
    );

    await queryRunner.createIndex(
      'photo_statuses',
      new TableIndex({
        name: 'IDX_PHOTO_STATUS_COMPONENT_ID',
        columnNames: ['component_id'],
      }),
    );

    await queryRunner.createIndex(
      'photo_statuses',
      new TableIndex({
        name: 'IDX_PHOTO_STATUS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'photo_statuses',
      new TableIndex({
        name: 'IDX_PHOTO_STATUS_WORK_COMPONENT',
        columnNames: ['work_item_id', 'component_id'],
      }),
    );

    await queryRunner.createIndex(
      'photo_statuses',
      new TableIndex({
        name: 'IDX_PHOTO_STATUS_WORK_COMPONENT_STATUS',
        columnNames: ['work_item_id', 'component_id', 'status'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKeys('photo_statuses', [
      new TableForeignKey({
        name: 'FK_PHOTO_STATUS_PHOTO_ID',
        columnNames: ['photo_id'],
        referencedTableName: 'photos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_PHOTO_STATUS_WORK_ITEM_ID',
        columnNames: ['work_item_id'],
        referencedTableName: 'work_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_PHOTO_STATUS_COMPONENT_ID',
        columnNames: ['component_id'],
        referencedTableName: 'components',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_PHOTO_STATUS_SELECTED_BY',
        columnNames: ['selected_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'FK_PHOTO_STATUS_APPROVED_BY',
        columnNames: ['approved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('photo_statuses');
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable('photo_statuses');

    // Drop foreign keys
    const fkNames = [
      'FK_PHOTO_STATUS_PHOTO_ID',
      'FK_PHOTO_STATUS_WORK_ITEM_ID',
      'FK_PHOTO_STATUS_COMPONENT_ID',
      'FK_PHOTO_STATUS_SELECTED_BY',
      'FK_PHOTO_STATUS_APPROVED_BY',
    ];

    for (const fkName of fkNames) {
      const hasFk =
        table?.foreignKeys.some((fk) => fk.name === fkName) ?? false;
      if (hasFk) {
        await queryRunner.dropForeignKey('photo_statuses', fkName);
      }
    }

    // Drop indices
    const indexNames = [
      'IDX_PHOTO_STATUS_PHOTO_ID',
      'IDX_PHOTO_STATUS_WORK_ITEM_ID',
      'IDX_PHOTO_STATUS_COMPONENT_ID',
      'IDX_PHOTO_STATUS_STATUS',
      'IDX_PHOTO_STATUS_WORK_COMPONENT',
      'IDX_PHOTO_STATUS_WORK_COMPONENT_STATUS',
    ];

    for (const indexName of indexNames) {
      const latestTable = await queryRunner.getTable('photo_statuses');
      const hasIndex =
        latestTable?.indices.some((index) => index.name === indexName) ?? false;
      if (hasIndex) {
        await queryRunner.dropIndex('photo_statuses', indexName);
      }
    }

    await queryRunner.dropTable('photo_statuses');
  }
}
