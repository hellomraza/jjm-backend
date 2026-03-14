import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAgreementsTable1762459800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('agreements');
    if (hasTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'agreements',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'UUID()',
          },
          {
            name: 'agreementno',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'agreementyear',
            type: 'varchar',
            length: '9',
            isNullable: false,
          },
          {
            name: 'contractor_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'work_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
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
    );

    await queryRunner.createIndex(
      'agreements',
      new TableIndex({
        name: 'IDX_AGREEMENTS_AGREEMENTNO',
        columnNames: ['agreementno'],
      }),
    );

    await queryRunner.createIndex(
      'agreements',
      new TableIndex({
        name: 'IDX_AGREEMENTS_CONTRACTOR_ID',
        columnNames: ['contractor_id'],
      }),
    );

    await queryRunner.createIndex(
      'agreements',
      new TableIndex({
        name: 'IDX_AGREEMENTS_WORK_ID',
        columnNames: ['work_id'],
      }),
    );

    await queryRunner.createForeignKeys('agreements', [
      new TableForeignKey({
        name: 'FK_AGREEMENTS_CONTRACTOR_ID',
        columnNames: ['contractor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_AGREEMENTS_WORK_ID',
        columnNames: ['work_id'],
        referencedTableName: 'work_items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('agreements');
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable('agreements');

    const hasContractorFk =
      table?.foreignKeys.some(
        (fk) => fk.name === 'FK_AGREEMENTS_CONTRACTOR_ID',
      ) ?? false;

    if (hasContractorFk) {
      await queryRunner.dropForeignKey(
        'agreements',
        'FK_AGREEMENTS_CONTRACTOR_ID',
      );
    }

    const hasWorkFk =
      table?.foreignKeys.some((fk) => fk.name === 'FK_AGREEMENTS_WORK_ID') ??
      false;

    if (hasWorkFk) {
      await queryRunner.dropForeignKey('agreements', 'FK_AGREEMENTS_WORK_ID');
    }

    const indexNames = [
      'IDX_AGREEMENTS_WORK_ID',
      'IDX_AGREEMENTS_CONTRACTOR_ID',
      'IDX_AGREEMENTS_AGREEMENTNO',
    ];

    for (const indexName of indexNames) {
      const latestTable = await queryRunner.getTable('agreements');
      const hasIndex =
        latestTable?.indices.some((index) => index.name === indexName) ?? false;
      if (hasIndex) {
        await queryRunner.dropIndex('agreements', indexName);
      }
    }

    await queryRunner.dropTable('agreements');
  }
}
