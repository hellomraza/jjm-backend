import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLatitudeLongitudeToAgreements1762563609000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAgreementsTable = await queryRunner.hasTable('agreements');
    if (!hasAgreementsTable) {
      return;
    }

    const hasLatitudeColumn = await queryRunner.hasColumn(
      'agreements',
      'latitude',
    );
    if (!hasLatitudeColumn) {
      await queryRunner.query(
        'ALTER TABLE agreements ADD COLUMN latitude decimal(10,7) NULL',
      );
    }

    const hasLongitudeColumn = await queryRunner.hasColumn(
      'agreements',
      'longitude',
    );
    if (!hasLongitudeColumn) {
      await queryRunner.query(
        'ALTER TABLE agreements ADD COLUMN longitude decimal(10,7) NULL',
      );
    }

    const hasLatColumn = await queryRunner.hasColumn('agreements', 'lat');
    const hasLugColumn = await queryRunner.hasColumn('agreements', 'lug');

    // Backward compatibility: move previously created lat/lug values.
    if (hasLatColumn) {
      await queryRunner.query(
        'UPDATE agreements SET latitude = COALESCE(latitude, lat)',
      );
      await queryRunner.query('ALTER TABLE agreements DROP COLUMN lat');
    }

    if (hasLugColumn) {
      await queryRunner.query(
        'UPDATE agreements SET longitude = COALESCE(longitude, lug)',
      );
      await queryRunner.query('ALTER TABLE agreements DROP COLUMN lug');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasAgreementsTable = await queryRunner.hasTable('agreements');
    if (!hasAgreementsTable) {
      return;
    }

    const hasLongitudeColumn = await queryRunner.hasColumn(
      'agreements',
      'longitude',
    );
    if (hasLongitudeColumn) {
      await queryRunner.query('ALTER TABLE agreements DROP COLUMN longitude');
    }

    const hasLatitudeColumn = await queryRunner.hasColumn(
      'agreements',
      'latitude',
    );
    if (hasLatitudeColumn) {
      await queryRunner.query('ALTER TABLE agreements DROP COLUMN latitude');
    }
  }
}
