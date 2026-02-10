import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementController } from './controller/management.controller';
import { BookingController } from './controller/booking.controller';
import { RoomController } from './controller/room.controller';
import { AttendanceController } from './controller/attendance.controller';
import { ManagementService } from './service/management.service';
import { BookingService } from './service/booking.service';
import { RoomService } from './service/room.service';
import { AttendanceService } from './service/attendance.service';
import { Booking } from './entity/booking.entity';
import { Room } from './entity/room.entity';
import { Attendance } from './entity/attendance.entity';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room, Attendance]), AuthModule, SharedModule],
  controllers: [ManagementController, BookingController, RoomController, AttendanceController],
  providers: [ManagementService, BookingService, RoomService, AttendanceService],
})
export class ManagementModule {}
