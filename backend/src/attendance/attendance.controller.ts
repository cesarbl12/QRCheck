import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanDto } from './dto/scan.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma/client';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.SCANNER)
  @Post('scan')
  scan(@Body() dto: ScanDto) {
    return this.attendanceService.scan(dto.token);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get('summary')
  summary(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.summary(query);
  }
}
