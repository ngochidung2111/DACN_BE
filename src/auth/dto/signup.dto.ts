import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ROLE } from '../../management/entity/constants';

export class SignupRequestDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    description: 'User roles',
    example: ['EMPLOYEE'],
    enum: ROLE,
    isArray: true,
  })
  @IsArray({ message: 'Roles must be an array' })
  @IsEnum(ROLE, { each: true, message: 'Each role must be a valid role value' })
  roles: ROLE[];
}

export class SignupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  roles: ROLE[];
}
