import { ROLE } from "src/management/entity/constants";
import { Department } from "../entity/department.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { GENDER } from "../entity/constant";

export class DegreeDto {
    @ApiProperty({ description: 'Degree ID', example: 'uuid-123' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'School name', example: 'MIT' })
    @Expose()
    school: string;

    @ApiProperty({ description: 'Degree name', example: 'Bachelor of Science' })
    @Expose()
    degree: string;

    @ApiProperty({ description: 'Field of study', example: 'Computer Science' })
    @Expose()
    fieldOfStudy: string;

    @ApiProperty({ description: 'Graduation year', example: 2022 })
    @Expose()
    graduationYear: number;

    @ApiProperty({ description: 'Additional notes', example: 'Graduated with honors', required: false })
    @Expose()
    description?: string;
}

export class DegreeInputDto {
    @ApiProperty({ description: 'School name', example: 'MIT', required: false })
    @IsString()
    @IsOptional()
    school?: string;

    @ApiProperty({ description: 'Degree name', example: 'Bachelor of Science', required: false })
    @IsString()
    @IsOptional()
    degree?: string;

    @ApiProperty({ description: 'Field of study', example: 'Computer Science', required: false })
    @IsString()
    @IsOptional()
    fieldOfStudy?: string;

    @ApiProperty({ description: 'Graduation year', example: 2022, required: false })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    graduationYear?: number;

    @ApiProperty({ description: 'Additional notes', example: 'Graduated with honors', required: false })
    @IsString()
    @IsOptional()
    description?: string;
}


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

    @ApiProperty({ description: 'Marital status', example: true, required: false })
    @Expose()
    marriedStatus?: boolean;

    @ApiProperty({ description: 'Number of children', example: 2, required: false })
    @Expose()
    numberOfChildren?: number;

    @ApiProperty({ description: 'Children information', example: 'Two kids, ages 5 and 8', required: false })
    @Expose()
    childrenDescription?: string;

    @ApiProperty({
        description: 'Department of the employee',
        example: 'Sales',
        required: false,
    })
    @Expose()
    department?: Department;

    @ApiProperty({ description: 'Employee degrees', required: false, type: () => [DegreeDto] })
    @Expose()
    @Type(() => DegreeDto)
    degrees?: DegreeDto[];
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

    @ApiProperty({ description: 'Marital status', example: true, required: false })
    @Expose()
    @IsBoolean()
    @IsOptional()
    marriedStatus?: boolean;

    @ApiProperty({ description: 'Number of children', example: 2, required: false })
    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    numberOfChildren?: number;

    @ApiProperty({ description: 'Children information', example: 'Two kids, ages 5 and 8', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    childrenDescription?: string;

    @ApiProperty({ description: 'Employee degrees', required: false, type: () => [DegreeInputDto] })
    @Expose()
    @Type(() => DegreeInputDto)
    @IsOptional()
    degrees?: DegreeInputDto[];

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

    @ApiProperty({ description: 'Marital status', example: true, required: false })
    @Expose()
    @IsBoolean()
    @IsOptional()
    marriedStatus?: boolean;

    @ApiProperty({ description: 'Number of children', example: 2, required: false })
    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    numberOfChildren?: number;

    @ApiProperty({ description: 'Children information', example: 'Two kids, ages 5 and 8', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    childrenDescription?: string;

    @ApiProperty({ description: 'Employee degrees', required: false, type: () => [DegreeInputDto] })
    @Expose()
    @Type(() => DegreeInputDto)
    @IsOptional()
    degrees?: DegreeInputDto[];
}