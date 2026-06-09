import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWorkcodeidToWorkItems1717920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'work_items',
      new TableColumn({
        name: 'workcodeid',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('work_items', 'workcodeid');
  }
}
