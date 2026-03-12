import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddSubmitPhotoFlowIndexes1762358400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_item_components
      MODIFY COLUMN status ENUM('PENDING', 'SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED')
      NOT NULL DEFAULT 'PENDING'
    `);

    const workItemComponentsTable = await queryRunner.getTable(
      'work_item_components',
    );

    const hasWorkItemIndex =
      workItemComponentsTable?.indices.some(
        (index) => index.name === 'IDX_WORK_ITEM_COMPONENT_WORK_ITEM_ID',
      ) ?? false;

    if (!hasWorkItemIndex) {
      await queryRunner.createIndex(
        'work_item_components',
        new TableIndex({
          name: 'IDX_WORK_ITEM_COMPONENT_WORK_ITEM_ID',
          columnNames: ['work_item_id'],
        }),
      );
    }

    const hasApprovedPhotoIndex =
      workItemComponentsTable?.indices.some(
        (index) => index.name === 'IDX_WORK_ITEM_COMPONENT_APPROVED_PHOTO_ID',
      ) ?? false;

    if (!hasApprovedPhotoIndex) {
      await queryRunner.createIndex(
        'work_item_components',
        new TableIndex({
          name: 'IDX_WORK_ITEM_COMPONENT_APPROVED_PHOTO_ID',
          columnNames: ['approved_photo_id'],
        }),
      );
    }

    const photosTable = await queryRunner.getTable('photos');

    const hasPhotoComponentIndex =
      photosTable?.indices.some(
        (index) => index.name === 'IDX_PHOTO_COMPONENT_ID',
      ) ?? false;

    if (!hasPhotoComponentIndex) {
      await queryRunner.createIndex(
        'photos',
        new TableIndex({
          name: 'IDX_PHOTO_COMPONENT_ID',
          columnNames: ['component_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE work_item_components
      SET status = 'PENDING'
      WHERE status = 'SUBMITTED'
    `);

    await queryRunner.query(`
      ALTER TABLE work_item_components
      MODIFY COLUMN status ENUM('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED')
      NOT NULL DEFAULT 'PENDING'
    `);

    const workItemComponentsTable = await queryRunner.getTable(
      'work_item_components',
    );

    const hasApprovedPhotoIndex =
      workItemComponentsTable?.indices.some(
        (index) => index.name === 'IDX_WORK_ITEM_COMPONENT_APPROVED_PHOTO_ID',
      ) ?? false;

    if (hasApprovedPhotoIndex) {
      await queryRunner.dropIndex(
        'work_item_components',
        'IDX_WORK_ITEM_COMPONENT_APPROVED_PHOTO_ID',
      );
    }

    const photosTable = await queryRunner.getTable('photos');

    const hasPhotoComponentIndex =
      photosTable?.indices.some(
        (index) => index.name === 'IDX_PHOTO_COMPONENT_ID',
      ) ?? false;

    if (hasPhotoComponentIndex) {
      await queryRunner.dropIndex('photos', 'IDX_PHOTO_COMPONENT_ID');
    }
  }
}
