import { Expose } from "class-transformer";

export class AttendanceDto {
    @Expose()
    id: string;

    @Expose()
    timeIn: Date;

    @Expose()
    timeOut: Date;

    @Expose()
    timeInStatus: string;

    @Expose()
    timeOutStatus: string;
    }