import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsUUID } from 'class-validator';
import { TICKET_CATEGORY } from '../entity/constants';

export class CreateTicketDto {


  @ApiProperty({
    description: 'Ticket category',
    enum: TICKET_CATEGORY,
    example: 'IT',
  })
  @IsEnum(TICKET_CATEGORY)
  @IsNotEmpty()
  category: TICKET_CATEGORY;

  @ApiProperty({
    description: 'Ticket title',
    example: 'Cannot access system',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Ticket description',
    example: 'I am unable to access the accounting system since yesterday',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
