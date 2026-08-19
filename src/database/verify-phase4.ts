import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { WorkItemsService } from '../modules/work-items/work-items.service';
import { PhotosService } from '../modules/photos/photos.service';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { WorkItem, WorkItemStatus, WorkOrderType } from '../modules/work-items/entities/work-item.entity';
import { Component } from '../modules/components/entities/component.entity';
import { WorkItemComponent, WorkItemComponentStatus } from '../modules/components/entities/work-item-component.entity';
import { TpiReferencePhotoStatus, TpiReferencePhotoStatusEnum } from '../modules/photos/entities/tpi-reference-photo-status.entity';
import { Photo } from '../modules/photos/entities/photo.entity';
import { DataSource } from 'typeorm';

async function run() {
  console.log('🚀 Bootstrapping verify-phase4...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const workItemsService = app.get(WorkItemsService);
  const photosService = app.get(PhotosService);
  const dataSource = app.get(DataSource);

  // Fetch two existing districts from DB
  console.log('🔍 Fetching existing districts from DB...');
  const districts = await dataSource.getRepository('District').find({ take: 2 });
  if (districts.length < 2) {
    console.log('❌ Error: Needs at least 2 seeded districts in the database to run the test!');
    await app.close();
    process.exit(1);
  }

  const dist1 = districts[0].district_code;
  const dist2 = districts[1].district_code;
  console.log(`ℹ️ Resolved District 1: ${dist1}, District 2: ${dist2}`);

  // Fetch a master component
  const masterComponents = await dataSource.getRepository(Component).find({ take: 1 });
  if (masterComponents.length === 0) {
    console.log('❌ Error: Needs at least 1 master component seeded in the database!');
    await app.close();
    process.exit(1);
  }
  const masterCompId = masterComponents[0].id;
  console.log('ℹ️ Resolved Master Component ID:', masterCompId);

  console.log('🧹 Cleaning test data...');
  await dataSource.transaction(async (manager) => {
    await manager.query('DELETE FROM tpi_reference_photo_statuses');
    await manager.query('DELETE FROM photos');
    await manager.query('DELETE FROM work_item_tpi_staff_assignments');
    await manager.query('DELETE FROM district_tpi_assignments');
    await manager.query('DELETE FROM tpi_staff_relationships');
    await manager.query('DELETE FROM contractor_contracts');
    await manager.query('DELETE FROM work_item_components WHERE id LIKE "TEST-%"');
    await manager.query('DELETE FROM work_items WHERE work_code LIKE "TEST-%"');
    await manager.query('DELETE FROM users WHERE email LIKE "test-%" OR code LIKE "TEST-%"');
  });

  try {
    console.log('1️⃣ Creating TPI, Staff, Executive Engineer DO, and Contractor...');
    const tpi = await usersService.createTpi({
      code: 'TEST-TPI',
      name: 'Test TPI Agency',
      email: 'test-tpi@jjm.local',
      password: 'Password@123',
      district_id: dist1,
      mobile: '9876543210',
      pan_number: 'ABCDE1234F',
      address: 'Jaipur',
      designation: 'Auditor',
    });

    const staff = await usersService.createTpiStaff({
      name: 'Test Staff Member',
      email: 'test-staff@jjm.local',
      password: 'Password@123',
    }, tpi.id);

    const eeDo = await usersService.createDO({
      name: 'Test EE DO',
      email: 'test-eedo@jjm.local',
      password: 'Password@123',
      district_id: dist1,
      mobile: '9876543211',
    });
    await dataSource.getRepository(User).update({ id: eeDo.id }, { is_executive_engineer: true });

    const contractor = await usersService.createContractor({
      code: 'TEST-CO',
      name: 'Test Contractor',
      email: 'test-co@jjm.local',
      password: 'Password@123',
    }, eeDo.id, UserRole.DO);

    console.log('2️⃣ Creating Bulk Village work item and mapping component...');
    const workItem = (await dataSource.getRepository(WorkItem).save(
      dataSource.getRepository(WorkItem).create({
        work_code: 'TEST-BULK-WI-P4',
        title: 'Test Bulk Village WI P4',
        schemetype: 'BULK',
        work_order_type: WorkOrderType.BULK_VILLAGE,
        district_id: dist1,
        latitude: 25.0,
        longitude: 85.0,
        status: WorkItemStatus.PENDING,
        contractor_id: contractor.id,
      }) as any
    )) as WorkItem;

    const componentMapping = (await dataSource.getRepository(WorkItemComponent).save(
      dataSource.getRepository(WorkItemComponent).create({
        id: 'TEST-WIC-P4',
        work_item_id: workItem.id,
        component_id: masterCompId,
        component_name: 'Inspection: Test Component',
        component_unit: 'No.',
        component_order_number: 1,
        status: WorkItemComponentStatus.SUBMITTED,
        quantity: 10,
        progress: 0,
      }) as any
    )) as WorkItemComponent;

    console.log('3️⃣ Assigning TPI and Staff to work item...');
    await workItemsService.assignTpi(workItem.id, eeDo.id);
    await workItemsService.assignTpiStaff(workItem.id, tpi.id, staff.id);

    console.log('4️⃣ TPI Staff uploading reference photo URL...');
    const photo = await photosService.uploadTpiReferencePhotoUrl({
      photoUrl: 'https://cloudinary.com/test-tpi-image.jpg',
      latitude: 25.5,
      longitude: 85.5,
      timestamp: new Date(),
      component_id: componentMapping.id,
      work_item_id: workItem.id,
    }, staff.id);
    console.log('✅ Upload successful! Photo ID:', photo.id);

    console.log('5️⃣ Querying photo list with different roles...');
    // DO (Executive Engineer) - should succeed
    const doList = await photosService.listTpiReferencePhotos(componentMapping.id, eeDo.id, UserRole.DO);
    console.log('✅ DO list length:', doList.length);
    if (doList.length !== 1 || doList[0].image_url !== 'https://cloudinary.com/test-tpi-image.jpg') {
      console.log('❌ Error: Incorrect list retrieval for DO');
      process.exit(1);
    }

    // HO - should fail with ForbiddenException
    try {
      await photosService.listTpiReferencePhotos(componentMapping.id, 'ho-id', UserRole.HO);
      console.log('❌ Error: Allowed HO to list TPI reference photos!');
      process.exit(1);
    } catch (err) {
      console.log('✅ Success: Blocked HO from listing reference photos. Error:', err.message);
    }

    console.log('6️⃣ TPI selecting reference photo...');
    const selectedStatus = await photosService.selectTpiReferencePhoto(photo.id, tpi.id);
    console.log('✅ Reference photo selected. Status:', selectedStatus.status);
    if (selectedStatus.status !== TpiReferencePhotoStatusEnum.SELECTED) {
      console.log('❌ Error: Photo was not selected');
      process.exit(1);
    }

    console.log('7️⃣ TPI Staff attempting to upload another photo after TPI selection...');
    try {
      await photosService.uploadTpiReferencePhotoUrl({
        photoUrl: 'https://cloudinary.com/another-photo.jpg',
        latitude: 25.5,
        longitude: 85.5,
        timestamp: new Date(),
        component_id: componentMapping.id,
        work_item_id: workItem.id,
      }, staff.id);
      console.log('❌ Error: Allowed upload after reference selection!');
      process.exit(1);
    } catch (err) {
      console.log('✅ Success: Blocked upload after selection. Error:', err.message);
    }

    console.log('8️⃣ TPI deselecting photo...');
    const deselectedStatus = await photosService.deselectTpiReferencePhoto(photo.id, tpi.id);
    console.log('✅ Photo deselected. Status:', deselectedStatus.status);
    if (deselectedStatus.status !== TpiReferencePhotoStatusEnum.UPLOADED) {
      console.log('❌ Error: Photo was not deselected');
      process.exit(1);
    }

    console.log('9️⃣ TPI Staff uploading a new reference photo after deselection...');
    const photo2 = await photosService.uploadTpiReferencePhotoUrl({
      photoUrl: 'https://cloudinary.com/new-photo.jpg',
      latitude: 25.5,
      longitude: 85.5,
      timestamp: new Date(),
      component_id: componentMapping.id,
      work_item_id: workItem.id,
    }, staff.id);
    console.log('✅ Upload successful! Photo 2 ID:', photo2.id);

    console.log('🔟 TPI selecting the new photo...');
    await photosService.selectTpiReferencePhoto(photo2.id, tpi.id);

    console.log('11️⃣ Approving component mapping (simulating contractor evidence approval)...');
    await dataSource.getRepository(WorkItemComponent).update(
      { id: componentMapping.id },
      { status: WorkItemComponentStatus.APPROVED }
    );

    console.log('12️⃣ TPI attempting to deselect reference photo after approval...');
    try {
      await photosService.deselectTpiReferencePhoto(photo2.id, tpi.id);
      console.log('❌ Error: Allowed deselection after component approval!');
      process.exit(1);
    } catch (err) {
      console.log('✅ Success: Blocked deselection after approval. Error:', err.message);
    }

    console.log('13️⃣ TPI Staff attempting to upload photo after component approval...');
    try {
      await photosService.uploadTpiReferencePhotoUrl({
        photoUrl: 'https://cloudinary.com/failed-upload.jpg',
        latitude: 25.5,
        longitude: 85.5,
        timestamp: new Date(),
        component_id: componentMapping.id,
        work_item_id: workItem.id,
      }, staff.id);
      console.log('❌ Error: Allowed upload after component approval!');
      process.exit(1);
    } catch (err) {
      console.log('✅ Success: Blocked upload after approval. Error:', err.message);
    }

    console.log('🎉 All Phase 4 reference evidence validation checks passed successfully!');
  } finally {
    console.log('🧹 Final cleaning test data...');
    await dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM tpi_reference_photo_statuses');
      await manager.query('DELETE FROM photos');
      await manager.query('DELETE FROM work_item_tpi_staff_assignments');
      await manager.query('DELETE FROM district_tpi_assignments');
      await manager.query('DELETE FROM tpi_staff_relationships');
      await manager.query('DELETE FROM contractor_contracts');
      await manager.query('DELETE FROM work_item_components WHERE id LIKE "TEST-%"');
      await manager.query('DELETE FROM work_items WHERE work_code LIKE "TEST-%"');
      await manager.query('DELETE FROM users WHERE email LIKE "test-%" OR code LIKE "TEST-%"');
    });
    await app.close();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
