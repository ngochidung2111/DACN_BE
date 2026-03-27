import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignDepartmentTicketCategoriesDto {
  @ApiProperty({
    description: 'Category IDs that the department can manage',
    example: [
      '550e8400-e29b-41d4-a716-446655440100',
      '550e8400-e29b-41d4-a716-446655440101',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  category_ids: string[];
}
