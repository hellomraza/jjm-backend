import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { CreatePaymentDetailDto } from './dto/create-payment-detail.dto';
import { UpdatePaymentDetailDto } from './dto/update-payment-detail.dto';
import { VerificationActionDto } from './dto/verification-action.dto';
import { PaymentDetailAudit } from './entities/payment-detail-audit.entity';
import {
  PaymentDetail,
  PaymentDetailStatus,
} from './entities/payment-detail.entity';
import { VoucherFile } from './entities/voucher-file.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentDetail)
    private readonly paymentDetailRepository: Repository<PaymentDetail>,
    @InjectRepository(PaymentDetailAudit)
    private readonly auditRepository: Repository<PaymentDetailAudit>,
    @InjectRepository(VoucherFile)
    private readonly voucherFileRepository: Repository<VoucherFile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async getAuthenticatedUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['district'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async createAudit(
    paymentDetailId: string,
    action: string,
    description: string,
    user: User,
    previousStatus: string | null = null,
    newStatus: string | null = null,
  ): Promise<PaymentDetailAudit> {
    const audit = this.auditRepository.create({
      payment_detail_id: paymentDetailId,
      action,
      description,
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_email: user.email,
      performed_by_role: user.role,
      previous_status: previousStatus,
      new_status: newStatus,
    });
    return await this.auditRepository.save(audit);
  }

  async create(
    dto: CreatePaymentDetailDto,
    userId: string,
  ): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);

    if (user.role !== UserRole.DO && user.role !== UserRole.DO_STAFF) {
      throw new ForbiddenException(
        'Only District Officers and DO Staff can create payment details',
      );
    }

    if (!user.district_id) {
      throw new BadRequestException(
        'User is not assigned to any district. Cannot create payment record.',
      );
    }

    let voucherFileId: string | null = dto.voucher_file_id || null;
    let voucherFileUrl: string | null = dto.voucher_file_url || null;

    if (dto.voucher_file_url && !voucherFileId) {
      const voucherFile = this.voucherFileRepository.create({
        file_url: dto.voucher_file_url,
        file_name: dto.file_name || null,
        file_size: dto.file_size || null,
        mime_type: 'application/pdf',
        uploaded_by_id: user.id,
        uploaded_by_role: user.role,
      });
      const savedFile = await this.voucherFileRepository.save(voucherFile);
      voucherFileId = savedFile.id;
      voucherFileUrl = savedFile.file_url;
    }

    const paymentDetail = this.paymentDetailRepository.create({
      contractor_name: dto.contractor_name,
      contractor_code: dto.contractor_code,
      work_order_code: dto.work_order_code,
      bank_name: dto.bank_name,
      bank_account_number: dto.bank_account_number,
      ifsc_code: dto.ifsc_code,
      branch: dto.branch,
      amount: dto.amount,
      voucher_number: dto.voucher_number,
      voucher_file_url: voucherFileUrl,
      voucher_file_id: voucherFileId,
      cheque_number: dto.cheque_number || null,
      district_id: user.district_id,
      status: PaymentDetailStatus.DETAILS_FILLED,
      created_by_id: user.id,
      created_by_role: user.role,
      is_deleted: false,
    });

    const saved = await this.paymentDetailRepository.save(paymentDetail);

    // Initial audit entry
    await this.createAudit(
      saved.id,
      'CREATED',
      `Payment details created and filled by ${user.name} (${user.role})`,
      user,
      null,
      PaymentDetailStatus.DETAILS_FILLED,
    );

    return saved;
  }

  async update(
    id: string,
    dto: UpdatePaymentDetailDto,
    userId: string,
  ): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);
    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (payment.status !== PaymentDetailStatus.DETAILS_FILLED) {
      throw new BadRequestException(
        'Payment details can only be edited while in DETAILS_FILLED status',
      );
    }

    if (user.district_id && user.district_id !== payment.district_id) {
      throw new ForbiddenException('You cannot edit payments for another district');
    }

    // If new voucher file URL provided, record it in voucher_files history
    if (dto.voucher_file_url && dto.voucher_file_url !== payment.voucher_file_url) {
      const voucherFile = this.voucherFileRepository.create({
        file_url: dto.voucher_file_url,
        file_name: dto.file_name || null,
        file_size: dto.file_size || null,
        mime_type: 'application/pdf',
        uploaded_by_id: user.id,
        uploaded_by_role: user.role,
      });
      const savedFile = await this.voucherFileRepository.save(voucherFile);
      dto.voucher_file_id = savedFile.id;
    }

    // Build changes summary for audit log
    const changedFields: string[] = [];
    const keys = Object.keys(dto) as Array<keyof UpdatePaymentDetailDto>;
    for (const key of keys) {
      if (dto[key] !== undefined && (payment as any)[key] !== dto[key]) {
        changedFields.push(
          `${key}: "${(payment as any)[key]}" -> "${dto[key]}"`,
        );
        (payment as any)[key] = dto[key];
      }
    }

    const updated = await this.paymentDetailRepository.save(payment);

    if (changedFields.length > 0) {
      await this.createAudit(
        updated.id,
        'EDITED',
        `Details updated by ${user.name} (${user.role}): ${changedFields.join(', ')}`,
        user,
        payment.status,
        payment.status,
      );
    }

    return updated;
  }

  async findAll(
    userId: string,
    query: { page?: number; limit?: number; search?: string },
  ) {
    const user = await this.getAuthenticatedUser(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const qb = this.paymentDetailRepository
      .createQueryBuilder('p')
      .where('p.is_deleted = :isDeleted', { isDeleted: false });

    // Role-based filtering
    const role = user.role;
    if (role === UserRole.DO_STAFF) {
      // DO Staff sees payments in their district
      qb.andWhere('p.district_id = :districtId', {
        districtId: user.district_id,
      });
    } else if (role === UserRole.DO) {
      // DO sees payments in their district that have been created
      qb.andWhere('p.district_id = :districtId', {
        districtId: user.district_id,
      });
    } else if (role === UserRole.EE) {
      // EE sees payments in their district only once sent to EE or further
      qb.andWhere('p.district_id = :districtId', {
        districtId: user.district_id,
      });
      qb.andWhere('p.status IN (:...eeStatuses)', {
        eeStatuses: [
          PaymentDetailStatus.SEND_TO_EE,
          PaymentDetailStatus.EE_CHECKED,
          PaymentDetailStatus.SEND_FOR_RELEASE_PAYMENT,
        ],
      });
    } else if (role === UserRole.HO) {
      // HO can view all
    } else {
      throw new ForbiddenException('Access denied to payment records');
    }

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        '(p.contractor_name ILIKE :s OR p.contractor_code ILIKE :s OR p.work_order_code ILIKE :s OR p.voucher_number ILIKE :s OR p.bank_name ILIKE :s OR p.bank_account_number ILIKE :s)',
        { s },
      );
    }

    qb.orderBy('p.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string, userId: string): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);
    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
      relations: ['audits', 'voucherFile'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (user.role !== UserRole.HO) {
      if (user.district_id !== payment.district_id) {
        throw new ForbiddenException(
          'You cannot view payment details for another district',
        );
      }
    }

    if (payment.audits) {
      payment.audits.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    return payment;
  }

  async sendToDO(
    id: string,
    dto: VerificationActionDto,
    userId: string,
  ): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);
    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (payment.status !== PaymentDetailStatus.DETAILS_FILLED) {
      throw new BadRequestException(
        `Payment record must be in DETAILS_FILLED status to send to DO (current status: ${payment.status})`,
      );
    }

    const prevStatus = payment.status;
    payment.status = PaymentDetailStatus.SEND_TO_DO;
    const saved = await this.paymentDetailRepository.save(payment);

    await this.createAudit(
      saved.id,
      'SEND_TO_DO',
      `Details verified and sent to District Officer by ${user.name} (${user.role}) with 2-point voucher verification confirmed.`,
      user,
      prevStatus,
      PaymentDetailStatus.SEND_TO_DO,
    );

    return saved;
  }

  async doCheck(
    id: string,
    dto: VerificationActionDto,
    userId: string,
  ): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);

    if (user.role !== UserRole.DO) {
      throw new ForbiddenException(
        'Only District Officers can verify payment details at this stage',
      );
    }

    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (payment.status !== PaymentDetailStatus.SEND_TO_DO) {
      throw new BadRequestException(
        `Payment record must be in SEND_TO_DO status for DO check (current status: ${payment.status})`,
      );
    }

    const prevStatus = payment.status;
    payment.status = PaymentDetailStatus.DO_CHECKED;
    const saved = await this.paymentDetailRepository.save(payment);

    await this.createAudit(
      saved.id,
      'DO_CHECKED',
      `Details checked and verified by District Officer ${user.name} with 2-point voucher confirmation.`,
      user,
      prevStatus,
      PaymentDetailStatus.DO_CHECKED,
    );

    return saved;
  }

  async sendToEE(id: string, userId: string): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);

    if (user.role !== UserRole.DO) {
      throw new ForbiddenException(
        'Only District Officers can forward payment details to Executive Engineer',
      );
    }

    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (payment.status !== PaymentDetailStatus.DO_CHECKED) {
      throw new BadRequestException(
        `Payment record must be in DO_CHECKED status to forward to EE (current status: ${payment.status})`,
      );
    }

    const prevStatus = payment.status;
    payment.status = PaymentDetailStatus.SEND_TO_EE;
    const saved = await this.paymentDetailRepository.save(payment);

    await this.createAudit(
      saved.id,
      'SEND_TO_EE',
      `Forwarded to Executive Engineer by District Officer ${user.name}`,
      user,
      prevStatus,
      PaymentDetailStatus.SEND_TO_EE,
    );

    return saved;
  }

  async eeCheck(
    id: string,
    dto: VerificationActionDto,
    userId: string,
  ): Promise<PaymentDetail> {
    const user = await this.getAuthenticatedUser(userId);

    if (user.role !== UserRole.EE) {
      throw new ForbiddenException(
        'Only Executive Engineers can verify payment details at this stage',
      );
    }

    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (payment.status !== PaymentDetailStatus.SEND_TO_EE) {
      throw new BadRequestException(
        `Payment record must be in SEND_TO_EE status for EE check (current status: ${payment.status})`,
      );
    }

    const prevStatus = payment.status;
    payment.status = PaymentDetailStatus.EE_CHECKED;
    const saved = await this.paymentDetailRepository.save(payment);

    await this.createAudit(
      saved.id,
      'EE_CHECKED',
      `Details checked and verified by Executive Engineer ${user.name} with 2-point voucher confirmation.`,
      user,
      prevStatus,
      PaymentDetailStatus.EE_CHECKED,
    );

    return saved;
  }

  async softDelete(id: string, userId: string): Promise<{ success: boolean }> {
    const user = await this.getAuthenticatedUser(userId);

    const isDO = user.role === UserRole.DO;
    const isEE = user.role === UserRole.EE;
    const isHO = user.role === UserRole.HO;

    if (!isDO && !isEE && !isHO) {
      throw new ForbiddenException(
        'Only District Officers or Executive Engineers can delete payment records',
      );
    }

    const payment = await this.paymentDetailRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (!isHO && user.district_id !== payment.district_id) {
      throw new ForbiddenException('Cannot delete payment from another district');
    }

    payment.is_deleted = true;
    payment.deleted_by_id = user.id;
    payment.deleted_at = new Date();
    await this.paymentDetailRepository.save(payment);

    await this.createAudit(
      payment.id,
      'SOFT_DELETED',
      `Payment record soft-deleted by ${user.name} (${user.role})`,
      user,
      payment.status,
      null,
    );

    return { success: true };
  }
}
