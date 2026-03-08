import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateWorkItemComponentsTable1741438800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('work_item_components');
    if (hasTable) {
      return;
    }

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
            default: `'PENDING'`,
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
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'work_item_components',
      new TableUnique({
        name: 'UQ_WORK_ITEM_COMPONENT',
        columnNames: ['work_item_id', 'component_id'],
      }),
    );

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
      }),
    );

    await queryRunner.createForeignKeys('work_item_components', [
      new TableForeignKey({
        columnNames: ['work_item_id'],
        referencedTableName: 'work_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['component_id'],
        referencedTableName: 'components',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('work_item_components');
    if (!hasTable) {
      return;
    }

    await queryRunner.dropTable('work_item_components');
  }
}
