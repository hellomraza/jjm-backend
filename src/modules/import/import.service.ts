import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Agreement } from '../agreements/entities/agreement.entity';
import { User } from '../users/entities/user.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';

export type ImportUploadFile = {
  buffer: Buffer;
  originalname: string;
};

export enum ImportType {
  WorkItem = 'workitem',
  Agreement = 'agreement',
  Contractor = 'contractor',
}

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
  agreementTable?: AgreementImport[];
  workItemTable?: WorkItemImport[];
  contractorTable?: Contractor[];
};

type ParsedWorkbook = {
  filename: string;
  sheetCount: number;
  sheets: {
    name: string;
    rowCount: number;
    headers: string[];
    previewRows: unknown[][];
    allRows: unknown[][];
  }[];
};

export type AgreementImport = {
  agrid: number | null;
  agreementno: string | null;
  agreementyear: string | null;
  division_code: string | null;
  contractor_code: string | null;
  workcode: string | null;
  workorderno: string | null;
  workorderdate: Date | null;
  dispatch_no: string | null;
  dispatch_date: string | null;
  already_sent: string | null;
  systemdate: Date | null;
  unitag: string | null;
  excel: string | null;
  sr: string | null;
};

export const importAgreementMapping: Record<
  string,
  keyof AgreementImport
> = {
  agreementno: 'agreementno',
  agreementyear: 'agreementyear',
  division_code: 'division_code',
  contractor_id: 'contractor_code',
  work_id: 'workcode',
  workorderno: 'workorderno',
  workorderdate: 'workorderdate',
  dispatch_no: 'dispatch_no',
  dispatch_date: 'dispatch_date',
  already_sent: 'already_sent',
  excel: 'excel',
  sr: 'sr',
  agrid: 'agrid',
  unitag: 'unitag',
};

export type WorkItemImport = {
  workcodeid: number | null;
  workcode: string | null;
  excel: string | null;
  district_code: string | null;
  block_code: string | null;
  panchayat_code: string | null;
  schemetype: string | null;
  schemecategory: string | null;
  nofhtc: number | null;
  aa_amount: number | null;
  payment_rs: number | null;
  sr: string | null;
  systemdate: Date | null;
  contractor_code: string | null;
};

export const importWorkItemMapping: Record<
  keyof Omit<
    WorkItem,
    | 'updated_at'
    | 'id'
    | 'circle_id'
    | 'description'
    | 'agreement'
    | 'contractor'
    | 'district'
    | 'block'
    | 'panchayat'
    | 'village'
    | 'subdivision'
    | 'zone'
    | 'latitude'
    | 'longitude'
    | 'status'
    | 'progress_percentage'
    | 'title'
    | 'circle'
    | 'village_id'
    | 'zone_id'
    | 'subdivision_id'
    | 'agreement_id'
  >,
  keyof WorkItemImport
> = {
  amount_approved: 'aa_amount',
  block_id: 'block_code',
  district_id: 'district_code',
  excel: 'excel',
  nofhtc: 'nofhtc',
  contractor_id: 'contractor_code',
  panchayat_id: 'panchayat_code',
  work_code: 'workcode',
  payment_amount: 'payment_rs',
  schemecategory: 'schemecategory',
  schemetype: 'schemetype',
  serial_no: 'sr',
  created_at: 'systemdate',
  workcodeid: 'workcodeid',
};

type Contractor = {
  contractorid: number | null;
  contractorname: string | null;
  contractor_code: string | null;
  contractorpass: string | null;
  pannumber: string | null;
  contractorclass: string | null;
  contractoremail: string | null;
  contractorcno: string | null;
  contractoraddress: string | null;
  systemdate: Date | null;
};

export const importContractorMapping: Record<
  keyof Omit<User, 'district' | 'is_executive_engineer'>,
  keyof Contractor
