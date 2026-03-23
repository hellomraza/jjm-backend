import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeUserDistrictIdToInt1762556400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      return;
    }

    const hasDistrictIdColumn = await queryRunner.hasColumn(
      'users',
      'district_id',
    );

    if (!hasDistrictIdColumn) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN district_id int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      return;
    }

    const hasDistrictIdColumn = await queryRunner.hasColumn(
      'users',
      'district_id',
    );

    if (!hasDistrictIdColumn) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN district_id varchar(255) NULL
    `);
  }
}
