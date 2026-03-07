import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ComponentsService } from './components.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('components')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  create(@Body() createComponentDto: CreateComponentDto) {
    return this.componentsService.create(createComponentDto);
  }

  @Get()
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  findAll() {
    return this.componentsService.findAll();
  }

  @Get('work-item/:workItemId')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  findByWorkItem(@Param('workItemId') workItemId: string) {
    return this.componentsService.findByWorkItem(+workItemId);
  }

  @Get(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO, UserRole.EM)
  findOne(@Param('id') id: string) {
    return this.componentsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.HO, UserRole.DO, UserRole.CO)
  update(
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ) {
    return this.componentsService.update(+id, updateComponentDto);
  }

  @Delete(':id')
  @Roles(UserRole.HO)
  remove(@Param('id') id: string) {
    return this.componentsService.remove(+id);
  }

  @Post(':id/start')
  @Roles(UserRole.CO)
  startComponent(@Param('id') id: string) {
    return this.componentsService.startComponent(+id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.DO, UserRole.HO)
  approveComponent(@Param('id') id: string, @Request() req) {
    return this.componentsService.approveComponent(+id, req.user.userId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.DO, UserRole.HO)
  rejectComponent(@Param('id') id: string, @Request() req) {
    return this.componentsService.rejectComponent(+id, req.user.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.HO, UserRole.DO)
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.componentsService.updateStatus(+id, updateStatusDto.status);
  }
}
