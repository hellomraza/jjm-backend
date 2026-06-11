import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSecurityDepositFieldsToAgreements1717930000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('agreements', [
      new TableColumn({
        name: 'security_deposit',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'security_deposit_released',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: '0.00',
        isNullable: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('agreements', 'security_deposit_released');
    await queryRunner.dropColumn('agreements', 'security_deposit');
  }
}
