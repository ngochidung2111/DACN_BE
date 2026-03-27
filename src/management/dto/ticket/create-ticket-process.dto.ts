import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTicketProcessDto {
  @ApiProperty({
    description: 'Process note or comment',
    example: 'Awaiting customer feedback',
  })
  @IsString()
  @IsNotEmpty()
  note: string;

  
}
