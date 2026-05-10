import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddImportContractorColumnsToUsers1762563610000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const hasAuidColumn = await queryRunner.hasColumn('users', 'auid');
    if (!hasAuidColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'auid',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    const hasDesignationColumn = await queryRunner.hasColumn(
      'users',
      'designation',
    );
    if (!hasDesignationColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'designation',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    const hasContractorIdColumn = await queryRunner.hasColumn(
      'users',
      'contractorid',
    );
    if (!hasContractorIdColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'contractorid',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    const usersTable = await queryRunner.getTable('users');
    const hasAuidUniqueIndex =
      usersTable?.indices.some(
        (index) => index.name === 'IDX_USERS_AUID_UNIQUE',
      ) ?? false;

    if (!hasAuidUniqueIndex) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_USERS_AUID_UNIQUE',
          columnNames: ['auid'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) return;

    const usersTable = await queryRunner.getTable('users');
    const hasAuidUniqueIndex =
      usersTable?.indices.some(
        (index) => index.name === 'IDX_USERS_AUID_UNIQUE',
      ) ?? false;

    if (hasAuidUniqueIndex) {
      await queryRunner.dropIndex('users', 'IDX_USERS_AUID_UNIQUE');
    }

    const hasContractorIdColumn = await queryRunner.hasColumn(
      'users',
      'contractorid',
    );
    if (hasContractorIdColumn) {
      await queryRunner.dropColumn('users', 'contractorid');
    }

    const hasDesignationColumn = await queryRunner.hasColumn(
      'users',
      'designation',
    );
    if (hasDesignationColumn) {
      await queryRunner.dropColumn('users', 'designation');
    }

    const hasAuidColumn = await queryRunner.hasColumn('users', 'auid');
    if (hasAuidColumn) {
      await queryRunner.dropColumn('users', 'auid');
    }
  }
}
