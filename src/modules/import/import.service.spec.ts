import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ImportService,
  ImportType,
  type ImportUploadFile,
} from './import.service';

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(() => {
    service = new ImportService();
  });

  it('parses an agreement workbook and returns a preview table', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Agreement');

    sheet.addRow(['Agreement workbook', 'North Division']);
    sheet.addRow([
      'col1',
      'col2',
      'Agreement No',
      'Agreement Year',
      'Contractor Name',
      'Contractor Class',
      'Registration Id',
      'Work Codes',
      'Agreement Name',
      'PAC',
      'Sanction Percent',
      'Sanction Detail',
      'Work Order No',
      'Work Order Date',
      'Initial Contract Value',
      'Revised Contract Value',
      'Form Type',
      'Completion Date',
      'Agreement Status',
    ]);
    sheet.addRow([
      null,
      'AG-001',
      null,
      '2025-26',
      '1',
      'CON-001',
      'W-12',
      'WO-9001',
      new Date('2025-01-10'),
      null,
      null,
      null,
      null,
      new Date('2025-03-20'),
      'SR-001',
      'EXCEL-001',
      'UNIT-001',
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.parseWorkbook(
      {
        buffer,
        originalname: 'employees.xlsx',
      } as ImportUploadFile,
      ImportType.Agreement,
    );

    expect(result.filename).toBe('employees.xlsx');
    expect(result.sheetCount).toBe(1);
    expect(result.sheets[0].rowCount).toBe(3);
    expect(result.sheets[0].previewRows[2][8]).toEqual(
      new Date('2025-01-10').toISOString(),
    );
    expect(result.agreementTable?.[0]).toMatchObject({
      agreementno: 'AG-001',
      agreementyear: '2025-26',
      division_code: '1',
      contractor_code: 'CON-001',
      workcode: 'W-12',
      workorderno: 'WO-9001',
      workorderdate: new Date('2025-01-10T00:00:00.000Z'),
      systemdate: new Date('2025-03-20T00:00:00.000Z'),
      unitag: 'UNIT-001',
      excel: 'EXCEL-001',
      sr: 'SR-001',
    });
  });

  it('parses dd/mm/yyyy agreement work order dates from workbook rows', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Agreement');

    sheet.addRow(['Agreement workbook', 'North Division']);
    sheet.addRow([
      'col1',
      'col2',
      'Agreement No',
      'Agreement Year',
      'Contractor Name',
      'Contractor Class',
      'Registration Id',
      'Work Codes',
      'Agreement Name',
      'PAC',
      'Sanction Percent',
      'Sanction Detail',
      'Work Order No',
      'Work Order Date',
      'Initial Contract Value',
      'Revised Contract Value',
      'Form Type',
      'Completion Date',
      'Agreement Status',
    ]);
    sheet.addRow([
      null,
      'AG-002',
      null,
      '2025-26',
      2,
      'CON-002',
      'W-99',
      'WO-9002',
      '22/12/2023 06:16:23 PM',
      null,
      null,
      null,
      null,
      '23/12/2023 01:30:00 PM',
      'SR-002',
      'EXCEL-002',
      'UNIT-002',
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.parseWorkbook(
      {
        buffer,
        originalname: 'agreement-dd-mm.xlsx',
      } as ImportUploadFile,
      ImportType.Agreement,
    );

    expect(result.agreementTable?.[0].workorderdate).toBeInstanceOf(Date);
    expect(result.agreementTable?.[0].workorderdate?.toISOString()).toBe(
      new Date(2023, 11, 22, 18, 16, 23).toISOString(),
    );
    expect(result.agreementTable?.[0].systemdate?.toISOString()).toBe(
      new Date(2023, 11, 23, 13, 30, 0).toISOString(),
    );
  });

  it('parses a contractor workbook and returns a contractor table', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contractor');

    sheet.addRow([
      'contractorid',
      'contractorname',
      'contractor_code',
      'contractorpass',
      'pannumber',
      'contractorclass',
      'contractoremail',
      'contractorcno',
      'contractoraddress',
      'systemdate',
    ]);

    sheet.addRow([
      77,
      'Raza Infra',
      'CON-77',
      'sec-pass',
      'ABCDE1234F',
      'Class B',
      'contractor@example.com',
      '9876543210',
      'Main Road, Jaipur',
      new Date('2026-01-10'),
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.parseWorkbook(
      {
        buffer,
        originalname: 'contractor.xlsx',
      } as ImportUploadFile,
      ImportType.Contractor,
    );

    expect(result.contractorTable).toEqual([
      {
        contractorid: 77,
        contractorname: 'Raza Infra',
        contractor_code: 'CON-77',
        contractorpass: 'sec-pass',
        pannumber: 'ABCDE1234F',
        contractorclass: 'Class B',
        contractoremail: 'contractor@example.com',
        contractorcno: '9876543210',
        contractoraddress: 'Main Road, Jaipur',
        systemdate: new Date('2026-01-10T00:00:00.000Z'),
      },
    ]);
  });

  it('parses workitem workbook type and returns a table', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('WorkItem');

    sheet.addRow([
      'workcodeid',
      'workcode',
      'excel',
      'district_code',
      'block_code',
      'panchayat_code',
      'schemetype',
      'schemecategory',
      'nofhtc',
      'aa_amount',
      'payment_rs',
      'sr',
      'systemdate',
      'contractor_code',
    ]);
    sheet.addRow([
      101,
      'W-101',
      'EX-101',
      '12',
      '21',
      '31',
      'PWS',
      'Category A',
      '4',
      '1500',
      '1200',
      'SR-101',
      new Date('2026-01-10'),
      'CON-101',
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.parseWorkbook(
      {
        buffer,
        originalname: 'agreement.xlsx',
      } as ImportUploadFile,
      ImportType.WorkItem,
    );

    expect(result.workItemTable).toBeDefined();
    expect(result.workItemTable).toHaveLength(1);
    expect(result.workItemTable?.[0]).toMatchObject({
      workcodeid: 101,
      workcode: 'W-101',
      excel: 'EX-101',
      district_code: '12',
      block_code: '21',
      panchayat_code: '31',
      schemetype: 'PWS',
      schemecategory: 'Category A',
      nofhtc: 4,
      aa_amount: 1500,
      payment_rs: 1200,
      sr: 'SR-101',
      systemdate: new Date('2026-01-10T00:00:00.000Z'),
      contractor_code: 'CON-101',
    });
  });

  it('rejects unsupported import types', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Any').addRow(['x']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(
      service.parseWorkbook(
        {
          buffer,
          originalname: 'any.xlsx',
        } as ImportUploadFile,
        'other' as ImportType,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid workbook data', async () => {
    await expect(
      service.parseWorkbook(
        {
          buffer: Buffer.from('not-an-xlsx'),
          originalname: 'invalid.xlsx',
        } as ImportUploadFile,
        ImportType.Agreement,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
