import { ROLE } from "src/management/entity/constants";
import { Department } from "../entity/department.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import e from "express";
import { IsEmail, IsString } from "class-validator";


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
    })
    @Expose()
    phone: string;

    @ApiProperty({
        description: 'User salary',
        example: 50000,
    })
    @Expose()
    salary: number;

    @ApiProperty({
        description: 'Department of the employee',
        example: 'Sales',
    })
    @Expose()
    department: string;
}

export class UpdateProfileDto {
    
    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
    })
    @Expose()
    @IsString()
    lastName: string;
  
    @ApiProperty({
        description: 'User first name',
        example: 'John',
    })
    @Expose()
    @IsString()
    firstName: string;

    @ApiProperty({
        description: 'User middle name',
        example: 'Michael',
    })
    @Expose()
    @IsString()
    middleName: string;

    @ApiProperty({
        description: 'User phone number',
        example: '+1234567890',
    })
    @Expose()
    @IsString()
    phone: string;

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