import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AvatarUploadDto {
  @ApiProperty({ description: 'Original file name including extension', example: 'avatar.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'MIME type of the file', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  fileType: string;
}

export class AvatarUploadResponseDto {
  @ApiProperty({ description: 'Presigned URL for uploading avatar to S3', example: 'https://bucket.s3.ap-southeast-1.amazonaws.com/...' })
  uploadUrl: string;

  @ApiProperty({ description: 'Public URL of the uploaded avatar', example: 'https://bucket.s3.ap-southeast-1.amazonaws.com/employees/123/avatar/avatar.jpg' })
  fileUrl: string;

  @ApiProperty({ description: 'S3 object key of avatar', example: 'employees/123/avatar/avatar.jpg' })
  key: string;

  @ApiProperty({ description: 'Employee ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  employeeId: string;
}

export class ConfirmAvatarUploadDto {
  @ApiProperty({ description: 'S3 object key of uploaded avatar', example: 'employees/123/avatar/1234567890-avatar.jpg' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Public URL of uploaded avatar', example: 'https://bucket.s3.ap-southeast-1.amazonaws.com/employees/123/avatar/avatar.jpg' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}
