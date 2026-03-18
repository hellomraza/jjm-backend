import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateWorkItemEmployeeAssignmentsTable1762470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(
      'work_item_employee_assignments',
    );
    if (hasTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'work_item_employee_assignments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'work_item_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'employee_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'work_item_employee_assignments',
      new TableUnique({
        name: 'UQ_WORK_ITEM_EMPLOYEE_ASSIGNMENT',
        columnNames: ['work_item_id', 'employee_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_item_employee_assignments',
      new TableIndex({
        name: 'IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_WORK_ITEM_ID',
        columnNames: ['work_item_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_item_employee_assignments',
      new TableIndex({
        name: 'IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_EMPLOYEE_ID',
        columnNames: ['employee_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'work_item_employee_assignments',
      new TableForeignKey({
        columnNames: ['work_item_id'],
        referencedTableName: 'work_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'work_item_employee_assignments',
      new TableForeignKey({
        columnNames: ['employee_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(
      'work_item_employee_assignments',
    );
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable('work_item_employee_assignments');

    if (table) {
      for (const foreignKey of table.foreignKeys) {
        await queryRunner.dropForeignKey(
          'work_item_employee_assignments',
          foreignKey,
        );
      }

      const unique = table.uniques.find(
        (item) => item.name === 'UQ_WORK_ITEM_EMPLOYEE_ASSIGNMENT',
      );
      if (unique) {
        await queryRunner.dropUniqueConstraint(
          'work_item_employee_assignments',
          unique,
        );
      }
    }

    await queryRunner.dropIndex(
      'work_item_employee_assignments',
      'IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_WORK_ITEM_ID',
    );
    await queryRunner.dropIndex(
      'work_item_employee_assignments',
      'IDX_WORK_ITEM_EMPLOYEE_ASSIGNMENT_EMPLOYEE_ID',
    );

    await queryRunner.dropTable('work_item_employee_assignments');
  }
}
