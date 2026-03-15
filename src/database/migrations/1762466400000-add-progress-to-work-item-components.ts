import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProgressToWorkItemComponents1762466400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('work_item_components');
    if (!hasTable) {
      return;
    }

    const hasProgressColumn = await queryRunner.hasColumn(
      'work_item_components',
      'progress',
    );

    if (!hasProgressColumn) {
      await queryRunner.addColumn(
        'work_item_components',
        new TableColumn({
          name: 'progress',
          type: 'decimal',
          precision: 12,
          scale: 2,
          isNullable: false,
          default: '0',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('work_item_components');
    if (!hasTable) {
      return;
    }

    const hasProgressColumn = await queryRunner.hasColumn(
      'work_item_components',
      'progress',
    );

    if (hasProgressColumn) {
      await queryRunner.dropColumn('work_item_components', 'progress');
    }
  }
}
