import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Component } from '../modules/components/entities/component.entity';

interface SeedComponent {
  name: string;
  unit: string;
  order_number: number;
}

const STATIC_COMPONENTS: SeedComponent[] = [
  {
    name: 'Supply & Installation of Submersible Pump',
    unit: 'No.',
    order_number: 1,
  },
  {
    name: 'Pumping Mains',
    unit: 'Mtr.',
    order_number: 2,
  },
  {
    name: 'OHT',
    unit: 'No.',
    order_number: 3,
  },
  {
    name: 'Chlorinator',
    unit: 'No.',
    order_number: 4,
  },
  {
    name: 'Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
  },
  {
    name: 'FHTC',
    unit: 'No.',
    order_number: 6,
  },
  {
    name: 'Electricity Charge For Power Connection',
    unit: 'No.',
    order_number: 7,
  },
  {
    name: 'Boundary Wall',
    unit: 'Mtr.',
    order_number: 8,
  },
  {
    name: 'Sump Well',
    unit: 'No.',
    order_number: 9,
  },
  {
    name: 'Switch Room',
    unit: 'No.',
    order_number: 10,
  },
  {
    name: 'Chlorinator Room',
    unit: 'No.',
    order_number: 11,
  },
  {
    name: 'Survey and DPR',
    unit: 'No.',
    order_number: 12,
  },
];

async function seedComponents() {
  console.log('🌱 Seeding master components...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const componentRepo = dataSource.getRepository(Component);

  try {
    for (const component of STATIC_COMPONENTS) {
      await componentRepo.upsert(
        {
          name: component.name,
          unit: component.unit,
          order_number: component.order_number,
        },
        ['order_number'],
      );
      console.log(`✅ Seeded: ${component.order_number}. ${component.name}`);
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
