import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room name', example: 'Meeting Room A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Room capacity', example: 20 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description: 'Room equipment',
    example: ['Projector', 'Whiteboard', 'AC'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  equipment?: string[];
}
