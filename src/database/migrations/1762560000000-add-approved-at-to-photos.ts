import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApprovedAtToPhotos1762560000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE photos
      ADD COLUMN approved_at datetime NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE photos
      DROP COLUMN approved_at
    `);
  }
}