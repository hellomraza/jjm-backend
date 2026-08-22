import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreatePaymentDetailDto } from './dto/create-payment-detail.dto';
import { UpdatePaymentDetailDto } from './dto/update-payment-detail.dto';
import { VerificationActionDto } from './dto/verification-action.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: UserRole;
  };
};

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.DO, UserRole.DO_STAFF)
  @ApiOperation({ summary: 'Create a new payment detail record' })
  async create(
    @Body() createDto: CreatePaymentDetailDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.create(createDto, req.user.userId);
  }

  @Patch(':id')
  @Roles(UserRole.DO, UserRole.DO_STAFF)
  @ApiOperation({ summary: 'Update payment detail record (Draft stage only)' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentDetailDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.update(id, updateDto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.DO_STAFF, UserRole.EE)
  @ApiOperation({ summary: 'Get paginated payment details based on role' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    return await this.paymentsService.findAll(req!.user.userId, {
      page,
      limit,
      search,
    });
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.DO_STAFF, UserRole.EE)
  @ApiOperation({ summary: 'Get single payment detail with audit trail' })
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.findOne(id, req.user.userId);
  }

  @Post(':id/send-to-do')
  @Roles(UserRole.DO, UserRole.DO_STAFF)
  @ApiOperation({ summary: 'Send payment details to District Officer' })
  async sendToDO(
    @Param('id') id: string,
    @Body() verificationDto: VerificationActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.sendToDO(
      id,
      verificationDto,
      req.user.userId,
    );
  }

  @Post(':id/do-check')
  @Roles(UserRole.DO)
  @ApiOperation({ summary: 'DO checks and verifies payment details' })
  async doCheck(
    @Param('id') id: string,
    @Body() verificationDto: VerificationActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.doCheck(
      id,
      verificationDto,
      req.user.userId,
    );
  }

  @Post(':id/send-to-ee')
  @Roles(UserRole.DO)
  @ApiOperation({ summary: 'DO forwards payment details to Executive Engineer' })
  async sendToEE(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.sendToEE(id, req.user.userId);
  }

  @Post(':id/ee-check')
  @Roles(UserRole.EE)
  @ApiOperation({ summary: 'EE checks and verifies payment details' })
  async eeCheck(
    @Param('id') id: string,
    @Body() verificationDto: VerificationActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.eeCheck(
      id,
      verificationDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.DO, UserRole.EE, UserRole.HO)
  @ApiOperation({ summary: 'Soft delete payment detail record' })
  async softDelete(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentsService.softDelete(id, req.user.userId);
  }
}
