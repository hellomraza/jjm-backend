import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddApprovedAtToWorkItemComponents1762560000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('work_item_components');
    const hasColumn =
      table?.columns.some((column) => column.name === 'approved_at') ?? false;

    if (!hasColumn) {
      await queryRunner.addColumn(
        'work_item_components',
        new TableColumn({
          name: 'approved_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('work_item_components');
    const hasColumn =
      table?.columns.some((column) => column.name === 'approved_at') ?? false;

    if (hasColumn) {
      await queryRunner.dropColumn('work_item_components', 'approved_at');
    }
  }
}
