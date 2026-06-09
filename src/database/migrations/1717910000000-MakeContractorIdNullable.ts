import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakeContractorIdNullable1717910000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'agreements',
      'contractor_id',
      new TableColumn({
        name: 'contractor_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'agreements',
      'contractor_id',
      new TableColumn({
        name: 'contractor_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }),
    );
  }
}
