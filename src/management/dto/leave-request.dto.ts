import { Expose, Transform, Type } from "class-transformer";

class LeaveRequestEmployeeDto {
    @Expose()
    id: string;

    @Expose()
    @Transform(({ obj }) => [obj?.firstName, obj?.middleName, obj?.lastName].filter(Boolean).join(' '), { toClassOnly: true })
    name: string;
}

export class LeaveRequestDto {
    @Expose()
    id: string;

    @Expose()
    created_at: Date;

    @Expose()
    updated_at: Date;
    @Expose()
    @Type(() => LeaveRequestEmployeeDto)
    employee: LeaveRequestEmployeeDto;

    @Expose()
    @Type(() => LeaveRequestEmployeeDto)
    approved_by?: LeaveRequestEmployeeDto;

    @Expose()
    date_from: Date;

    @Expose()
    date_to: Date;

    @Expose()
    reason: string;

    @Expose()
    description: string;        

    @Expose()
    status: string;
}