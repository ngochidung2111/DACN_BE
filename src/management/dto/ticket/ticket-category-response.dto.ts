import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class DepartmentMinimalForCategoryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'IT Department' })
  @Expose()
  name: string;
}

export class TicketCategoryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440100' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'IT Support' })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    example: 'Incidents and requests related to systems and devices',
  })
  @Expose()
  description: string | null;

  @ApiProperty({ example: true })
  @Expose()
  is_active: boolean;

  @ApiPropertyOptional({ type: [DepartmentMinimalForCategoryDto] })
  @Expose()
  @Type(() => DepartmentMinimalForCategoryDto)
  departments?: DepartmentMinimalForCategoryDto[];
}
