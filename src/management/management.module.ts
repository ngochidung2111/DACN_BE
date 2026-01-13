import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementController } from './controller/management.controller';
import { BookingController } from './controller/booking.controller';
import { RoomController } from './controller/room.controller';
import { ManagementService } from './service/management.service';
import { BookingService } from './service/booking.service';
import { RoomService } from './service/room.service';
import { Booking } from './entity/booking.entity';
import { Room } from './entity/room.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room]), AuthModule],
  controllers: [ManagementController, BookingController, RoomController],
  providers: [ManagementService, BookingService, RoomService],
})
export class ManagementModule {}
