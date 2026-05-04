import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMobileToUsers1762563600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasMobileColumn = await queryRunner.hasColumn('users', 'mobile');
    if (hasMobileColumn) return;

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'mobile',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasMobileColumn = await queryRunner.hasColumn('users', 'mobile');
    if (!hasMobileColumn) return;

    await queryRunner.dropColumn('users', 'mobile');
  }
}
