import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateComponentTemplatesTable1741435200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'component_templates',
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

    await queryRunner.createIndex(
      'component_templates',
      new TableIndex({
        name: 'IDX_COMPONENT_TEMPLATE_ORDER',
        columnNames: ['order_number'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'component_templates',
      'IDX_COMPONENT_TEMPLATE_ORDER',
    );
    await queryRunner.dropTable('component_templates');
  }
}