> = {
  address: 'contractoraddress',
  auid: 'contractorid',
  code: 'contractor_code',
  contractorid: 'contractorid',
  designation: 'contractorclass',
  district_id: 'contractorid',
  email: 'contractoremail',
  id: 'contractorid',
  mobile: 'contractorcno',
  name: 'contractorname',
  pan_number: 'pannumber',
  password: 'contractorpass',
  role: 'contractorclass',
  updated_at: 'systemdate',
  created_at: 'systemdate',
  district_name: 'systemdate',
  is_active: 'contractorclass',
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
    file: ImportUploadFile,
    type: ImportType,
  ): Promise<ImportWorkbookPreview> {
    if (
      type !== ImportType.Agreement &&
      type !== ImportType.WorkItem &&
      type !== ImportType.Contractor
    ) {
      throw new BadRequestException(
        'Only agreement, workitem and contractor uploads are supported right now',
      );
    }

    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(file.buffer as never);
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
          headers = normalizedRowValues.map((value) =>
            this.normalizeHeader(value),
          );
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

    const result: ImportWorkbookPreview = {
      filename: file.originalname,
      sheetCount: workbook.worksheets.length,
      sheets,
    };

    if (type === ImportType.Agreement) {
      result.agreementTable = this.convertWorkbookToAgreements(parsedWorkbook);
    }

    if (type === ImportType.WorkItem) {
      result.workItemTable = this.convertWorkbookToWorkItems(parsedWorkbook);
    }

    if (type === ImportType.Contractor) {
      result.contractorTable =
        this.convertWorkbookToContractors(parsedWorkbook);
    }

    return result;
  }

  private convertWorkbookToContractors(workbook: ParsedWorkbook): Contractor[] {
    const contractors: Contractor[] = [];

    const sheet = workbook.sheets.find(
      (s) => s.rowCount > 0 && s.previewRows.length > 0,
    );

    if (!sheet) return contractors;

    const rows = sheet.allRows;

    let headerRowIndex = -1;
    const knownHeaders = [
      'name_of_contractoreng',
      'name_of_contractor',
      'contractorid',
      'contractor_id',
      'contractor id',
      'contractorname',
      'contractor name',
      'panno',
      'pan_no',
      'pannumber',
      'classofcontractor',
      'email',
      'mobile',
    ];

    for (let i = 0; i < rows.length; i++) {
      const rowStr = (rows[i] ?? [])
        .map((val) => String(val ?? '').toLowerCase())
        .join(' ');
      if (knownHeaders.some((h) => rowStr.includes(h))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headers = (rows[headerRowIndex] ?? []).map((h) =>
      String(h ?? '').toLowerCase().trim(),
    );

    const findIndex = (names: string[]) => {
      for (const n of names) {
        const idx = headers.findIndex((h) => h.includes(n));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxMap = {
      contractorid: findIndex([
        'sno',
        'sr.no',
        'sr_no',
        'sr',
        'contractorid',
        'contractor id',
        'contractor_id',
      ]),
      contractorname: findIndex([
        'name_of_contractoreng',
        'name_of_contractor',
        'contractorname',
        'contractor name',
        'contractor_name',
      ]),
      contractor_code: findIndex([
        'contractor_code',
        'contractor code',
        'cid',
        'contractorid',
        'contractor_id',
        'contractor id',
      ]),
      contractorpass: findIndex([
        'contractorpass',
        'contractor pass',
        'contractor_pass',
        'password',
      ]),
      pannumber: findIndex([
        'panno',
        'pan_no',
        'pannumber',
        'pan number',
        'pan_number',
        'pan',
      ]),
      contractorclass: findIndex([
        'classofcontractor',
        'class_of_contractor',
        'contractorclass',
        'contractor class',
        'contractor_class',
      ]),
      contractoremail: findIndex([
        'contractoremail',
        'contractor email',
        'contractor_email',
        'email',
      ]),
      contractorcno: findIndex([
        'contractorcno',
        'contractor cno',
        'contractor_cno',
        'contractor mobile',
        'mobile',
      ]),
      contractoraddress: findIndex([
        'address_of_contractoreng',
        'address_of_contractor',
        'contractoraddress',
        'contractor address',
        'contractor_address',
        'address',
      ]),
      systemdate: findIndex([
        'systemdate',
        'system date',
        'system_date',
        'date',
      ]),
    };

    const dataRows = rows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;

      const get = (i: number): unknown => (i >= 0 ? row[i] : undefined);

      const parsedCode = this.normalizeString(get(idxMap.contractor_code));
      const parsedIdRaw = get(idxMap.contractorid);
      const parsedIdNum = this.normalizeNumber(parsedIdRaw);

      let contractorCode = parsedCode;
      if (!contractorCode && parsedIdRaw !== undefined && parsedIdRaw !== null) {
        contractorCode = String(parsedIdRaw).trim() || null;
      }

      const contractor: Contractor = {
        contractorid: parsedIdNum,
        contractorname: this.normalizeString(get(idxMap.contractorname)),
        contractor_code: contractorCode,
        contractorpass: this.normalizeString(get(idxMap.contractorpass)),
        pannumber: this.normalizeString(get(idxMap.pannumber)),
        contractorclass: this.normalizeString(get(idxMap.contractorclass)),
        contractoremail: this.normalizeString(get(idxMap.contractoremail)),
        contractorcno: this.normalizeString(get(idxMap.contractorcno)),
        contractoraddress: this.normalizeString(get(idxMap.contractoraddress)),
        systemdate: this.excelDateFix(get(idxMap.systemdate)),
      };

      if (Object.values(contractor).every((value) => value === null)) {
        continue;
      }

      contractors.push(contractor);
    }

    return contractors;
  }

  private convertWorkbookToWorkItems(
    workbook: ParsedWorkbook,
  ): WorkItemImport[] {
    const items: WorkItemImport[] = [];

    const sheet = workbook.sheets.find(
      (s) => s.rowCount > 0 && s.previewRows.length > 0,
    );

    if (!sheet) return items;

    const rows = sheet.allRows;

    let headerRowIndex = -1;
    const knownHeaders = [
      'workcode',
      'work_code',
      'work code',
      'workcodenew',
      'districtid',
      'district_id',
      'blockid',
      'panchayatid',
      'aa_amount',
      'payment_done',
    ];

    for (let i = 0; i < rows.length; i++) {
      const rowStr = (rows[i] ?? [])
        .map((val) => String(val ?? '').toLowerCase())
        .join(' ');
      if (knownHeaders.some((h) => rowStr.includes(h))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headers = (rows[headerRowIndex] ?? []).map((h) =>
      String(h ?? '').toLowerCase().trim(),
    );

    const findIndex = (names: string[]) => {
      for (const n of names) {
        const idx = headers.findIndex((h) => h.includes(n));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const findExactIndex = (names: string[]) => {
      for (const n of names) {
        const idx = headers.findIndex((h) => h === n);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxMap = {
      workcodeid: findIndex([
        'workcodeid',
        'workcode id',
        'work_code_id',
        'work id',
        'workid',
      ]),
      workcode: findExactIndex([
        'workcode',
        'work code',
        'work_code',
        'workcodenew',
        'work_code_new',
      ]),
      excel: findIndex(['excel']),
      district_code: findIndex([
        'districtid',
        'district_id',
        'district_code',
        'district code',
        'district',
      ]),
      block_code: findIndex([
        'blockid',
        'block_id',
        'block_code',
        'block code',
        'block',
      ]),
      panchayat_code: findIndex([
        'panchayatid',
        'panchayat_id',
        'panchayat_code',
        'panchayat code',
        'panchayat',
      ]),
      schemetype: findIndex([
        'scheme',
        'schemetype',
        'scheme type',
        'scheme_type',
      ]),
      schemecategory: findIndex([
        'schemecategory',
        'scheme category',
        'scheme_category',
      ]),
      nofhtc: findIndex([
        'no_fhtc',
        'no fhtc',
        'nofhtc',
        'no of htc',
        'nof htc',
      ]),
      aa_amount: findIndex(['aa_amount', 'aa amount', 'aaamount', 'aa_amt']),
      payment_rs: findIndex([
        'payment_done',
        'payment done',
        'payment_rs',
        'payment rs',
        'payment',
      ]),
      sr: findIndex(['s.no.', 's.no', 'sno', 'sr', 's/r', 's r']),
      systemdate: findIndex([
        'systemdate',
        'system date',
        'system_date',
        'date',
      ]),
      contractor_code: findIndex([
        'contractor_code',
        'contractor code',
        'cid',
        'contractorid',
      ]),
    };

    const dataRows = rows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;

      const get = (i: number): unknown => (i >= 0 ? row[i] : undefined);

      const item: WorkItemImport = {
        workcodeid: this.normalizeNumber(get(idxMap.workcodeid)),
        workcode: this.normalizeString(get(idxMap.workcode)),
        excel: this.normalizeString(get(idxMap.excel)),
        district_code: this.normalizeString(get(idxMap.district_code)),
        block_code: this.normalizeString(get(idxMap.block_code)),
        panchayat_code: this.normalizeString(get(idxMap.panchayat_code)),
        schemetype: this.normalizeString(get(idxMap.schemetype)),
        schemecategory: this.normalizeString(get(idxMap.schemecategory)),
        nofhtc: this.normalizeNumber(get(idxMap.nofhtc)),
        aa_amount: this.normalizeNumber(get(idxMap.aa_amount)),
        payment_rs: this.normalizeNumber(get(idxMap.payment_rs)),
        sr: this.normalizeString(get(idxMap.sr)),
        systemdate: this.excelDateFix(get(idxMap.systemdate)),
        contractor_code: this.normalizeString(get(idxMap.contractor_code)),
      };

      items.push(item);
    }

    return items;
  }

  private convertWorkbookToAgreements(
    workbook: ParsedWorkbook,
  ): AgreementImport[] {
    const agreements: AgreementImport[] = [];

    const sheet = workbook.sheets.find(
      (s) => s.rowCount > 0 && s.previewRows.length > 0,
    );

    if (!sheet) {
      return agreements;
    }

    const rows = sheet.allRows;

    let headerRowIndex = -1;
    const modernHeaderKeywords = [
      'agreement_no',
      'year_of_agreement',
      'ddocode',
      'workcodenew',
      'dispatchno',
      'dispatchdate',
      'alredysend',
      'sr.no',
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowStr = row
        .map((val) =>
          val === null || val === undefined
            ? ''
            : typeof val === 'string' ||
                typeof val === 'number' ||
                typeof val === 'boolean'
              ? String(val).toLowerCase()
              : (JSON.stringify(val)?.toLowerCase() ?? ''),
        )
        .join(' ');
      if (
        modernHeaderKeywords.some((keyword) =>
          rowStr.includes(keyword.toLowerCase()),
        )
      ) {
        headerRowIndex = i;
        break;
      }
    }

    const isModernFormat = headerRowIndex !== -1;

    if (isModernFormat) {
      const headers = (rows[headerRowIndex] ?? []).map((h) =>
        String(h ?? '').toLowerCase().trim(),
      );

      const findIndex = (names: string[]) => {
        for (const n of names) {
          const idx = headers.findIndex((h) => h.includes(n));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const findExactIndex = (names: string[]) => {
        for (const n of names) {
          const idx = headers.findIndex((h) => h === n);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const idxMap = {
        agrid: findIndex(['agrid', 'agr id', 'agri_id']),
        agreementno: findIndex(['agreement_no', 'agreement no', 'agreementno']),
        agreementyear: findIndex([
          'year_of_agreement',
          'agreement_year',
          'agreement year',
          'agreementyear',
        ]),
        division_code: findIndex([
          'ddocode',
          'ddo_code',
          'ddo code',
          'division_code',
          'division code',
        ]),
        contractor_code: findIndex([
          'cid',
          'contractorid',
          'contractor_id',
          'contractor_code',
          'contractor code',
        ]),
        workcode: findExactIndex([
          'workcodenew',
          'work_code_new',
          'workcode',
          'work_code',
          'work code',
          'work_id',
        ]),
        workorderno: findIndex(['workorderno', 'work order no', 'work_order_no']),
        workorderdate: findIndex([
          'workorderdate',
          'work order date',
          'work_order_date',
        ]),
        dispatch_no: findIndex(['dispatchno', 'dispatch_no', 'dispatch no']),
        dispatch_date: findIndex([
          'dispatchdate',
          'dispatch_date',
          'dispatch date',
        ]),
        already_sent: findIndex([
          'alredysend',
          'already_send',
          'already send',
          'alredy_send',
        ]),
        unitag: findIndex(['unitag', 'unit ag']),
        excel: findIndex(['excel']),
        sr: findIndex(['sr.no', 'sr.no.', 'sr_no', 'sr no', 'sr', 'sno']),
        systemdate: findIndex([
          'systemdate',
          'system date',
          'system_date',
          'date',
        ]),
      };

      const dataRows = rows.slice(headerRowIndex + 1);

      for (const row of dataRows) {
        if (!row || row.length === 0) continue;

        const get = (i: number): unknown => (i >= 0 ? row[i] : undefined);

        const agreement: AgreementImport = {
          agrid: this.normalizeNumber(get(idxMap.agrid)),
          agreementno: this.normalizeString(get(idxMap.agreementno)),
          agreementyear: this.normalizeString(get(idxMap.agreementyear)),
          division_code: this.normalizeString(get(idxMap.division_code)),
          contractor_code: this.normalizeString(get(idxMap.contractor_code)),
          workcode: this.normalizeString(get(idxMap.workcode)),
          workorderno: this.normalizeString(get(idxMap.workorderno)),
          workorderdate: this.excelDateFix(get(idxMap.workorderdate)),
          dispatch_no: this.normalizeString(get(idxMap.dispatch_no)),
          dispatch_date: this.normalizeString(get(idxMap.dispatch_date)),
          already_sent: this.normalizeString(get(idxMap.already_sent)),
          unitag: this.normalizeString(get(idxMap.unitag)),
          systemdate: this.excelDateFix(get(idxMap.systemdate)) || new Date(),
          excel: this.normalizeString(get(idxMap.excel)),
          sr: this.normalizeString(get(idxMap.sr)),
        };

        if (Object.values(agreement).every((val) => val === null)) {
          continue;
        }

        agreements.push(agreement);
      }

      return agreements;
    }

    // Fallback for legacy format with fixed column positions
    let legacyHeaderIndex = -1;
    const legacyHeaders = [
      'agreement no',
      'agreement year',
      'contractor name',
      'work order no',
      'work order date',
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowStr = row
        .map((val) =>
          val === null || val === undefined
            ? ''
            : typeof val === 'string' ||
                typeof val === 'number' ||
                typeof val === 'boolean'
              ? String(val).toLowerCase()
              : (JSON.stringify(val)?.toLowerCase() ?? ''),
        )
        .join(' ');
      if (legacyHeaders.some((header) => rowStr.includes(header))) {
        legacyHeaderIndex = i;
        break;
      }
    }

    if (legacyHeaderIndex === -1) {
      legacyHeaderIndex = 0;
    }

    const dataRows = rows.slice(legacyHeaderIndex + 1);

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;

      const agreement: AgreementImport = {
        agrid: this.normalizeNumber(row[0]),
        agreementno: this.normalizeString(row[1]),
        agreementyear: this.normalizeString(row[3]),
        division_code: this.normalizeString(row[4]),
        contractor_code: this.normalizeString(row[5]),
        workcode: this.normalizeString(row[6]),
        workorderno: this.normalizeString(row[7]),
        workorderdate: this.excelDateFix(row[8]),
        dispatch_no: null,
        dispatch_date: null,
        already_sent: null,
        unitag: this.normalizeString(row[16]),
        systemdate: this.excelDateFix(row[13]) || new Date(),
        excel: this.normalizeString(row[15]),
        sr: this.normalizeString(row[14]),
      };

      agreements.push(agreement);
    }

    return agreements;
  }

  private excelDateFix(date: unknown): Date | null {
    if (
      !(
        date instanceof Date ||
        typeof date === 'string' ||
        typeof date === 'number'
      )
    ) {
      return null;
    }

    if (typeof date === 'string') {
      const normalizedDate = date.trim();

      const ddMmYyyyMatch = normalizedDate.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M))?$/i,
      );

      if (ddMmYyyyMatch) {
        const [, day, month, year, hourPart, minutePart, secondPart, period] =
          ddMmYyyyMatch;
        let hour = Number(hourPart ?? '0');
        const minute = Number(minutePart ?? '0');
        const second = Number(secondPart ?? '0');
        const monthIndex = Number(month) - 1;

        if (period) {
          const upperPeriod = period.toUpperCase();

          if (upperPeriod === 'PM' && hour < 12) {
            hour += 12;
          }

          if (upperPeriod === 'AM' && hour === 12) {
            hour = 0;
          }
        }

        const parsedPartsDate = new Date(
          Number(year),
          monthIndex,
          Number(day),
          hour,
          minute,
          second,
        );

        return isNaN(parsedPartsDate.getTime()) ? null : parsedPartsDate;
      }

      const parsedStringDate = new Date(normalizedDate);

      return isNaN(parsedStringDate.getTime()) ? null : parsedStringDate;
    }

    if (typeof date === 'number') {
      // Excel serial date number (1900 date system).
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsedSerialDate = new Date(
        excelEpoch.getTime() + date * 24 * 60 * 60 * 1000,
      );

      return isNaN(parsedSerialDate.getTime()) ? null : parsedSerialDate;
    }

    const parsed = new Date(date);

    // Ignore Excel default invalid dates
    if (parsed.getFullYear() === 1899 || parsed.getFullYear() === 1900) {
      return null;
    }

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeHeader(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return '';
  }

  private normalizeString(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean' &&
      !(value instanceof Date)
    ) {
      return null;
    }

    const str = String(value).trim();

    return str.length ? str : null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      return null;
    }

    const num = Number(value);

    return isNaN(num) ? null : num;
  }

  private extractWorkCodes(value: unknown): string[] {
    const normalizedValue = this.normalizeString(value);

    if (!normalizedValue) return [];

    return normalizedValue
      .split(',')
      .map((v) => v.replace(/^\s*\d+\.\s*/, '').trim())
      .filter(Boolean);
  }
}
