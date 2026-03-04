import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementController } from './controller/management.controller';
import { BookingController } from './controller/booking.controller';
import { RoomController } from './controller/room.controller';
import { AttendanceController } from './controller/attendance.controller';
import { PayrollController } from './controller/payroll.controller';
import { LeaveRequestController } from './controller/leave-request.controller';
import { ManagementService } from './service/management.service';
import { BookingService } from './service/booking.service';
import { RoomService } from './service/room.service';
import { AttendanceService } from './service/attendance.service';
import { PayrollService } from './service/payroll.service';
import { LeaveRequestService } from './service/leave-request.service';
import { Booking } from './entity/booking.entity';
import { Room } from './entity/room.entity';
import { Attendance } from './entity/attendance.entity';
import { Payroll } from './entity/payroll.entity';
import { LeaveRequest } from './entity/leave-request.entity';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room, Attendance, Payroll, LeaveRequest]), AuthModule, SharedModule],
  controllers: [ManagementController, BookingController, RoomController, AttendanceController, PayrollController, LeaveRequestController],
  providers: [ManagementService, BookingService, RoomService, AttendanceService, PayrollService, LeaveRequestService],
})
export class ManagementModule {}
