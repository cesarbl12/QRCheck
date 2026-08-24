import { IsString } from 'class-validator';

export class ScanDto {
  @IsString()
  token: string;
}
