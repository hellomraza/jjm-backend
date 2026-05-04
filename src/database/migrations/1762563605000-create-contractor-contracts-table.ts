import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';
import { UserRole } from '../../modules/users/entities/user.entity';

export class CreateContractorContractsTable1762563605000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('contractor_contracts');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'contractor_contracts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'created_by_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'created_user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'created_by_role',
            type: 'enum',
            enum: Object.values(UserRole),
            isNullable: false,
          },
          {
            name: 'created_user_role',
            type: 'enum',
            enum: Object.values(UserRole),
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['created_by_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['created_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('contractor_contracts');
    if (!hasTable) return;

    await queryRunner.dropTable('contractor_contracts');
  }
}
