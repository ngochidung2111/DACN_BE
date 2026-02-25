import { Expose } from "class-transformer";

export class AttendanceDto {
    @Expose()
    id: string;

    @Expose()
    TimeIn: Date;

    @Expose()
    TimeOut: Date;
}