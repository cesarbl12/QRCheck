import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma/client';

@Controller('employees')
@Roles(Role.ADMIN)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  findAll(@Query('active') active?: string, @Query('search') search?: string) {
    const activeOnly = active === undefined ? undefined : active === 'true';
    return this.employeesService.findAll(activeOnly, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.employeesService.deactivate(id);
  }

  @Get(':id/qr')
  async getQr(
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const resolvedFormat = format === 'svg' ? 'svg' : 'png';
    const { contentType, data } = await this.employeesService.getQrImage(
      id,
      resolvedFormat,
    );
    res.setHeader('Content-Type', contentType);
    res.send(data);
  }

  @Post(':id/qr/regenerate')
  regenerateQr(@Param('id') id: string) {
    return this.employeesService.regenerateQr(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.employeesService.savePhoto(id, file);
  }

  @Get(':id/photo')
  async getPhoto(@Param('id') id: string, @Res() res: Response) {
    const { contentType, data } = await this.employeesService.getPhoto(id);
    res.setHeader('Content-Type', contentType);
    res.send(data);
  }
}
