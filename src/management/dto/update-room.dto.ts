import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min, IsUrl, IsEnum } from 'class-validator';
import { ROOM_STATUS } from '../entity/constants';

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

  @ApiProperty({ description: 'Room location/address', example: 'Building A, Floor 3', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Room status', example: ROOM_STATUS.AVAILABLE, required: false, enum: ROOM_STATUS })
  @IsEnum(ROOM_STATUS)
  @IsOptional()
  status?: ROOM_STATUS;

}
