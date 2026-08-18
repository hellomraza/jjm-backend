import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { WorkItem, WorkItemStatus } from '../modules/work-items/entities/work-item.entity';
import { WorkItemComponent, WorkItemComponentStatus } from '../modules/components/entities/work-item-component.entity';
import { Photo } from '../modules/photos/entities/photo.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { WorkItemEmployeeAssignment } from '../modules/work-items/entities/work-item-employee-assignment.entity';

export async function completeWorkItem() {
  const workCode = process.argv[2];
  if (!workCode) {
    console.error('❌ Error: Please provide a work code as an argument.');
    console.error('Usage: yarn complete:work-item <WORK_CODE>');
    process.exit(1);
  }

  console.log(`🚀 Starting completion flow for work code: ${workCode}...`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const dataSource = app.get(DataSource);

  try {
    await dataSource.transaction(async (manager) => {
      // 1. Retrieve the Work Item
      const workItem = await manager.findOne(WorkItem, {
        where: { work_code: workCode },
      });

      if (!workItem) {
        throw new Error(`Work item with work code '${workCode}' not found.`);
      }

      console.log(`📌 Found Work Item: "${workItem.title}" (ID: ${workItem.id})`);

      // 2. Ensure a Contractor (CO) is assigned to the Work Item
      let contractorId = workItem.contractor_id;
      if (!contractorId) {
        const contractor = await manager.findOne(User, {
          where: { role: UserRole.CO, is_active: true },
        }) || await manager.findOne(User, {
          where: { role: UserRole.CO },
        });

        if (!contractor) {
          throw new Error('No Contractor (CO) found in the database. Please seed or create a contractor first.');
        }

        workItem.contractor_id = contractor.id;
        await manager.save(WorkItem, workItem);
        contractorId = contractor.id;
        console.log(`👤 Assigned Contractor: "${contractor.name}" (${contractor.code}) to the work item.`);
      } else {
        const contractor = await manager.findOne(User, { where: { id: contractorId } });
        console.log(`👤 Existing Contractor: "${contractor?.name}" (${contractor?.code})`);
      }

      // 3. Ensure an Employee (EM) is assigned to the Work Item
      let employeeAssignment = await manager.findOne(WorkItemEmployeeAssignment, {
        where: { work_item_id: workItem.id },
      });
      let employeeId: string;

      if (!employeeAssignment) {
        const employee = await manager.findOne(User, {
          where: { role: UserRole.EM, is_active: true },
        }) || await manager.findOne(User, {
          where: { role: UserRole.EM },
        });

        if (!employee) {
          throw new Error('No Employee (EM) found in the database. Please seed or create an employee first.');
        }

        employeeAssignment = manager.create(WorkItemEmployeeAssignment, {
          work_item_id: workItem.id,
          employee_id: employee.id,
        });
        await manager.save(WorkItemEmployeeAssignment, employeeAssignment);
        employeeId = employee.id;
        console.log(`👷 Assigned Employee: "${employee.name}" (${employee.code}) to the work item.`);
      } else {
        employeeId = employeeAssignment.employee_id;
        const employee = await manager.findOne(User, { where: { id: employeeId } });
        console.log(`👷 Existing Assigned Employee: "${employee?.name}" (${employee?.code})`);
      }

      // 4. Fetch all component mappings for this Work Item
      const mappings = await manager.find(WorkItemComponent, {
        where: { work_item_id: workItem.id },
        relations: ['component'],
      });

      if (mappings.length === 0) {
        console.warn('⚠️ Warning: No components found mapped to this work item.');
      } else {
        console.log(`📋 Processing ${mappings.length} components...`);
      }

      // 5. Complete and approve each component
      for (const mapping of mappings) {
        const quantity = mapping.quantity !== null && mapping.quantity !== undefined
          ? Number(mapping.quantity)
          : 10.0;

        mapping.quantity = quantity;
        mapping.progress = quantity;

        // If the component is not already approved, set up a mock photo and approve it
        if (mapping.status !== WorkItemComponentStatus.APPROVED) {
          let approvedPhotoId = mapping.approved_photo_id;

          if (!approvedPhotoId) {
            const photo = manager.create(Photo, {
              image_url: 'https://example.com/mock-progress-photo.jpg',
              latitude: Number(workItem.latitude) || 21.2787,
              longitude: Number(workItem.longitude) || 81.8661,
              timestamp: new Date(),
              employee_id: employeeId,
              component_id: mapping.id,
              work_item_id: workItem.id,
              is_selected: true,
              selected_by: contractorId,
              selected_at: new Date(),
              is_forwarded_to_do: true,
              forwarded_at: new Date(),
            });

            const savedPhoto = await manager.save(Photo, photo);
            approvedPhotoId = savedPhoto.id;
          }

          mapping.approved_photo_id = approvedPhotoId;
          mapping.approved_at = new Date();
          mapping.status = WorkItemComponentStatus.APPROVED;
          await manager.save(WorkItemComponent, mapping);
          console.log(`   ✅ Component [Order: ${mapping.component?.order_number || '?'}] "${mapping.component?.name || mapping.component_id}" approved.`);
        } else {
          console.log(`   ℹ️ Component [Order: ${mapping.component?.order_number || '?'}] "${mapping.component?.name || mapping.component_id}" is already APPROVED.`);
        }
      }

      // 6. Set overall Work Item progress and status to completed
      workItem.progress_percentage = 100.00;
      workItem.status = WorkItemStatus.COMPLETED;
      await manager.save(WorkItem, workItem);

      console.log(`🎉 Success: Work order "${workItem.work_code}" is now 100% complete and approved!`);
    });
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  completeWorkItem()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error: Failed to complete work item:', error.message || error);
      process.exit(1);
    });
}
