import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddUserAndWorkItemCodes1762446000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const workItemsTable = await queryRunner.getTable('work_items');

    const hasUserCodeColumn =
      usersTable?.columns.some((column) => column.name === 'code') ?? false;

    if (!hasUserCodeColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'code',
          type: 'varchar',
          length: '14',
          isNullable: true,
        }),
      );
    }

    const hasWorkCodeColumn =
      workItemsTable?.columns.some((column) => column.name === 'work_code') ??
      false;

    if (!hasWorkCodeColumn) {
      await queryRunner.addColumn(
        'work_items',
        new TableColumn({
          name: 'work_code',
          type: 'varchar',
          length: '13',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      UPDATE users
      SET code = CONCAT(
        role,
        LPAD(
          RIGHT(CONV(SUBSTRING(REPLACE(id, '-', ''), 1, 12), 16, 10), 12),
          12,
          '0'
        )
      )
      WHERE code IS NULL OR code = ''
    `);

    await queryRunner.query(`
      UPDATE work_items
      SET work_code = CONCAT(
        'W',
        LPAD(
          RIGHT(CONV(SUBSTRING(REPLACE(id, '-', ''), 1, 12), 16, 10), 12),
          12,
          '0'
        )
      )
      WHERE work_code IS NULL OR work_code = ''
    `);

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN code varchar(14) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE work_items
      MODIFY COLUMN work_code varchar(13) NOT NULL
    `);

    const latestUsersTable = await queryRunner.getTable('users');
    const hasUserCodeUnique =
      latestUsersTable?.indices.some(
        (index) => index.name === 'IDX_USERS_CODE_UNIQUE',
      ) ?? false;

    if (!hasUserCodeUnique) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_USERS_CODE_UNIQUE',
          columnNames: ['code'],
          isUnique: true,
        }),
      );
    }

    const latestWorkItemsTable = await queryRunner.getTable('work_items');
    const hasWorkCodeUnique =
      latestWorkItemsTable?.indices.some(
        (index) => index.name === 'IDX_WORK_ITEMS_WORK_CODE_UNIQUE',
      ) ?? false;

    if (!hasWorkCodeUnique) {
      await queryRunner.createIndex(
        'work_items',
        new TableIndex({
          name: 'IDX_WORK_ITEMS_WORK_CODE_UNIQUE',
          columnNames: ['work_code'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const hasUserCodeUnique =
      usersTable?.indices.some(
        (index) => index.name === 'IDX_USERS_CODE_UNIQUE',
      ) ?? false;

    if (hasUserCodeUnique) {
      await queryRunner.dropIndex('users', 'IDX_USERS_CODE_UNIQUE');
    }

    const workItemsTable = await queryRunner.getTable('work_items');
    const hasWorkCodeUnique =
      workItemsTable?.indices.some(
        (index) => index.name === 'IDX_WORK_ITEMS_WORK_CODE_UNIQUE',
      ) ?? false;

    if (hasWorkCodeUnique) {
      await queryRunner.dropIndex(
        'work_items',
        'IDX_WORK_ITEMS_WORK_CODE_UNIQUE',
      );
    }

    const latestUsersTable = await queryRunner.getTable('users');
    const hasUserCodeColumn =
      latestUsersTable?.columns.some((column) => column.name === 'code') ??
      false;

    if (hasUserCodeColumn) {
      await queryRunner.dropColumn('users', 'code');
    }

    const latestWorkItemsTable = await queryRunner.getTable('work_items');
    const hasWorkCodeColumn =
      latestWorkItemsTable?.columns.some(
        (column) => column.name === 'work_code',
      ) ?? false;

    if (hasWorkCodeColumn) {
      await queryRunner.dropColumn('work_items', 'work_code');
    }
  }
}
