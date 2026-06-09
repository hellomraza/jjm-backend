import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class UpdateAgreementWorkItemsRelation1717900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add agreement_id column to work_items table
    await queryRunner.addColumn(
      'work_items',
      new TableColumn({
        name: 'agreement_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    // 2. Add index for performance
    await queryRunner.createIndex(
      'work_items',
      new TableIndex({
        name: 'IDX_WORK_ITEMS_AGREEMENT_ID',
        columnNames: ['agreement_id'],
      }),
    );

    // 3. Migrate existing associations from agreements.work_id to work_items.agreement_id
    // Under the old 1-to-1/Many-to-One logic: agreements.work_id pointed to work_items.id
    await queryRunner.query(`
      UPDATE work_items wi
      INNER JOIN agreements a ON a.work_id = wi.id
      SET wi.agreement_id = a.id
    `);

    // 4. Create foreign key on work_items.agreement_id -> agreements.id
    await queryRunner.createForeignKey(
      'work_items',
      new TableForeignKey({
        name: 'FK_WORK_ITEMS_AGREEMENT_ID',
        columnNames: ['agreement_id'],
        referencedTableName: 'agreements',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // 5. Retrieve agreements table to dynamically locate and drop the old work_id foreign key constraint
    const agreementsTable = await queryRunner.getTable('agreements');
    if (agreementsTable) {
      const workIdForeignKey = agreementsTable.foreignKeys.find(
        (fk) => fk.columnNames.includes('work_id'),
      );
      if (workIdForeignKey) {
        await queryRunner.dropForeignKey('agreements', workIdForeignKey);
      }

      // Also locate and drop indexes on work_id if any
      const workIdIndex = agreementsTable.indices.find(
        (idx) => idx.columnNames.includes('work_id'),
      );
      if (workIdIndex) {
        await queryRunner.dropIndex('agreements', workIdIndex);
      }
    }

    // 6. Drop work_id column from agreements table
    await queryRunner.dropColumn('agreements', 'work_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add work_id column to agreements
    await queryRunner.addColumn(
      'agreements',
      new TableColumn({
        name: 'work_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    // Re-create index on work_id
    await queryRunner.createIndex(
      'agreements',
      new TableIndex({
        name: 'IDX_AGREEMENTS_WORK_ID',
        columnNames: ['work_id'],
      }),
    );

    // Re-create foreign key on agreements.work_id -> work_items.id
    await queryRunner.createForeignKey(
      'agreements',
      new TableForeignKey({
        name: 'FK_AGREEMENTS_WORK_ID', // Name will be auto-generated or matched
        columnNames: ['work_id'],
        referencedTableName: 'work_items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Re-migrate associations back
    await queryRunner.query(`
      UPDATE agreements a
      INNER JOIN work_items wi ON wi.agreement_id = a.id
      SET a.work_id = wi.id
    `);

    // Drop foreign key and index on work_items.agreement_id
    const workItemsTable = await queryRunner.getTable('work_items');
    if (workItemsTable) {
      const agreementIdFk = workItemsTable.foreignKeys.find(
        (fk) => fk.columnNames.includes('agreement_id'),
      );
      if (agreementIdFk) {
        await queryRunner.dropForeignKey('work_items', agreementIdFk);
      }

      const agreementIdIdx = workItemsTable.indices.find(
        (idx) => idx.columnNames.includes('agreement_id'),
      );
      if (agreementIdIdx) {
        await queryRunner.dropIndex('work_items', agreementIdIdx);
      }
    }

    // Drop agreement_id column from work_items
    await queryRunner.dropColumn('work_items', 'agreement_id');
  }
}
