import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const PHOTOS_DIR = join(process.cwd(), 'uploads', 'photos');
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function timeStringToDate(time: string | undefined): Date | null | undefined {
  if (time === undefined) return undefined;
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

function dateToTimeString(date: Date | null): string | null {
  if (!date) return null;
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function generateQrToken(): string {
  return randomBytes(24).toString('base64url');
}

function serialize<
  T extends {
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    photoPath: string | null;
  },
>(employee: T) {
  const { photoPath, ...rest } = employee;
  return {
    ...rest,
    scheduledStart: dateToTimeString(employee.scheduledStart),
    scheduledEnd: dateToTimeString(employee.scheduledEnd),
    hasPhoto: !!photoPath,
  };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const employee = await this.prisma.employee.create({
      data: {
        fullName: dto.fullName,
        position: dto.position,
        contact: dto.contact,
        rfc: dto.rfc,
        scheduledStart: timeStringToDate(dto.scheduledStart) ?? null,
        scheduledEnd: timeStringToDate(dto.scheduledEnd) ?? null,
        qrToken: generateQrToken(),
      },
    });
    return serialize(employee);
  }

  async findAll(activeOnly?: boolean, search?: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        ...(activeOnly !== undefined ? { active: activeOnly } : {}),
        ...(search
          ? { fullName: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { fullName: 'asc' },
    });
    return employees.map(serialize);
  }

  async findOne(id: string) {
    return serialize(await this.getOrThrow(id));
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.getOrThrow(id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.contact !== undefined ? { contact: dto.contact } : {}),
        ...(dto.rfc !== undefined ? { rfc: dto.rfc } : {}),
        ...(dto.scheduledStart !== undefined
          ? { scheduledStart: timeStringToDate(dto.scheduledStart) }
          : {}),
        ...(dto.scheduledEnd !== undefined
          ? { scheduledEnd: timeStringToDate(dto.scheduledEnd) }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return serialize(employee);
  }

  async deactivate(id: string) {
    await this.getOrThrow(id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { active: false },
    });
    return serialize(employee);
  }

  async getQrImage(id: string, format: 'png' | 'svg') {
    const employee = await this.getOrThrow(id);
    if (format === 'svg') {
      const svg = await QRCode.toString(employee.qrToken, {
        type: 'svg',
        margin: 1,
        width: 320,
      });
      return { contentType: 'image/svg+xml', data: svg as string | Buffer };
    }
    const buffer = await QRCode.toBuffer(employee.qrToken, {
      type: 'png',
      margin: 1,
      width: 320,
    });
    return { contentType: 'image/png', data: buffer as string | Buffer };
  }

  async regenerateQr(id: string) {
    await this.getOrThrow(id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { qrToken: generateQrToken() },
    });
    return serialize(employee);
  }

  async savePhoto(id: string, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');

    const ext = ALLOWED_PHOTO_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Formato de imagen no soportado (usa JPG, PNG o WEBP)');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('La imagen no debe superar 5MB');
    }

    const employee = await this.getOrThrow(id);
    mkdirSync(PHOTOS_DIR, { recursive: true });

    if (employee.photoPath) {
      const oldPath = join(PHOTOS_DIR, employee.photoPath);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          // ignore cleanup failures
        }
      }
    }

    const filename = `${id}${ext}`;
    writeFileSync(join(PHOTOS_DIR, filename), file.buffer);

    const updated = await this.prisma.employee.update({
      where: { id },
      data: { photoPath: filename },
    });
    return serialize(updated);
  }

  async getPhoto(id: string) {
    const employee = await this.getOrThrow(id);
    if (!employee.photoPath) {
      throw new NotFoundException('El empleado no tiene foto registrada');
    }

    const filePath = join(PHOTOS_DIR, employee.photoPath);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Foto no encontrada');
    }

    const data = readFileSync(filePath);
    const ext = extname(employee.photoPath);
    const contentType =
      Object.entries(ALLOWED_PHOTO_MIME).find(([, value]) => value === ext)?.[0] ??
      'application/octet-stream';

    return { contentType, data };
  }

  private async getOrThrow(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    return employee;
  }
}
