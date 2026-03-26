import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TICKET_STATUS } from '../entity/constants';

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: 'New ticket status',
    enum: TICKET_STATUS,
    example: 'IN_PROGRESS',
  })
  @IsEnum(TICKET_STATUS)
  @IsNotEmpty()
  status: TICKET_STATUS;

  @ApiProperty({
    description: 'Optional note/comment for status change',
    example: 'Started working on this ticket',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
