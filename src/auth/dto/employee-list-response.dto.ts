import { ApiProperty } from '@nestjs/swagger';
import { EmployeeDto } from './employee.dto';

class EmployeeListPagingDto {
  @ApiProperty({ type: [EmployeeDto] })
  items: EmployeeDto[];

  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class EmployeeListResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Employees retrieved successfully' })
  message: string;

  @ApiProperty({ type: EmployeeListPagingDto })
  data: EmployeeListPagingDto;
}
