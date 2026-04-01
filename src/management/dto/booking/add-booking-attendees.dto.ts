import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class AddBookingAttendeesDto {
  @ApiProperty({
    description: 'Attendee employee IDs to add into booking',
    type: [String],
    example: [
      '6bfc3c51-1e0d-4f27-9a6c-7b32e9f482be',
      'cb0eaf90-20fb-4f30-81a6-484eb1c7ca7b',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  attendee_ids: string[];
}
