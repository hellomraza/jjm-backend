import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDivisionCodeToAgreements1762563606000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('agreements');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn(
      'agreements',
      'division_code',
    );
    if (hasColumn) return;

    await queryRunner.addColumn(
      'agreements',
      new TableColumn({
        name: 'division_code',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('agreements');
    if (!hasTable) return;

    const hasColumn = await queryRunner.hasColumn(
      'agreements',
      'division_code',
    );
    if (!hasColumn) return;

    await queryRunner.dropColumn('agreements', 'division_code');
  }
}
