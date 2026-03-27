import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiProperty({
    description: 'Leave start date (ISO)',
    example: '2026-03-10T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date_from: string;

  @ApiProperty({
    description: 'Leave end date (ISO)',
    example: '2026-03-12T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date_to: string;

  @ApiProperty({
    description: 'Reason for leave request',
    example: 'Personal leave',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Additional description for leave request',
    example: 'Need to attend family matters',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
