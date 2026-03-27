import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAssetLocationDto {
  @ApiProperty({ description: 'New location for PUBLIC asset', example: 'Building C - Shared Storage' })
  @IsString()
  @IsNotEmpty()
  location: string;
}
