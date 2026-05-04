import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class RefactorComponentsArchitecture1741436000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const workItemComponentsExists = await queryRunner.hasTable(
      'work_item_components',
    );
    if (workItemComponentsExists) {
      return;
    }

    // Step 1: Drop existing components table (old per-work-item schema)
    const workItemComponentsTable = await queryRunner.getTable(
      'work_item_components',
    );
    const componentForeignKey =
      workItemComponentsTable?.foreignKeys.find((foreignKey) =>
        foreignKey.columnNames.includes('component_id'),
      ) ?? null;

    if (componentForeignKey) {
      await queryRunner.dropForeignKey(
        'work_item_components',
        componentForeignKey,
      );
    }

    await queryRunner.dropTable('components', true);

    // Step 2: Create new components table (master static data)
    await queryRunner.createTable(
      new Table({
        name: 'components',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'order_number',
            type: 'int',
            isNullable: false,
            isUnique: true,
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
      true,
    );

    // Step 3: Create work_item_components mapping table
    await queryRunner.createTable(
      new Table({
        name: 'work_item_components',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'work_item_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'component_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'remarks',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED'],
            default: "'PENDING'",
          },
          {
            name: 'approved_photo_id',
            type: 'int',
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
        foreignKeys: [
          {
            columnNames: ['work_item_id'],
            referencedTableName: 'work_items',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['component_id'],
            referencedTableName: 'components',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    // Step 4: Create indexes on work_item_components
    await queryRunner.createIndex(
      'work_item_components',
      new TableIndex({
        name: 'IDX_WORK_ITEM_COMPONENT_WORK_ITEM_ID',
        columnNames: ['work_item_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_item_components',
      new TableIndex({
        name: 'IDX_WORK_ITEM_COMPONENT_COMPONENT_ID',
        columnNames: ['component_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_item_components',
      new TableIndex({
        name: 'IDX_WORK_ITEM_COMPONENT_WORK_ITEM_COMPONENT',
        columnNames: ['work_item_id', 'component_id'],
        isUnique: true,
      }),
    );

    // Step 5: Create index on components order_number
    await queryRunner.createIndex(
      'components',
      new TableIndex({
        name: 'IDX_COMPONENT_ORDER_NUMBER',
        columnNames: ['order_number'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'work_item_components',
      'IDX_WORK_ITEM_COMPONENT_WORK_ITEM_COMPONENT',
    );
    await queryRunner.dropIndex(
      'work_item_components',
      'IDX_WORK_ITEM_COMPONENT_COMPONENT_ID',
    );
    await queryRunner.dropIndex(
      'work_item_components',
      'IDX_WORK_ITEM_COMPONENT_WORK_ITEM_ID',
    );
    await queryRunner.dropIndex('components', 'IDX_COMPONENT_ORDER_NUMBER');
    await queryRunner.dropTable('work_item_components');
    await queryRunner.dropTable('components');
  }
}
