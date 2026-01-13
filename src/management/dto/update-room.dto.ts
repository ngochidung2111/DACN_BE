import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class UpdateRoomDto {
  @ApiProperty({ description: 'Room name', example: 'Meeting Room A', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Room capacity', example: 20, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiProperty({
    description: 'Room equipment',
    example: ['Projector', 'Whiteboard', 'AC'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  equipment?: string[];
}
