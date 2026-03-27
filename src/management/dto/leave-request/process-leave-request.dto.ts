import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LEAVE_REQUEST_STATUS } from '../../entity/constants';

export class ProcessLeaveRequestDto {
  @ApiProperty({
    description: 'Decision status for leave request',
    enum: [LEAVE_REQUEST_STATUS.APPROVED, LEAVE_REQUEST_STATUS.REJECTED],
    example: LEAVE_REQUEST_STATUS.APPROVED,
  })
  @IsEnum(LEAVE_REQUEST_STATUS)
  status: LEAVE_REQUEST_STATUS.APPROVED | LEAVE_REQUEST_STATUS.REJECTED;

  @ApiProperty({
    description: 'Optional decision note from manager',
    example: 'Approved due to valid medical documents',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
