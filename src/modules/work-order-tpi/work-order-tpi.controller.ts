import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AssignTpiEmployeeDto } from './dto/assign-tpi-employee.dto';
import { AssignTpiDto } from './dto/assign-tpi.dto';
import { CreateWorkOrderTpiDto } from './dto/create-work-order-tpi.dto';
import { WorkOrderTpiResponseDto } from './dto/work-order-tpi-response.dto';
import { WorkOrderTpiService } from './work-order-tpi.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
    role: UserRole;
  };
};

@ApiTags('Work Order TPI')
@ApiBearerAuth('access-token')
@Controller('work-order-tpi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrderTpiController {
  constructor(private readonly workOrderTpiService: WorkOrderTpiService) {}

  @Post()
  @Roles(UserRole.HO)
  @ApiOperation({
    summary: 'Create a Work Order TPI',
    description: 'Creates a new TPI work order and auto-generates its 8 static components (HO only)',
  })
  create(@Body() createDto: CreateWorkOrderTpiDto) {
    return this.workOrderTpiService.create(createDto);
  }

  @Get()
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
  )
  @ApiOperation({
    summary: 'Get list of Work Order TPIs',
    description: 'Returns filtered list of TPI work orders according to user role and assignments',
  })
  @ApiQuery({ name: 'district_id', required: false, type: String })
  @ApiQuery({ name: 'agreement_id', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('district_id') districtId?: string,
    @Query('agreement_id') agreementId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.workOrderTpiService.findAll(
      req.user.role,
      req.user.userId,
      districtId,
      agreementId,
      page,
      limit,
    );
  }

  @Get('agreements')
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
  )
  @ApiOperation({
    summary: 'Get agreements containing assigned TPI work orders',
    description: 'Returns agreements relevant to the logged-in TPI officer or user',
  })
  getAgreements(@Request() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.TPI) {
      return this.workOrderTpiService.getTpiAgreements(req.user.userId);
    }
    return this.workOrderTpiService.findAll(
      req.user.role,
      req.user.userId,
      undefined,
      undefined,
      1,
      100,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
  )
  @ApiOperation({
    summary: 'Get single Work Order TPI details',
    description: 'Returns detailed information including the 8 components and TPI assignment',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.workOrderTpiService.findOne(
      id,
      req.user.role,
      req.user.userId,
    );
  }

  @Post(':id/assign-tpi')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Assign TPI officer to Work Order TPI',
    description: 'Assigns a district TPI officer to a TPI work order (DO with Executive Engineer permission only)',
  })
  @ApiParam({ name: 'id', type: String })
  assignTpi(
    @Param('id') id: string,
    @Body() dto: AssignTpiDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workOrderTpiService.assignTpi(id, dto, req.user.userId);
  }

  @Post(':id/assign-employee')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Assign employees to Work Order TPI',
    description: 'Contractor assigns employees to work on a TPI work order',
  })
  @ApiParam({ name: 'id', type: String })
  assignEmployee(
    @Param('id') id: string,
    @Body() dto: AssignTpiEmployeeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workOrderTpiService.assignEmployees(
      id,
      dto,
      req.user.userId,
    );
  }

  @Get(':id/employees')
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
  )
  @ApiOperation({
    summary: 'Get assigned employees for Work Order TPI',
    description: 'Returns list of employees assigned to this TPI work order',
  })
  @ApiParam({ name: 'id', type: String })
  getAssignedEmployees(@Param('id') id: string) {
    return this.workOrderTpiService.getAssignedEmployees(id);
  }

  @Post(':id/components/:componentId/photos')
  @Roles(UserRole.EM, UserRole.TPI)
  @ApiOperation({
    summary: 'Upload photo for TPI work order component',
    description: 'Employee or TPI officer uploads photo for a component. TPI uploads directly to DO.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'componentId', type: String })
  uploadPhoto(
    @Param('id') id: string,
    @Param('componentId') componentId: string,
    @Body()
    body: {
      image_url: string;
      latitude: number;
      longitude: number;
      timestamp?: string;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workOrderTpiService.uploadPhoto(
      id,
      componentId,
      req.user.userId,
      req.user.role,
      body.image_url,
      body.latitude,
      body.longitude,
      body.timestamp ? new Date(body.timestamp) : new Date(),
    );
  }

  @Get(':id/components/:componentId/photos')
  @Roles(
    UserRole.HO,
    UserRole.DO,
    UserRole.CO,
    UserRole.EM,
    UserRole.TPI,
  )
  @ApiOperation({
    summary: 'Get photos for TPI work order component',
    description: 'Returns all photos uploaded for a component in a TPI work order',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'componentId', type: String })
  getComponentPhotos(
    @Param('id') id: string,
    @Param('componentId') componentId: string,
  ) {
    return this.workOrderTpiService.getComponentPhotos(id, componentId);
  }

  @Patch('photos/:photoId/select')
  @Roles(UserRole.CO)
  @ApiOperation({
    summary: 'Select employee photo for DO forwarding',
    description: 'Contractor selects an employee photo to forward to DO for review',
  })
  @ApiParam({ name: 'photoId', type: String })
  selectPhoto(
    @Param('photoId') photoId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workOrderTpiService.selectPhotoByContractor(
      photoId,
      req.user.userId,
    );
  }

  @Get(':id/components/:componentId/review-photos')
  @Roles(UserRole.DO, UserRole.HO)
  @ApiOperation({
    summary: 'Get review photos for dual-view DO approval',
    description: 'Returns both the Contractor-selected photo and the TPI reference photo for side-by-side comparison',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'componentId', type: String })
  getReviewPhotos(
    @Param('id') id: string,
    @Param('componentId') componentId: string,
  ) {
    return this.workOrderTpiService.getReviewPhotosForComponent(
      id,
      componentId,
    );
  }

  @Patch(':id/components/:componentId/approve')
  @Roles(UserRole.DO)
  @ApiOperation({
    summary: 'Approve component on TPI work order',
    description: 'DO approves the contractor-selected photo after dual inspection photo review',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'componentId', type: String })
  approveComponent(
    @Param('id') id: string,
    @Param('componentId') componentId: string,
    @Body('remarks') remarks: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workOrderTpiService.approveComponent(
      id,
      componentId,
      req.user.userId,
      remarks,
    );
  }
}
