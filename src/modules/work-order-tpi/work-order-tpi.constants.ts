export interface StaticTpiComponent {
  name: string;
  unit: string;
  order_number: number;
}

export const STATIC_TPI_COMPONENTS: StaticTpiComponent[] = [
  {
    name: 'Inspection: Source & Submersible Pump',
    unit: 'No.',
    order_number: 1,
  },
  {
    name: 'Inspection: Pumping Mains & Pipeline',
    unit: 'Mtr.',
    order_number: 2,
  },
  {
    name: 'Inspection: Overhead Tank (OHT)',
    unit: 'No.',
    order_number: 3,
  },
  {
    name: 'Inspection: Chlorination Unit',
    unit: 'No.',
    order_number: 4,
  },
  {
    name: 'Inspection: Distribution Network',
    unit: 'Mtr.',
    order_number: 5,
  },
  {
    name: 'Inspection: Household Tap Connections (FHTC)',
    unit: 'No.',
    order_number: 6,
  },
  {
    name: 'Inspection: Power Connection & Electricals',
    unit: 'No.',
    order_number: 7,
  },
  {
    name: 'Inspection: Boundary Wall & Civil Structure',
    unit: 'Mtr.',
    order_number: 8,
  },
];
