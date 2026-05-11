import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateHolidayDto {
  @ApiProperty({
    description: 'Holiday date (ISO 8601 format)',
    example: '2026-04-30T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Holiday name',
    example: 'Reunification Day',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Holiday description',
    example: 'National holiday of Vietnam',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Is holiday active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
