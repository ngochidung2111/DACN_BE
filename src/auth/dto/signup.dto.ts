import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ROLE } from '../../management/entity/constants';


export class SignupRequestDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  lastName: string;

  @ApiProperty({
    description: 'User middle name',
    example: 'Michael',
  })
  @IsString({ message: 'Middle name must be a string' })
  @IsNotEmpty({ message: 'Middle name is required' })
  @MinLength(2, { message: 'Middle name must be at least 2 characters long' })
  middleName: string;

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
    description: 'User department',
    example: 'Engineering',
  })
  @IsString({ message: 'Department must be a string' })
  @IsOptional()
  department: string;

  @ApiProperty({
    description: 'User roles',
    enum: ROLE,
  })
  @IsEnum(ROLE, { each: true, message: 'Each role must be a valid role value' })
  roles: ROLE;
}

export class SignupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  middleName: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  roles: ROLE;
}
