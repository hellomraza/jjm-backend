import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAddressToUsers1762563603000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasAddressColumn = await queryRunner.hasColumn('users', 'address');
    if (!hasAddressColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'address',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasAddressColumn = await queryRunner.hasColumn('users', 'address');
    if (hasAddressColumn) {
      await queryRunner.dropColumn('users', 'address');
    }
  }
}
