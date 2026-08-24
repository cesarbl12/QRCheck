import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';

const CATORCENA_ANCHOR_KEY = 'catorcenaAnchor';
const PERIOD_LENGTH_DAYS = 14;

@Injectable()
export class SettingsService {
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.timezone = this.config.get<string>('APP_TIMEZONE') ?? 'America/Tijuana';
  }

  async getCatorcenaInfo() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: CATORCENA_ANCHOR_KEY },
    });
    const anchorDate = setting?.value ?? DateTime.now().setZone(this.timezone).toISODate()!;
    return this.computePeriod(anchorDate);
  }

  async updateCatorcenaAnchor(anchorDate: string) {
    await this.prisma.appSetting.upsert({
      where: { key: CATORCENA_ANCHOR_KEY },
      update: { value: anchorDate },
      create: { key: CATORCENA_ANCHOR_KEY, value: anchorDate },
    });
    return this.computePeriod(anchorDate);
  }

  private computePeriod(anchorDateStr: string) {
    const anchor = DateTime.fromISO(anchorDateStr, { zone: this.timezone }).startOf('day');
    const now = DateTime.now().setZone(this.timezone).startOf('day');
    const diffDays = Math.floor(now.diff(anchor, 'days').days);
    const periodIndex = diffDays < 0 ? 0 : Math.floor(diffDays / PERIOD_LENGTH_DAYS);
    const periodStart = anchor.plus({ days: periodIndex * PERIOD_LENGTH_DAYS });
    const periodEnd = periodStart.plus({ days: PERIOD_LENGTH_DAYS - 1 });

    return {
      anchorDate: anchor.toISODate(),
      periodNumber: periodIndex + 1,
      periodStart: periodStart.toISODate(),
      periodEnd: periodEnd.toISODate(),
    };
  }
}
