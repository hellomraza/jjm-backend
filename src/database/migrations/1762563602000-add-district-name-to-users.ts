import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDistrictNameToUsers1762563602000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasDistrictNameColumn = await queryRunner.hasColumn(
      'users',
      'district_name',
    );
    if (!hasDistrictNameColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'district_name',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasDistrictNameColumn = await queryRunner.hasColumn(
      'users',
      'district_name',
    );
    if (hasDistrictNameColumn) {
      await queryRunner.dropColumn('users', 'district_name');
    }
  }
}
