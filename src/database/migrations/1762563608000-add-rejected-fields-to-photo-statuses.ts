import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRejectedFieldsToPhotoStatuses1762563608000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('photo_statuses');
    if (!hasTable) {
      return;
    }

    const hasRejectedByColumn = await queryRunner.hasColumn(
      'photo_statuses',
      'rejected_by',
    );
    if (!hasRejectedByColumn) {
      await queryRunner.addColumn(
        'photo_statuses',
        new TableColumn({
          name: 'rejected_by',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    const hasRejectedAtColumn = await queryRunner.hasColumn(
      'photo_statuses',
      'rejected_at',
    );
    if (!hasRejectedAtColumn) {
      await queryRunner.addColumn(
        'photo_statuses',
        new TableColumn({
          name: 'rejected_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      ALTER TABLE photo_statuses
      MODIFY COLUMN status ENUM('UPLOADED', 'SELECTED', 'APPROVED', 'REJECTED')
      NOT NULL DEFAULT 'UPLOADED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('photo_statuses');
    if (!hasTable) {
      return;
    }

    await queryRunner.query(`
      UPDATE photo_statuses
      SET status = 'SELECTED'
      WHERE status = 'REJECTED'
    `);

    await queryRunner.query(`
      ALTER TABLE photo_statuses
      MODIFY COLUMN status ENUM('UPLOADED', 'SELECTED', 'APPROVED')
      NOT NULL DEFAULT 'UPLOADED'
    `);

    const hasRejectedAtColumn = await queryRunner.hasColumn(
      'photo_statuses',
      'rejected_at',
    );
    if (hasRejectedAtColumn) {
      await queryRunner.dropColumn('photo_statuses', 'rejected_at');
    }

    const hasRejectedByColumn = await queryRunner.hasColumn(
      'photo_statuses',
      'rejected_by',
    );
    if (hasRejectedByColumn) {
      await queryRunner.dropColumn('photo_statuses', 'rejected_by');
    }
  }
}
