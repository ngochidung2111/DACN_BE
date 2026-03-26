import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({
    description: 'UUID of employee to assign the ticket to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  assignee_id: string;

  @ApiProperty({
    description: 'Reason or note for assignment',
    example: 'Assigned to IT team lead',
  })
  @IsNotEmpty()
  note: string;
}
