import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(() => {
    service = new ImportService();
  });

  it('parses an uploaded workbook and returns a preview', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');

    sheet.addRow(['name', 'email']);
    sheet.addRow(['Alice', 'alice@example.com']);
    sheet.addRow(['Bob', 'bob@example.com']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.parseWorkbook({
      buffer,
      originalname: 'employees.xlsx',
    } as Express.Multer.File);

    expect(result.filename).toBe('employees.xlsx');
    expect(result.sheetCount).toBe(1);
    expect(result.sheets[0]).toEqual({
      name: 'Employees',
      rowCount: 3,
      headers: ['name', 'email'],
      previewRows: [
        ['name', 'email'],
        ['Alice', 'alice@example.com'],
        ['Bob', 'bob@example.com'],
      ],
    });
  });

  it('rejects invalid workbook data', async () => {
    await expect(
      service.parseWorkbook({
        buffer: Buffer.from('not-an-xlsx'),
        originalname: 'invalid.xlsx',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});