import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class DepartmentDto {
    @ApiProperty({
        description: 'ID of the department',
        example: '12345',
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: 'Name of the department',
        example: 'Sales',
    })
    @Expose()
    name: string;
}

export class CreateDepartmentDto {
    @ApiProperty({
        description: 'Name of the department',
        example: 'Sales',
    })
    @IsString({ message: 'Department name must be a string' })  
    name: string;
}