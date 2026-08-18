import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Component } from '../modules/components/entities/component.entity';
import { WorkOrderType } from '../modules/work-items/entities/work-item.entity';

interface SeedComponent {
  name: string;
  unit: string;
  order_number: number;
  work_order_type: WorkOrderType;
}

const STATIC_COMPONENTS: SeedComponent[] = [
  // SVS Components (12)
  {
    name: 'Supply & Installation of Submersible Pump',
    unit: 'No.',
    order_number: 1,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Pumping Mains',
    unit: 'Mtr.',
    order_number: 2,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'OHT',
    unit: 'No.',
    order_number: 3,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Chlorinator',
    unit: 'No.',
    order_number: 4,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'FHTC',
    unit: 'No.',
    order_number: 6,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Electricity Charge For Power Connection',
    unit: 'No.',
    order_number: 7,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Boundary Wall',
    unit: 'Mtr.',
    order_number: 8,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Sump Well',
    unit: 'No.',
    order_number: 9,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Switch Room',
    unit: 'No.',
    order_number: 10,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Chlorinator Room',
    unit: 'No.',
    order_number: 11,
    work_order_type: WorkOrderType.SVS,
  },
  {
    name: 'Survey and DPR',
    unit: 'No.',
    order_number: 12,
    work_order_type: WorkOrderType.SVS,
  },
  // Bulk Village Components (8 placeholders)
  {
    name: 'Inspection: Supply & Installation of Submersible Pump',
    unit: 'No.',
    order_number: 1,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: Pumping Mains',
    unit: 'Mtr.',
    order_number: 2,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: OHT',
    unit: 'No.',
    order_number: 3,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: Chlorinator',
    unit: 'No.',
    order_number: 4,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: FHTC',
    unit: 'No.',
    order_number: 6,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: Boundary Wall',
    unit: 'Mtr.',
    order_number: 7,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
  {
    name: 'Inspection: Sump Well',
    unit: 'No.',
    order_number: 8,
    work_order_type: WorkOrderType.BULK_VILLAGE,
  },
];

async function seedComponents() {
  console.log('🌱 Seeding master components...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const componentRepo = dataSource.getRepository(Component);

  try {
    const existingComponents = await componentRepo.find();
    // Use a unique key of "name|work_order_type"
    const existingMap = new Map(
      existingComponents.map((component) => [
        `${component.name}|${component.work_order_type}`,
        component,
      ]),
    );

    // Update existing unassigned SVS components to have work_order_type = SVS in DB
    for (const component of existingComponents) {
      if (!component.work_order_type) {
        component.work_order_type = WorkOrderType.SVS;
        await componentRepo.save(component);
      }
    }

    for (const component of STATIC_COMPONENTS) {
      const key = `${component.name}|${component.work_order_type}`;
      const existing = existingMap.get(key);

      if (existing) {
        existing.unit = component.unit;
        existing.order_number = component.order_number;
        existing.work_order_type = component.work_order_type;
        await componentRepo.save(existing);
      } else {
        await componentRepo.save(
          componentRepo.create({
            name: component.name,
            unit: component.unit,
            order_number: component.order_number,
            work_order_type: component.work_order_type,
          }),
        );
      }

      console.log(`✅ Seeded: [${component.work_order_type}] ${component.order_number}. ${component.name}`);
    }

    console.log('\n✨ Master components seeded successfully!');
    console.log(`📊 Total templates: ${STATIC_COMPONENTS.length}`);
  } catch (error) {
    console.error('❌ Error seeding master components:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedComponents()
  .then(() => {
    console.log('\n🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
