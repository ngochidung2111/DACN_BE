import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementController } from './controller/management.controller';
import { BookingController } from './controller/booking.controller';
import { RoomController } from './controller/room.controller';
import { AttendanceController } from './controller/attendance.controller';
import { PayrollController } from './controller/payroll.controller';
import { LeaveRequestController } from './controller/leave-request.controller';
import { AssetController } from './controller/asset.controller';
import { TicketController } from './controller/ticket.controller';
import { ReportController } from './controller/report.controller';
import { AnnouncementController } from './controller/announcement.controller';
import { NotificationController } from './controller/notification.controller';
import { ManagementService } from './service/management.service';
import { BookingService } from './service/booking.service';
import { RoomService } from './service/room.service';
import { AttendanceService } from './service/attendance.service';
import { PayrollService } from './service/payroll.service';
import { LeaveRequestService } from './service/leave-request.service';
import { AssetService } from './service/asset.service';
import { TicketService } from './service/ticket.service';
import { ReportService } from './service/report.service';
import { AnnouncementService } from './service/announcement.service';
import { NotificationService } from './service/notification.service';
import { RoomStatusScheduler } from './service/room-status.scheduler';
import { Booking } from './entity/booking.entity';
import { Room } from './entity/room.entity';
import { Attendance } from './entity/attendance.entity';
import { Payroll } from './entity/payroll.entity';
import { LeaveRequest } from './entity/leave-request.entity';
import { CompanyAnnouncement } from './entity/company-announcement.entity';
import { AnnouncementInteraction } from './entity/announcement-interaction.entity';
import { Asset } from './entity/asset.entity';
import { AssetAssignment } from './entity/asset-assignment.entity';
import { Ticket } from './entity/ticket.entity';
import { Report } from './entity/report.entity';
import { TicketProcess } from './entity/ticket-process.entity';
import { TicketCategory } from './entity/ticket-category.entity';
import { Notification } from './entity/notification.entity';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { Employee } from '../auth/entity/employee.entity';
import { Department } from '../auth/entity/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Room,
      Attendance,
      Payroll,
      LeaveRequest,
      CompanyAnnouncement,
      AnnouncementInteraction,
      Asset,
      AssetAssignment,
      Ticket,
      Report,
      TicketProcess,
      TicketCategory,
      Notification,
      Employee,
      Department,
    ]),
    AuthModule,
    ScheduleModule.forRoot(),
    SharedModule,
  ],
  controllers: [
    ManagementController,
    AnnouncementController,
    NotificationController,
    BookingController,
    RoomController,
    AttendanceController,
    PayrollController,
    LeaveRequestController,
    ReportController,
    TicketController,
    AssetController,
    ReportController,
  ],
  providers: [
    ManagementService,
    AnnouncementService,
    NotificationService,
    BookingService,
    RoomService,
    AttendanceService,
    PayrollService,
    LeaveRequestService,
    TicketService,
    AssetService,
    ReportService,
    RoomStatusScheduler,
  ],
  exports: [
    BookingService,
    RoomService,
    AttendanceService,
    LeaveRequestService,
    AnnouncementService,
    TicketService,
  ],
})
export class ManagementModule {}
