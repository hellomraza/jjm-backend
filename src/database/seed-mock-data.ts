import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import 'reflect-metadata';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../app.module';
import { Component } from '../modules/components/entities/component.entity';
import {
  WorkItemComponent,
  WorkItemComponentStatus,
} from '../modules/components/entities/work-item-component.entity';
import { Photo } from '../modules/photos/entities/photo.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import {
  WorkItem,
  WorkItemStatus,
} from '../modules/work-items/entities/work-item.entity';

type SeedUser = {
  email: string;
  name: string;
  role: UserRole;
  district_id?: number;
};

async function seedMockData() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    const userRepo = dataSource.getRepository(User);
    const workItemRepo = dataSource.getRepository(WorkItem);
    const componentRepo = dataSource.getRepository(Component);
    const workItemComponentRepo = dataSource.getRepository(WorkItemComponent);
    const photoRepo = dataSource.getRepository(Photo);

    const passwordPlain = 'Mock@1234';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    const seedUsers: SeedUser[] = [
      {
        email: 'ho.mock@jjm.local',
        name: 'Head Office Mock',
        role: UserRole.HO,
      },
      {
        email: 'do.mock@jjm.local',
        name: 'District Officer Mock',
        role: UserRole.DO,
        district_id: 10,
      },
      {
        email: 'co.mock.1@jjm.local',
        name: 'Contractor Mock 1',
        role: UserRole.CO,
        district_id: 10,
      },
      {
        email: 'co.mock.2@jjm.local',
        name: 'Contractor Mock 2',
        role: UserRole.CO,
        district_id: 11,
      },
      {
        email: 'em.mock.1@jjm.local',
        name: 'Employee Mock 1',
        role: UserRole.EM,
        district_id: 10,
      },
      {
        email: 'em.mock.2@jjm.local',
        name: 'Employee Mock 2',
        role: UserRole.EM,
        district_id: 11,
      },
    ];

    await userRepo.upsert(
      seedUsers.map((user) => ({
        email: user.email,
        name: user.name,
        role: user.role,
        district_id: user.district_id,
        password: passwordHash,
      })),
      ['email'],
    );

    const allMockUsers = await userRepo.find({
      where: {
        email: In(seedUsers.map((user) => user.email)),
      },
    });

    const usersByEmail = new Map(
      allMockUsers.map((user) => [user.email, user]),
    );

    const contractor1 = usersByEmail.get('co.mock.1@jjm.local');
    const contractor2 = usersByEmail.get('co.mock.2@jjm.local');
    const employee1 = usersByEmail.get('em.mock.1@jjm.local');
    const employee2 = usersByEmail.get('em.mock.2@jjm.local');
    const districtOfficer = usersByEmail.get('do.mock@jjm.local');

    if (
      !contractor1 ||
      !contractor2 ||
      !employee1 ||
      !employee2 ||
      !districtOfficer
    ) {
      throw new Error('Failed to resolve seeded users');
    }

    const existingMockWorkItems = await workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.title LIKE :prefix', { prefix: 'MOCK-%' })
      .getMany();

    if (existingMockWorkItems.length > 0) {
      const mockWorkItemIds = existingMockWorkItems.map(
        (workItem) => workItem.id,
      );
      await photoRepo.delete({ work_item_id: In(mockWorkItemIds) });
      await workItemComponentRepo.delete({ work_item_id: In(mockWorkItemIds) });
      await workItemRepo.delete({ id: In(mockWorkItemIds) });
    }

    const workItems = await workItemRepo.save([
      workItemRepo.create({
        title: 'MOCK-Work Item 1',
        description: 'Mock data for district 10 - in progress',
        district_id: 10,
        contractor_id: contractor1.id,
        latitude: 25.5941,
        longitude: 85.1376,
        progress_percentage: 33.33,
        status: WorkItemStatus.IN_PROGRESS,
      }),
      workItemRepo.create({
        title: 'MOCK-Work Item 2',
        description: 'Mock data for district 11 - pending',
        district_id: 11,
        contractor_id: contractor2.id,
        latitude: 25.3176,
        longitude: 82.9739,
        progress_percentage: 0,
        status: WorkItemStatus.PENDING,
      }),
      workItemRepo.create({
        title: 'MOCK-Work Item 3',
        description: 'Mock data for district 10 - completed',
        district_id: 10,
        contractor_id: contractor1.id,
        latitude: 28.6139,
        longitude: 77.209,
        progress_percentage: 100,
        status: WorkItemStatus.COMPLETED,
      }),
    ]);

    const componentsToCreate: Component[] = [];

    // Fetch all 12 master components to create mappings
    const masterComponents = await componentRepo.find({
      order: { order_number: 'ASC' },
    });

    if (masterComponents.length !== 12) {
      throw new Error(
        `Expected 12 master components, found ${masterComponents.length}. Run seed-component-templates first.`,
      );
    }

    // Create work_item_components mappings
    const workItemComponentsToCreate: WorkItemComponent[] = [];
    for (const workItem of workItems) {
      for (const masterComponent of masterComponents) {
        // Determine mapping status based on work item status
        let mappingStatus: WorkItemComponentStatus;
        if (workItem.status === WorkItemStatus.COMPLETED) {
          mappingStatus = WorkItemComponentStatus.APPROVED;
        } else if (
          workItem.status === WorkItemStatus.IN_PROGRESS &&
          masterComponent.order_number <= 2
        ) {
          mappingStatus = WorkItemComponentStatus.IN_PROGRESS;
        } else {
          mappingStatus = WorkItemComponentStatus.PENDING;
        }

        const mapping = new WorkItemComponent();
        mapping.work_item_id = workItem.id;
        mapping.component_id = masterComponent.id;
        mapping.quantity = undefined;
        mapping.remarks = undefined;
        mapping.status = mappingStatus;
        mapping.approved_photo_id = undefined;

        workItemComponentsToCreate.push(mapping);
      }
    }

    const savedWorkItemComponents = await workItemComponentRepo.save(
      workItemComponentsToCreate,
    );

    // Create photos linked to work_item_components mappings
    const photosToCreate: Photo[] = [];

    for (const workItem of workItems) {
      // Get mappings for this work item
      const workItemMappings = savedWorkItemComponents.filter(
        (m) => m.work_item_id === workItem.id,
      );

      if (workItemMappings.length !== 12) {
        throw new Error(
          `Expected 12 mappings for work item ${workItem.id}, found ${workItemMappings.length}`,
        );
      }

      const mapping1 = workItemMappings[0]; // First component
      const mapping2 = workItemMappings[1]; // Second component

      const baseLat = Number(workItem.latitude) || 25.0;
      const baseLong = Number(workItem.longitude) || 85.0;

      photosToCreate.push(
        photoRepo.create({
          image_url: `https://mock-bucket.s3.ap-south-1.amazonaws.com/work-items/${workItem.id}/component-${mapping1.id}/photo-1.jpg`,
          latitude: baseLat,
          longitude: baseLong,
          timestamp: new Date(),
          employee_id: employee1.id,
          component_id: mapping1.id,
          work_item_id: workItem.id,
          is_selected: true,
          selected_by: workItem.contractor_id,
          selected_at: new Date(),
          is_forwarded_to_do: true,
          forwarded_at: new Date(),
        }),
      );

      photosToCreate.push(
        photoRepo.create({
          image_url: `https://mock-bucket.s3.ap-south-1.amazonaws.com/work-items/${workItem.id}/component-${mapping1.id}/photo-2.jpg`,
          latitude: baseLat + 0.0005,
          longitude: baseLong + 0.0005,
          timestamp: new Date(),
          employee_id: employee2.id,
          component_id: mapping1.id,
          work_item_id: workItem.id,
          is_selected: false,
          selected_by: null,
          selected_at: null,
          is_forwarded_to_do: false,
          forwarded_at: null,
        }),
      );

      photosToCreate.push(
        photoRepo.create({
          image_url: `https://mock-bucket.s3.ap-south-1.amazonaws.com/work-items/${workItem.id}/component-${mapping2.id}/photo-1.jpg`,
          latitude: baseLat + 0.001,
          longitude: baseLong + 0.001,
          timestamp: new Date(),
          employee_id: employee1.id,
          component_id: mapping2.id,
          work_item_id: workItem.id,
          is_selected: false,
          selected_by: null,
          selected_at: null,
          is_forwarded_to_do: false,
          forwarded_at: null,
        }),
      );
    }

    const savedPhotos = await photoRepo.save(photosToCreate);

    console.log('✅ Mock data seeded successfully');
    console.log(`Users: ${allMockUsers.length}`);
    console.log(`Work Items: ${workItems.length}`);
    console.log(`Work Item Components: ${savedWorkItemComponents.length}`);
    console.log(`Photos: ${savedPhotos.length}`);
    console.log('Mock user password:', passwordPlain);
  } finally {
    await app.close();
  }
}

seedMockData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to seed mock data:', error);
    process.exit(1);
  });
