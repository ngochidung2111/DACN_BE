import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min, IsUrl } from 'class-validator';

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

  @ApiProperty({ description: 'Public URL of room image (after upload)', example: 'https://bucket.s3.ap-southeast-1.amazonaws.com/rooms/123/abc.jpg', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'S3 object key of room image', example: 'rooms/123/abc.jpg', required: false })
  @IsString()
  @IsOptional()
  imageKey?: string;
}
