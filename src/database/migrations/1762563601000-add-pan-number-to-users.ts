import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddPanNumberToUsers1762563601000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasPanColumn = await queryRunner.hasColumn('users', 'pan_number');
    if (!hasPanColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'pan_number',
          type: 'varchar',
          length: '10',
          isNullable: true,
        }),
      );
    }

    const latestUsersTable = await queryRunner.getTable('users');
    const hasPanIndex =
      latestUsersTable?.indices.some(
        (index) => index.name === 'IDX_USERS_PAN_NUMBER_UNIQUE',
      ) ?? false;

    if (!hasPanIndex) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_USERS_PAN_NUMBER_UNIQUE',
          columnNames: ['pan_number'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const usersTable = await queryRunner.getTable('users');
    const hasPanIndex =
      usersTable?.indices.some(
        (index) => index.name === 'IDX_USERS_PAN_NUMBER_UNIQUE',
      ) ?? false;
    if (hasPanIndex) {
      await queryRunner.dropIndex('users', 'IDX_USERS_PAN_NUMBER_UNIQUE');
    }

    const hasPanColumn = await queryRunner.hasColumn('users', 'pan_number');
    if (hasPanColumn) {
      await queryRunner.dropColumn('users', 'pan_number');
    }
  }
}
