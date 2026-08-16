import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import {
  Component,
  ComponentType,
} from '../modules/components/entities/component.entity';

export interface SeedComponent {
  name: string;
  unit: string;
  order_number: number;
  type: ComponentType | string;
}

export const STATIC_SVS_COMPONENTS: SeedComponent[] = [
  {
    name: 'Supply & Installation of Submersible Pump',
    unit: 'No.',
    order_number: 1,
    type: ComponentType.SVS,
  },
  {
    name: 'Pumping Mains',
    unit: 'Mtr.',
    order_number: 2,
    type: ComponentType.SVS,
  },
  {
    name: 'OHT',
    unit: 'No.',
    order_number: 3,
    type: ComponentType.SVS,
  },
  {
    name: 'Chlorinator',
    unit: 'No.',
    order_number: 4,
    type: ComponentType.SVS,
  },
  {
    name: 'Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
    type: ComponentType.SVS,
  },
  {
    name: 'FHTC',
    unit: 'No.',
    order_number: 6,
    type: ComponentType.SVS,
  },
  {
    name: 'Electricity Charge For Power Connection',
    unit: 'No.',
    order_number: 7,
    type: ComponentType.SVS,
  },
  {
    name: 'Boundary Wall',
    unit: 'Mtr.',
    order_number: 8,
    type: ComponentType.SVS,
  },
  {
    name: 'Sump Well',
    unit: 'No.',
    order_number: 9,
    type: ComponentType.SVS,
  },
  {
    name: 'Switch Room',
    unit: 'No.',
    order_number: 10,
    type: ComponentType.SVS,
  },
  {
    name: 'Chlorinator Room',
    unit: 'No.',
    order_number: 11,
    type: ComponentType.SVS,
  },
  {
    name: 'Survey and DPR',
    unit: 'No.',
    order_number: 12,
    type: ComponentType.SVS,
  },
];

export const STATIC_TPI_COMPONENTS: SeedComponent[] = [
  {
    name: 'Inspection: Source & Submersible Pump',
    unit: 'No.',
    order_number: 1,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Pumping Mains & Pipeline',
    unit: 'Mtr.',
    order_number: 2,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Overhead Tank (OHT)',
    unit: 'No.',
    order_number: 3,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Chlorination Unit',
    unit: 'No.',
    order_number: 4,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Household Tap Connections (FHTC)',
    unit: 'No.',
    order_number: 6,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Power Connection & Electricals',
    unit: 'No.',
    order_number: 7,
    type: ComponentType.TPI,
  },
  {
    name: 'Inspection: Boundary Wall & Civil Structure',
    unit: 'Mtr.',
    order_number: 8,
    type: ComponentType.TPI,
  },
];

const ALL_SEED_COMPONENTS: SeedComponent[] = [
  ...STATIC_SVS_COMPONENTS,
  ...STATIC_TPI_COMPONENTS,
];

async function seedComponents() {
  console.log('🌱 Seeding master components (SVS & TPI)...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const componentRepo = dataSource.getRepository(Component);

  try {
    const existingComponents = await componentRepo.find();
    const existingByKey = new Map(
      existingComponents.map((c) => [`${c.type || ComponentType.SVS}_${c.order_number}`, c]),
    );

    for (const component of ALL_SEED_COMPONENTS) {
      const key = `${component.type}_${component.order_number}`;
      const existing = existingByKey.get(key) || existingComponents.find((c) => c.name === component.name);

      if (existing) {
        existing.type = component.type;
        existing.name = component.name;
        existing.unit = component.unit;
        existing.order_number = component.order_number;
        await componentRepo.save(existing);
      } else {
        await componentRepo.save(
          componentRepo.create({
            type: component.type,
            name: component.name,
            unit: component.unit,
            order_number: component.order_number,
          }),
        );
      }

      console.log(`✅ Seeded [${component.type}]: ${component.order_number}. ${component.name}`);
    }

    console.log('\n✨ Master components seeded successfully!');
    console.log(`📊 Total templates: ${ALL_SEED_COMPONENTS.length}`);
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
