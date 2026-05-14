import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAgreementFileTables1715472000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agreement_files',
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
            name: 'file_url',
            type: 'varchar',
            length: '768',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'file_size',
            type: 'int',
            isNullable: true,
            unsigned: true,
          },
          {
            name: 'uploaded_by_user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'uploaded_by_role',
            type: 'enum',
            enum: ['HO', 'DO', 'CO', 'EM'],
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

    await queryRunner.createIndex(
      'agreement_files',
      new TableIndex({
        name: 'UQ_AGREEMENT_FILES_FILE_URL',
        columnNames: ['file_url'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'agreement_files',
      new TableIndex({
        name: 'IDX_AGREEMENT_FILES_UPLOADED_BY_USER_ID',
        columnNames: ['uploaded_by_user_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'agreement_file_map',
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
            name: 'agreement_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'agreement_file_id',
            type: 'varchar',
            length: '36',
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

    await queryRunner.createIndex(
      'agreement_file_map',
      new TableIndex({
        name: 'UQ_AGREEMENT_FILE_MAP_FILE_ID',
        columnNames: ['agreement_file_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'agreement_file_map',
      new TableIndex({
        name: 'IDX_AGREEMENT_FILE_MAP_AGREEMENT_ID',
        columnNames: ['agreement_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'agreement_files',
      new TableForeignKey({
        columnNames: ['uploaded_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agreement_file_map',
      new TableForeignKey({
        columnNames: ['agreement_id'],
        referencedTableName: 'agreements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agreement_file_map',
      new TableForeignKey({
        columnNames: ['agreement_file_id'],
        referencedTableName: 'agreement_files',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const agreementFileMapTable =
      await queryRunner.getTable('agreement_file_map');
    if (agreementFileMapTable) {
      for (const foreignKey of agreementFileMapTable.foreignKeys) {
        await queryRunner.dropForeignKey('agreement_file_map', foreignKey);
      }
    }

    const agreementFilesTable = await queryRunner.getTable('agreement_files');
    if (agreementFilesTable) {
      for (const foreignKey of agreementFilesTable.foreignKeys) {
        await queryRunner.dropForeignKey('agreement_files', foreignKey);
      }
    }

    await queryRunner.dropTable('agreement_file_map', true);
    await queryRunner.dropTable('agreement_files', true);
  }
}
