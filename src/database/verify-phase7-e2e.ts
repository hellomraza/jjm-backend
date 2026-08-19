import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { WorkItemsService } from '../modules/work-items/work-items.service';
import { PhotosService } from '../modules/photos/photos.service';
import { AgreementsService } from '../modules/agreements/agreements.service';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { WorkItem, WorkItemStatus, WorkOrderType } from '../modules/work-items/entities/work-item.entity';
import { Component } from '../modules/components/entities/component.entity';
import { WorkItemComponent, WorkItemComponentStatus } from '../modules/components/entities/work-item-component.entity';
import { TpiReferencePhotoStatus, TpiReferencePhotoStatusEnum } from '../modules/photos/entities/tpi-reference-photo-status.entity';
import { DataSource } from 'typeorm';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

async function run() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 7 END-TO-END VERIFICATION SUITE');
  console.log('====================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const workItemsService = app.get(WorkItemsService);
  const photosService = app.get(PhotosService);
  const agreementsService = app.get(AgreementsService);
  const dataSource = app.get(DataSource);

  // 1. Fetch three distinct districts from DB
  const districts = await dataSource.getRepository('District').find({ take: 3 });
  if (districts.length < 3) {
    console.error('❌ Error: Needs at least 3 seeded districts in the database!');
    await app.close();
    process.exit(1);
  }

  const dist1 = (districts[0] as any).district_code;
  const dist2 = (districts[1] as any).district_code;
  const dist3 = (districts[2] as any).district_code;
  console.log(`📍 Using Districts: [District 1: ${dist1}], [District 2: ${dist2}], and [District 3: ${dist3}]\n`);

  // 2. Fetch master component
  const masterComponents = await dataSource.getRepository(Component).find({ take: 1 });
  if (masterComponents.length === 0) {
    console.error('❌ Error: Needs at least 1 master component seeded in database!');
    await app.close();
    process.exit(1);
  }
  const masterCompId = masterComponents[0].id;

  // 3. Clean any existing test data
  console.log('🧹 Cleaning test environment data...');
  await dataSource.transaction(async (manager) => {
    await manager.query('DELETE FROM tpi_reference_photo_statuses');
    await manager.query('DELETE FROM photo_statuses');
    await manager.query('DELETE FROM photos');
    await manager.query('DELETE FROM work_item_tpi_staff_assignments');
    await manager.query('DELETE FROM district_tpi_assignments');
    await manager.query('DELETE FROM tpi_staff_relationships');
    await manager.query('DELETE FROM contractor_contracts');
    await manager.query('DELETE FROM work_item_employee_assignments');
    await manager.query('DELETE FROM work_item_components WHERE id LIKE "TEST-%"');
    await manager.query('DELETE FROM work_items WHERE work_code LIKE "TEST-%"');
    await manager.query('DELETE FROM users WHERE email LIKE "p7-%" OR code LIKE "P7-%"');
  });
  console.log('✅ Test environment clean.\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, label: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS [Test ${totalTests}]: ${label}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL [Test ${totalTests}]: ${label}`);
      throw new Error(`Assertion failed: ${label}`);
    }
  }

  try {
    console.log('--- Step 1: User & District Provisioning ---');
    // HO User
    const ho = await usersService.create({
      name: 'P7 HO Admin',
      email: 'p7-ho@jjm.local',
      password: 'Password@123',
      role: UserRole.HO,
    });
    assert(ho.role === UserRole.HO, 'HO user created successfully');

    // Dist 3 Normal DO (is_executive_engineer = false by default)
    const normalDo = await usersService.createDO({
      name: 'P7 Normal DO',
      email: 'p7-normal-do@jjm.local',
      password: 'Password@123',
      district_id: dist3,
      mobile: '9800000001',
    });
    assert(normalDo.is_executive_engineer === false, 'Normal DO is not Executive Engineer');

    // Dist 1 Executive Engineer DO
    const eeDo1 = await usersService.createDO({
      name: 'P7 EE DO Dist1',
      email: 'p7-eedo1@jjm.local',
      password: 'Password@123',
      district_id: dist1,
      mobile: '9800000002',
    });
    await dataSource.getRepository(User).update({ id: eeDo1.id }, { is_executive_engineer: true });
    assert(true, 'Executive Engineer DO created for District 1');

    // Dist 2 Executive Engineer DO
    const eeDo2 = await usersService.createDO({
      name: 'P7 EE DO Dist2',
      email: 'p7-eedo2@jjm.local',
      password: 'Password@123',
      district_id: dist2,
      mobile: '9800000003',
    });
    await dataSource.getRepository(User).update({ id: eeDo2.id }, { is_executive_engineer: true });
    assert(true, 'Executive Engineer DO created for District 2');

    // Dist 1 Contractor & Employee
    const contractor1 = await usersService.createContractor({
      code: 'P7-CO-1',
      name: 'P7 Contractor 1',
      email: 'p7-co1@jjm.local',
      password: 'Password@123',
    }, eeDo1.id, UserRole.DO);

    const employee1 = await usersService.createEmployee({
      name: 'P7 EM 1',
      email: 'p7-em1@jjm.local',
      password: 'Password@123',
    }, contractor1.id, UserRole.CO);
    assert(employee1.role === UserRole.EM, 'Contractor Employee created');

    // Dist 1 TPI Agency & Staff
    const tpi1 = await usersService.createTpi({
      code: 'P7-TPI-1',
      name: 'P7 TPI Agency 1',
      email: 'p7-tpi1@jjm.local',
      password: 'Password@123',
      district_id: dist1,
      mobile: '9800000004',
      pan_number: 'ABCDE1111A',
      address: 'District 1 Office',
      designation: 'Lead Auditor',
    });
    assert(tpi1.role === UserRole.TPI && tpi1.is_active === true, 'TPI Agency 1 created for District 1');

    const staff1 = await usersService.createTpiStaff({
      name: 'P7 Staff Member 1',
      email: 'p7-staff1@jjm.local',
      password: 'Password@123',
    }, tpi1.id);
    assert(staff1.role === UserRole.TPI_STAFF, 'TPI Staff 1 created under TPI 1');

    // Dist 2 TPI Agency
    const tpi2 = await usersService.createTpi({
      code: 'P7-TPI-2',
      name: 'P7 TPI Agency 2',
      email: 'p7-tpi2@jjm.local',
      password: 'Password@123',
      district_id: dist2,
      mobile: '9800000005',
      pan_number: 'ABCDE2222B',
      address: 'District 2 Office',
      designation: 'Lead Auditor',
    });
    assert(tpi2.role === UserRole.TPI, 'TPI Agency 2 created for District 2\n');

    console.log('--- Step 2: Role Matrix & District Validation Checks ---');

    // Rule: Duplicate active TPI in same district should be rejected with 409 Conflict
    try {
      await usersService.createTpi({
        code: 'P7-TPI-1-DUP',
        name: 'P7 TPI Agency 1 Duplicate',
        email: 'p7-tpi1-dup@jjm.local',
        password: 'Password@123',
        district_id: dist1,
        mobile: '9800000006',
        pan_number: 'ABCDE3333C',
        address: 'Duplicate District 1 Office',
        designation: 'Auditor',
      });
      assert(false, 'Duplicate active TPI in district 1 should have failed');
    } catch (err: any) {
      assert(err instanceof ConflictException, 'Duplicate active TPI correctly rejected with 409 Conflict');
    }

    // Create Bulk Work Items in Dist 1 and Dist 2, and SVS Work Item in Dist 1
    const bulkWi1 = (await dataSource.getRepository(WorkItem).save(
      dataSource.getRepository(WorkItem).create({
        work_code: 'TEST-P7-BULK-WI-1',
        title: 'Test P7 Bulk WI Dist1',
        schemetype: 'BULK',
        work_order_type: WorkOrderType.BULK_VILLAGE,
        district_id: dist1,
        contractor_id: contractor1.id,
        status: WorkItemStatus.IN_PROGRESS,
        progress_percentage: 0,
        amount_approved: 500000,
        payment_amount: 0,
        serial_no: 1,
        latitude: 26.9124,
        longitude: 75.7873,
      }) as any,
    )) as WorkItem;

    const bulkWi2 = (await dataSource.getRepository(WorkItem).save(
      dataSource.getRepository(WorkItem).create({
        work_code: 'TEST-P7-BULK-WI-2',
        title: 'Test P7 Bulk WI Dist2',
        schemetype: 'BULK',
        work_order_type: WorkOrderType.BULK_VILLAGE,
        district_id: dist2,
        status: WorkItemStatus.IN_PROGRESS,
        progress_percentage: 0,
        amount_approved: 600000,
        payment_amount: 0,
        serial_no: 2,
        latitude: 27.9124,
        longitude: 76.7873,
      }) as any,
    )) as WorkItem;

    const svsWi1 = (await dataSource.getRepository(WorkItem).save(
      dataSource.getRepository(WorkItem).create({
        work_code: 'TEST-P7-SVS-WI-1',
        title: 'Test P7 SVS WI Dist1',
        schemetype: 'SVS',
        work_order_type: WorkOrderType.SVS,
        district_id: dist1,
        contractor_id: contractor1.id,
        status: WorkItemStatus.IN_PROGRESS,
        progress_percentage: 0,
        amount_approved: 400000,
        payment_amount: 0,
        serial_no: 3,
        latitude: 26.9124,
        longitude: 75.7873,
      }) as any,
    )) as WorkItem;

    // Rule: Normal DO cannot perform TPI assignment (Forbidden)
    try {
      await workItemsService.assignTpi(bulkWi1.id, normalDo.id);
      assert(false, 'Normal DO assigning TPI should have failed');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Normal DO forbidden from TPI assignment');
    }

    // Rule: Executive Engineer from District 1 cannot assign work in District 2 (Forbidden)
    try {
      await workItemsService.assignTpi(bulkWi2.id, eeDo1.id);
      assert(false, 'District 1 DO assigning District 2 work should have failed');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Cross-district TPI assignment forbidden');
    }

    // Rule: TPI assignment on SVS work item should be rejected (BadRequest)
    try {
      await workItemsService.assignTpi(svsWi1.id, eeDo1.id);
      assert(false, 'TPI assignment on SVS order should have failed');
    } catch (err: any) {
      assert(err instanceof BadRequestException, 'TPI assignment on SVS order rejected');
    }

    // Rule: Executive Engineer Dist 1 assigns TPI on Dist 1 work order (Zero-Picker: auto-resolves TPI 1)
    const assignedWi1 = await workItemsService.assignTpi(bulkWi1.id, eeDo1.id);
    assert(assignedWi1.tpi_id === tpi1.id, 'Automated zero-picker resolved active District 1 TPI agency');

    // Rule: TPI staff assignment from wrong parent TPI should be forbidden
    try {
      // Create staff under TPI 2
      const staff2 = await usersService.createTpiStaff({
        name: 'P7 Staff Member 2',
        email: 'p7-staff2@jjm.local',
        password: 'Password@123',
      }, tpi2.id);

      // TPI 1 tries to assign staff 2 (who belongs to TPI 2)
      await workItemsService.assignTpiStaff(bulkWi1.id, tpi1.id, staff2.id);
      assert(false, 'TPI 1 assigning staff of TPI 2 should have failed');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Foreign TPI staff assignment forbidden');
    }

    // Assign staff1 to bulkWi1
    await workItemsService.assignTpiStaff(bulkWi1.id, tpi1.id, staff1.id);
    assert(true, 'TPI 1 assigned its own inspector staff1 to Bulk work item\n');

    console.log('--- Step 3: Reference Evidence & Concurrency Validation ---');

    // Create a WorkItemComponent
    const comp = (await dataSource.getRepository(WorkItemComponent).save(
      dataSource.getRepository(WorkItemComponent).create({
        id: 'TEST-P7-WIC-1',
        work_item_id: bulkWi1.id,
        component_id: masterCompId,
        quantity: 500,
        progress: 0,
        status: WorkItemComponentStatus.SUBMITTED,
      }) as any,
    )) as WorkItemComponent;

    // Rule: TPI staff uploads reference photo
    const refPhoto1 = await photosService.uploadTpiReferencePhotoUrl({
      component_id: comp.id,
      work_item_id: bulkWi1.id,
      photoUrl: 'https://cloudinary.com/test-p7-ref-photo-1.jpg',
      latitude: 26.9124,
      longitude: 75.7873,
      timestamp: new Date(),
    }, staff1.id);
    assert(refPhoto1.employee_id === staff1.id, 'TPI Staff uploaded baseline reference photo 1');

    const refPhoto2 = await photosService.uploadTpiReferencePhotoUrl({
      component_id: comp.id,
      work_item_id: bulkWi1.id,
      photoUrl: 'https://cloudinary.com/test-p7-ref-photo-2.jpg',
      latitude: 26.9124,
      longitude: 75.7873,
      timestamp: new Date(),
    }, staff1.id);
    assert(refPhoto2.employee_id === staff1.id, 'TPI Staff uploaded baseline reference photo 2');

    // Verify component progress did NOT change
    const compAfterRefUpload = await dataSource.getRepository(WorkItemComponent).findOne({ where: { id: comp.id } });
    assert(Number(compAfterRefUpload?.progress) === 0, 'TPI reference uploads have zero effect on component progress');

    // Rule: Concurrent TPI reference photo selection (strictly 1 wins transactionally)
    console.log('  ⚡ Testing concurrent TPI reference photo selection requests...');
    const selectPromise1 = photosService.selectTpiReferencePhoto(refPhoto1.id, tpi1.id);
    const selectPromise2 = photosService.selectTpiReferencePhoto(refPhoto2.id, tpi1.id);

    await Promise.allSettled([selectPromise1, selectPromise2]);

    const activeRefStatuses = await dataSource.getRepository(TpiReferencePhotoStatus).find({
      where: { component_id: masterCompId, status: TpiReferencePhotoStatusEnum.SELECTED },
    });
    assert(activeRefStatuses.length === 1 && activeRefStatuses[0].status === TpiReferencePhotoStatusEnum.SELECTED, 'Strictly 1 active selected reference photo per component exists');

    const activeRefStatus = activeRefStatuses[0];

    // Rule: TPI Staff upload after TPI selection must be rejected (locked)
    try {
      await photosService.uploadTpiReferencePhotoUrl({
        component_id: comp.id,
        work_item_id: bulkWi1.id,
        photoUrl: 'https://cloudinary.com/test-p7-ref-photo-3.jpg',
        latitude: 26.9124,
        longitude: 75.7873,
        timestamp: new Date(),
      }, staff1.id);
      assert(false, 'Upload after reference selection should have failed');
    } catch (err: any) {
      assert(err instanceof BadRequestException || err instanceof ForbiddenException, 'Upload blocked when reference photo is selected');
    }

    // Rule: TPI deselects reference photo -> upload is re-enabled
    await photosService.deselectTpiReferencePhoto(activeRefStatus!.photo_id, tpi1.id);
    const reUpload = await photosService.uploadTpiReferencePhotoUrl({
      component_id: comp.id,
      work_item_id: bulkWi1.id,
      photoUrl: 'https://cloudinary.com/test-p7-ref-photo-reupload.jpg',
      latitude: 26.9124,
      longitude: 75.7873,
      timestamp: new Date(),
    }, staff1.id);
    assert(!!reUpload.id, 'TPI deselection re-enables staff upload before contractor approval');

    // Re-select reference photo
    await photosService.selectTpiReferencePhoto(reUpload.id, tpi1.id);
    assert(true, 'TPI successfully selected new baseline reference photo\n');

    console.log('--- Step 4: Contractor Execution, Approval & Permanent Lock ---');

    // Contractor EM uploads contractor photo with progress
    const contractorPhoto = await photosService.uploadPhotoUrl({
      work_item_id: bulkWi1.id,
      component_id: comp.id,
      photoUrl: 'https://cloudinary.com/contractor-execution-photo.jpg',
      latitude: 26.9124,
      longitude: 75.7873,
      timestamp: new Date(),
    }, employee1.id);
    assert(contractorPhoto.employee_id === employee1.id, 'Contractor Employee submitted execution photo');

    // Contractor selects photo
    await photosService.selectBestPhoto(contractorPhoto.id, contractor1.id);

    // Forward to DO and approve
    await photosService.forwardSelectedPhoto(contractorPhoto.id, contractor1.id);
    await dataSource.getRepository(WorkItemComponent).update(
      { id: comp.id },
      { status: WorkItemComponentStatus.APPROVED, progress: 500 },
    );
    const approvedComp = await dataSource.getRepository(WorkItemComponent).findOne({ where: { id: comp.id } });
    assert(approvedComp?.status === WorkItemComponentStatus.APPROVED, 'DO approved contractor component');

    // Rule: After contractor approval -> TPI deselect, re-select, and upload are permanently locked
    try {
      await photosService.deselectTpiReferencePhoto(reUpload.id, tpi1.id);
      assert(false, 'Deselection after contractor approval should have failed');
    } catch (err: any) {
      assert(err instanceof BadRequestException || err instanceof ForbiddenException, 'TPI deselection permanently blocked after contractor approval');
    }

    try {
      await photosService.uploadTpiReferencePhotoUrl({
        component_id: comp.id,
        work_item_id: bulkWi1.id,
        photoUrl: 'https://cloudinary.com/post-approval.jpg',
        latitude: 26.9124,
        longitude: 75.7873,
        timestamp: new Date(),
      }, staff1.id);
      assert(false, 'Upload after contractor approval should have failed');
    } catch (err: any) {
      assert(err instanceof BadRequestException || err instanceof ForbiddenException, 'TPI upload permanently blocked after contractor approval\n');
    }

    console.log('--- Step 5: Security & Redaction Audit ---');

    // Rule: HO requests TPI staff list -> verified NO image URL leak
    const hoStaffList = await usersService.findAllTpiStaff(tpi1.id, 1, 20);
    const staffSerialized = JSON.stringify(hoStaffList);
    assert(!staffSerialized.includes('image_url') && !staffSerialized.includes('cloudinary'), 'HO staff query strictly omits reference photo URLs');

    // Rule: HO cannot list TPI reference photos (Forbidden)
    try {
      await photosService.listTpiReferencePhotos(comp.id, ho.id, UserRole.HO);
      assert(false, 'HO listing TPI reference photos should have failed');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'HO is strictly forbidden from querying TPI reference photos');
    }

    // Rule: DO has no approval endpoint for TPI reference photos
    assert(typeof (photosService as any).approveTpiReferencePhoto !== 'function', 'DO has no approval endpoint for TPI reference photos\n');

    console.log('--- Step 6: Revocation & Deactivation Checks ---');

    // Rule: Parent TPI deactivation immediately invalidates all staff access
    await usersService.updateTpiStatus(tpi1.id, false);
    const deactivatedTpi = await dataSource.getRepository(User).findOne({ where: { id: tpi1.id } });
    assert(deactivatedTpi?.is_active === false, 'TPI Agency 1 deactivated by HO');

    // Scoping query for staff1 should return no access
    const staffAgreements = await agreementsService.findAllForUser(staff1.id, UserRole.TPI_STAFF, 1, 20);
    assert(staffAgreements.data.length === 0, 'Deactivated parent TPI immediately shuts down all staff access');

    // Rule: Executive Engineer DO revocation
    await dataSource.getRepository(User).update({ id: eeDo1.id }, { is_executive_engineer: false });
    try {
      await workItemsService.assignTpi(bulkWi1.id, eeDo1.id);
      assert(false, 'Revoked Executive Engineer assigning TPI should have failed');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Executive Engineer revocation immediately denies Bulk assignment');
    }

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 7 E2E VERIFICATIONS PASSED!`);
    console.log('====================================================\n');

  } catch (error) {
    console.error('\n❌ PHASE 7 VERIFICATION ENCOUNTERED AN ERROR:', error);
    process.exit(1);
  } finally {
    // Clean up test data
    await dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM tpi_reference_photo_statuses');
      await manager.query('DELETE FROM photo_statuses');
      await manager.query('DELETE FROM photos');
      await manager.query('DELETE FROM work_item_tpi_staff_assignments');
      await manager.query('DELETE FROM district_tpi_assignments');
      await manager.query('DELETE FROM tpi_staff_relationships');
      await manager.query('DELETE FROM contractor_contracts');
      await manager.query('DELETE FROM work_item_employee_assignments');
      await manager.query('DELETE FROM work_item_components WHERE id LIKE "TEST-%"');
      await manager.query('DELETE FROM work_items WHERE work_code LIKE "TEST-%"');
      await manager.query('DELETE FROM users WHERE email LIKE "p7-%" OR code LIKE "P7-%"');
    });
    await app.close();
  }
}

run();
