import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateCatorcenaDto } from './dto/update-catorcena.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma/client';

@Controller('settings')
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('catorcena')
  getCatorcena() {
    return this.settingsService.getCatorcenaInfo();
  }

  @Put('catorcena')
  updateCatorcena(@Body() dto: UpdateCatorcenaDto) {
    return this.settingsService.updateCatorcenaAnchor(dto.anchorDate);
  }
}
