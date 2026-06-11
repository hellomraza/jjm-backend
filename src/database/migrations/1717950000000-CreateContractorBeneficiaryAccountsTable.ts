import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateContractorBeneficiaryAccountsTable1717950000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contractor_beneficiary_accounts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'bnf_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'bnf_nickname',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contractor_bank_details_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'payee_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'beneficiary_id',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Index for foreign key
    await queryRunner.createIndex(
      'contractor_beneficiary_accounts',
      new TableIndex({
        name: 'IDX_CONTRACTOR_BENEFICIARY_ACCOUNTS_BANK_DETAILS_ID',
        columnNames: ['contractor_bank_details_id'],
      }),
    );

    // Foreign key pointing to contractor_bank_details
    await queryRunner.createForeignKey(
      'contractor_beneficiary_accounts',
      new TableForeignKey({
        columnNames: ['contractor_bank_details_id'],
        referencedTableName: 'contractor_bank_details',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contractor_beneficiary_accounts');
    if (table) {
      for (const foreignKey of table.foreignKeys) {
        await queryRunner.dropForeignKey('contractor_beneficiary_accounts', foreignKey);
      }
    }
    await queryRunner.dropTable('contractor_beneficiary_accounts', true);
  }
}
