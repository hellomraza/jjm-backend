import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { ComponentTemplate } from '../modules/components/entities/component-template.entity';

interface SeedComponentTemplate {
  name: string;
  unit: string;
  order_number: number;
}

const STATIC_COMPONENTS: SeedComponentTemplate[] = [
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

async function seedComponentTemplates() {
  console.log('🌱 Seeding component templates...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const templateRepo = dataSource.getRepository(ComponentTemplate);

  try {
    // Upsert all component templates (idempotent)
    for (const template of STATIC_COMPONENTS) {
      await templateRepo.upsert(
        {
          name: template.name,
          unit: template.unit,
          order_number: template.order_number,
        },
        ['order_number'], // conflict target
      );
      console.log(`✅ Seeded: ${template.order_number}. ${template.name}`);
    }

    console.log('\n✨ Component templates seeded successfully!');
    console.log(`📊 Total templates: ${STATIC_COMPONENTS.length}`);
  } catch (error) {
    console.error('❌ Error seeding component templates:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedComponentTemplates()
  .then(() => {
    console.log('\n🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
