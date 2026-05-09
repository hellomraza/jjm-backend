import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export type ImportSheetPreview = {
  name: string;
  rowCount: number;
  headers: string[];
  previewRows: unknown[][];
};

export type ImportWorkbookPreview = {
  filename: string;
  sheetCount: number;
  sheets: ImportSheetPreview[];
  agreements: Agreement[];
};

type ParsedWorkbook = {
  filename: string;
  sheetCount: number;
  sheets: {
    name: string;
    rowCount: number;
    headers: string[];
    previewRows: any[][];
    allRows: any[][];
  }[];
};

type Agreement = {
  agreementNo: number | null;
  agreementYear: string | null;
  contractorName: string | null;
  contractorClass: string | null;
  registrationId: string | null;
  workCodes: string[];
  agreementName: string | null;
  pacInLakh: number | null;
  sanctionPercent: number | null;
  sanctionDetail: string | null;
  workOrderNo: string | null;
  workOrderDate: Date | null;
  initialContractValueInLakh: number | null;
  revisedContractValueInLakh: number | null;
  formType: string | null;
  completionDate: Date | null;
  agreementStatus: string | null;
  divisionName: string | null;
};

@Injectable()
export class ImportService {
  private normalizeRow(values: unknown[]): unknown[] {
    return values.map((value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }

      return value;
    });
  }

  async parseWorkbook(
    file: Express.Multer.File,
  ): Promise<ImportWorkbookPreview> {
    const workbook = new ExcelJS.Workbook();
    const fileBuffer: any = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer);

    try {
      await workbook.xlsx.load(fileBuffer);
    } catch {
      throw new BadRequestException(
        'Uploaded file must be a valid .xlsx workbook',
      );
    }

    const sheets = workbook.worksheets.map((worksheet) => {
      const previewRows: unknown[][] = [];
      const allRows: unknown[][] = [];
      let headers: string[] = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowValues: unknown[] = [];

        row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          rowValues[columnNumber - 1] = cell.value;
        });

        const normalizedRowValues = this.normalizeRow(rowValues);

        // Store all rows
        allRows.push(normalizedRowValues);

        if (rowNumber === 1) {
          headers = normalizedRowValues.map((value) => String(value ?? ''));
        }

        if (previewRows.length < 5) {
          previewRows.push(normalizedRowValues);
        }
      });

      return {
        name: worksheet.name,
        rowCount: worksheet.rowCount,
        headers,
        previewRows,
        allRows,
      };
    });

    const parsedWorkbook: ParsedWorkbook = {
      filename: file.originalname,
      sheetCount: workbook.worksheets.length,
      sheets,
    };

    const agreements = this.convertWorkbookToAgreements(parsedWorkbook);

    return {
      filename: file.originalname,
      sheetCount: workbook.worksheets.length,
      sheets,
      agreements,
    };
  }

  private convertWorkbookToAgreements(workbook: ParsedWorkbook): Agreement[] {
    const agreements: Agreement[] = [];

    const sheet = workbook.sheets.find(
      (s) => s.rowCount > 0 && s.previewRows.length > 0,
    );

    if (!sheet) {
      return agreements;
    }

    const rows = sheet.allRows;

    // Division name is usually in first row second column
    const divisionName = this.normalizeString(rows?.[0]?.[1]) || null;

    // Actual table data starts after header rows
    const dataRows = rows.slice(2);

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;

      const agreement: Agreement = {
        agreementNo: this.normalizeNumber(row[2]),
        agreementYear: this.normalizeString(row[3]),
        contractorName: this.normalizeString(row[4]),
        contractorClass: this.normalizeString(row[5]),
        registrationId: this.normalizeString(row[6]),

        workCodes: this.extractWorkCodes(row[7]),

        agreementName: this.normalizeString(row[8]),

        pacInLakh: this.normalizeNumber(row[9]),

        sanctionPercent: this.normalizeNumber(row[10]),

        sanctionDetail: this.normalizeString(row[11]),

        workOrderNo: this.normalizeString(row[12]),

        workOrderDate: this.excelDateFix(row[13]),

        initialContractValueInLakh: this.normalizeNumber(row[14]),

        revisedContractValueInLakh: this.normalizeNumber(row[15]),

        formType: this.normalizeString(row[16]),

        completionDate: this.excelDateFix(row[17]),

        agreementStatus: this.normalizeString(row[18]),

        divisionName,
      };

      agreements.push(agreement);
    }

    return agreements;
  }

  private excelDateFix(date: any): Date | null {
    if (!date) return null;

    const parsed = new Date(date);

    // Ignore Excel default invalid dates
    if (parsed.getFullYear() === 1899 || parsed.getFullYear() === 1900) {
      return null;
    }

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeString(value: any): string | null {
    if (value === null || value === undefined) return null;

    const str = String(value).trim();

    return str.length ? str : null;
  }

  private normalizeNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = Number(value);

    return isNaN(num) ? null : num;
  }

  private extractWorkCodes(value: any): string[] {
    if (!value) return [];

    return String(value)
      .split(',')
      .map((v) => v.replace(/^\d+\./, '').trim())
      .filter(Boolean);
  }
}
