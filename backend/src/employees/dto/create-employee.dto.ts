import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export class CreateEmployeeDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(2)
  position: string;

  @IsString()
  @MinLength(3)
  contact: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @IsString()
  @Matches(RFC_PATTERN, { message: 'RFC inválido' })
  rfc: string;

  @IsOptional()
  @ValidateIf((o) => !!o.scheduledStart)
  @Matches(TIME_PATTERN, { message: 'scheduledStart debe tener formato HH:mm' })
  scheduledStart?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.scheduledEnd)
  @Matches(TIME_PATTERN, { message: 'scheduledEnd debe tener formato HH:mm' })
  scheduledEnd?: string;
}
