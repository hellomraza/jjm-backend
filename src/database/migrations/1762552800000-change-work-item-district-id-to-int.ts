import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeWorkItemDistrictIdToInt1762552800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasWorkItemsTable = await queryRunner.hasTable('work_items');
    if (!hasWorkItemsTable) {
      return;
    }

    const hasDistrictIdColumn = await queryRunner.hasColumn(
      'work_items',
      'district_id',
    );

    if (!hasDistrictIdColumn) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE work_items
      MODIFY COLUMN district_id int NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasWorkItemsTable = await queryRunner.hasTable('work_items');
    if (!hasWorkItemsTable) {
      return;
    }

    const hasDistrictIdColumn = await queryRunner.hasColumn(
      'work_items',
      'district_id',
    );

    if (!hasDistrictIdColumn) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE work_items
      MODIFY COLUMN district_id varchar(255) NOT NULL
    `);
  }
}
