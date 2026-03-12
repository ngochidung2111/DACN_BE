import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Room } from '../entity/room.entity';
import { Booking } from '../entity/booking.entity';
import { BOOKING_STATUS, ROOM_STATUS } from '../entity/constants';

@Injectable()
export class RoomStatusScheduler {
  private readonly logger = new Logger(RoomStatusScheduler.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  /**
   * Chạy mỗi phút: cập nhật trạng thái phòng dựa trên booking đang diễn ra.
   * - Nếu có booking CONFIRMED đang trong khoảng [start_time, end_time) → OCCUPIED
   * - Không có booking nào đang active → AVAILABLE
   * Phòng đang MAINTENANCE sẽ bị bỏ qua, không tự động đổi trạng thái.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async syncRoomStatus(): Promise<void> {
    const now = new Date();

    const rooms = await this.roomRepository.find();
    if (rooms.length === 0) return;

    // Lấy tất cả booking CONFIRMED đang active tại thời điểm hiện tại
    const activeBookings = await this.bookingRepository.find({
      where: {
        status: BOOKING_STATUS.CONFIRMED,
        start_time: LessThanOrEqual(now),
        end_time: MoreThan(now),
      },
      relations: ['room'],
    });

    const occupiedRoomIds = new Set(activeBookings.map((b) => b.room.id));

    const toUpdate: Room[] = [];

    for (const room of rooms) {
      // Bỏ qua phòng đang bảo trì — chỉ admin mới được đổi thủ công
      if (room.status === ROOM_STATUS.MAINTENANCE) continue;

      const shouldBeOccupied = occupiedRoomIds.has(room.id);
      const targetStatus = shouldBeOccupied ? ROOM_STATUS.OCCUPIED : ROOM_STATUS.AVAILABLE;

      if (room.status !== targetStatus) {
        room.status = targetStatus;
        toUpdate.push(room);
      }
    }

    if (toUpdate.length > 0) {
      await this.roomRepository.save(toUpdate);
      this.logger.log(`Updated status for ${toUpdate.length} room(s)`);
    }
  }
}
