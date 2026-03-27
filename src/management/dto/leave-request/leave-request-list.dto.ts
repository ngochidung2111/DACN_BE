import { Expose, Transform, Type } from 'class-transformer';

class LeaveRequestListEmployeeDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ obj }) => [obj?.firstName, obj?.middleName, obj?.lastName].filter(Boolean).join(' '), {
    toClassOnly: true,
  })
  name: string;
}

export class LeaveRequestListDto {
  @Expose()
  id: string;

  @Expose()
  created_at: Date;

  @Expose()
  @Type(() => LeaveRequestListEmployeeDto)
  employee: LeaveRequestListEmployeeDto;

  @Expose()
  date_from: Date;

  @Expose()
  date_to: Date;

  @Expose()
  reason: string;

  @Expose()
  status: string;
}
