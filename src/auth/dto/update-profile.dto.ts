import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { GENDER } from "../entity/constant";

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

    @ApiProperty({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg', required: false })
    @Expose()
    @IsString()
    @IsOptional()
    avatarUrl?: string;

}
