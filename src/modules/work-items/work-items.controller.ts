import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { WorkItemStatus } from './entities/work-item.entity';
import { WorkItemsService } from './work-items.service';

@Controller('work-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Post()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  create(@Body() createWorkItemDto: CreateWorkItemDto) {
    return this.workItemsService.create(createWorkItemDto);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.workItemsService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workItemsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorkItemDto: UpdateWorkItemDto,
  ) {
    return this.workItemsService.update(id, updateWorkItemDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.HO, UserRole.DO)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: WorkItemStatus,
  ) {
    return this.workItemsService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.HO)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workItemsService.remove(id);
  }
}
