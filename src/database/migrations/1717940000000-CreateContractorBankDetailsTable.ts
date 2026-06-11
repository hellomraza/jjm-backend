import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateContractorBankDetailsTable1717940000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contractor_bank_details',
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
            name: 'contractor_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'account_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'account_number',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'ifsc_code',
            type: 'varchar',
            length: '20',
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

    // Unique index on contractor_id to enforce one-to-one relationship
    await queryRunner.createIndex(
      'contractor_bank_details',
      new TableIndex({
        name: 'UQ_CONTRACTOR_BANK_DETAILS_CONTRACTOR_ID',
        columnNames: ['contractor_id'],
        isUnique: true,
      }),
    );

    // Foreign key constraint referencing users table
    await queryRunner.createForeignKey(
      'contractor_bank_details',
      new TableForeignKey({
        columnNames: ['contractor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contractor_bank_details');
    if (table) {
      for (const foreignKey of table.foreignKeys) {
        await queryRunner.dropForeignKey('contractor_bank_details', foreignKey);
      }
    }
    await queryRunner.dropTable('contractor_bank_details', true);
  }
}
