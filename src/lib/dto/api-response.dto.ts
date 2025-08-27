import { ApiProperty } from '@nestjs/swagger';

export abstract class ApiResponse<T = any> {
  @ApiProperty({ example: 200 })
  statusCode: number;
  @ApiProperty({ example: 'Success' })
  message: string;
  @ApiProperty()
  data: T;
}
