import { IsDateString } from 'class-validator';

export class UpdateCatorcenaDto {
  @IsDateString()
  anchorDate: string;
}
