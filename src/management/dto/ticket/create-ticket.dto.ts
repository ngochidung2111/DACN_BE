import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTicketDto {


  @ApiProperty({
    description: 'Ticket category ID',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  @IsUUID()
  @IsNotEmpty()
  category_id: string;

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
