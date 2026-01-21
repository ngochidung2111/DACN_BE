import { ROLE } from "src/management/entity/constants";
import { Department } from "../entity/department.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { GENDER } from "../entity/constant";


export class EmployeeDto {
    @ApiProperty({
        description: 'ID of the employee',
        example: '12345',
    })
    @Expose()
    id: string;
    
    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
    })
    @Expose()
    lastName: string;
  
    @ApiProperty({
        description: 'User first name',
        example: 'John',
    })
    @Expose()
    firstName: string;

    @ApiProperty({
        description: 'User middle name',
        example: 'Michael',
    })
    @Expose()
    middleName: string;

    @ApiProperty({
        description: 'User gender',
        example: 'Male',
    })
    @Expose()
    gender: GENDER;

    @ApiProperty({
        description: 'User date of birth',
        example: '1990-01-01',
    })
    @Expose()
    dateOfBirth: Date;

    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @Expose()
    email: string;

    @ApiProperty({
        description: 'Roles assigned to the user',
        example: ROLE.ADMIN,
    })
    @Expose()
    roles: ROLE;

    @ApiProperty({
        description: 'User phone number',
        example: '+1234567890',
        required: false,
    })
    @Expose()
    phone?: string;

    @ApiProperty({
        description: 'Basic salary of the employee',
        example: 50000,
        required: false,
    })
    @Expose()
    basicSalary?: number;

    @ApiProperty({
        description: 'Gross salary of the employee',
        example: 60000,
        required: false,
    })
    @Expose()
    grossSalary?: number;

    @ApiProperty({
        description: 'Contract sign date',
        example: '2024-01-01',
        required: false,
    })
    @Expose()
    signDate?: Date;

    @ApiProperty({
        description: 'Quit date',
        example: '2025-12-31',
        required: false,
    })
    @Expose()
    quitDate?: Date;

    @ApiProperty({
        description: 'ID card number',
        example: '123456789',
        required: false,
    })
    @Expose()
    idCard?: string;

    @ApiProperty({
        description: 'Employee address',
        example: '123 Main St, City, Country',
        required: false,
    })
    @Expose()
    address?: string;

    @ApiProperty({
        description: 'Department of the employee',
        example: 'Sales',
        required: false,
    })
    @Expose()
    department?: Department;
}

export class UpdateProfileDto {
    
    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
        required: false,
    })
    @Expose()
    @IsString()
    @IsOptional()
    lastName?: string;
  
    @ApiProperty({
        description: 'User first name',
        example: 'John',
        required: false,
    })
    @Expose()
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiProperty({
        description: 'User middle name',
        example: 'Michael',
        required: false,
    })
    @Expose()
    @IsString()
    @IsOptional()
    middleName?: string;

    @ApiProperty({
        description: 'User phone number',
        example: '+1234567890',
        required: false,
    })
    @Expose()
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({
        description: 'User gender',
        example: 'Male',
        required: false,
    })
    @Expose()
    @IsOptional()
    gender?: GENDER;

    @ApiProperty({
        description: 'User date of birth',
        example: '1990-01-01',
        required: false,
    })
    @Expose()
    @IsOptional()
    dateOfBirth?: Date;

    @ApiProperty({
        description: 'ID card number',
        example: '123456789',
        required: false,
    })
    @Expose()
    @IsString()
    @IsOptional()
    idCard?: string;

    @ApiProperty({
        description: 'Employee address',
        example: '123 Main St, City, Country',
        required: false,
    })
    @Expose()
    @IsString()
    @IsOptional()
    address?: string;

}

export class UpdateDepartmentDto {
    @ApiProperty({
        description: 'New department name',
        example: 'Sales',
    })
    @Expose()
    @IsString()
    departmentName: string;
}

export class AdminUpdateEmployeeDto {
    @ApiProperty({ description: 'User last name', example: 'Doe', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiProperty({ description: 'User first name', example: 'John', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiProperty({ description: 'User middle name', example: 'Michael', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    middleName?: string;

    @ApiProperty({ description: 'User gender', example: 'Male', required: false, enum: GENDER })
    @Expose()
    @IsEnum(GENDER)
    @IsOptional()
    gender?: GENDER;

    @ApiProperty({ description: 'User date of birth', example: '1990-01-01', required: false })
    @Expose()
    @Type(() => Date)
    @IsOptional()
    dateOfBirth?: Date;

    @ApiProperty({ description: 'User email address', example: 'john.doe@example.com', required: false })
    @Expose()
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ description: 'Roles assigned to the user', example: ROLE.ADMIN, required: false, enum: ROLE })
    @Expose()
    @IsEnum(ROLE)
    @IsOptional()
    roles?: ROLE;

    @ApiProperty({ description: 'User phone number', example: '+1234567890', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'Basic salary of the employee', example: 50000, required: false })
    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    basicSalary?: number;

    @ApiProperty({ description: 'Gross salary of the employee', example: 60000, required: false })
    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    grossSalary?: number;

    @ApiProperty({ description: 'Contract sign date', example: '2024-01-01', required: false })
    @Expose()
    @Type(() => Date)
    @IsOptional()
    signDate?: Date;

    @ApiProperty({ description: 'Quit date', example: '2025-12-31', required: false })
    @Expose()
    @Type(() => Date)
    @IsOptional()
    quitDate?: Date;

    @ApiProperty({ description: 'ID card number', example: '123456789', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    idCard?: string;

    @ApiProperty({ description: 'Employee address', example: '123 Main St, City, Country', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ description: 'Department name', example: 'Sales', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    departmentName?: string;
}