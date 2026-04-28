import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Like, MoreThanOrEqual } from 'typeorm';
import { Booking } from '../entity/booking.entity';
import { Room } from '../entity/room.entity';
import { BookingResponseDto, CreateBookingDto, UpdateBookingDto } from '../dto/booking';
import { BOOKING_STATUS, BOOKING_PATTERN } from '../entity/constants';
import { plainToInstance } from 'class-transformer';

import { BookingResponseShortDto } from '../dto/booking';
import { EMPLOYEE_SCHEDULE_ITEM_TYPE, EmployeeScheduleItemDto } from '../dto';
import { EmployeeService } from '../../auth/service/employee.service';
import { Employee } from '../../auth/entity/employee.entity';
import { Notification } from '../entity/notification.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,

    private employeeService: EmployeeService,
  ) {}

  // Kiểm tra phòng có sẵn không (kiểm tra xem có booking trùng lịch không)
  async checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    // Query để check overlap: new_start < existing_end AND new_end > existing_start
    let query = this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.room_id = :roomId', { roomId })
      .andWhere('booking.status != :cancelled', { cancelled: BOOKING_STATUS.CANCELLED })
      .andWhere('booking.start_time < :endTime', { endTime })
      .andWhere('booking.end_time > :startTime', { startTime });

    // Exclude current booking when updating
    if (excludeBookingId) {
      query.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    const existingBooking = await query.getOne();

    if (existingBooking) {
      return false; // Phòng bị trùng lịch
    }

    return true; // Phòng có sẵn
  }

  // Tạo booking mới (hỗ trợ cả recursive lẫn non-recursive)
  async createBooking(
    employeeId: string,
    createBookingDto: CreateBookingDto,
  ) {
    const {
      room_id,
      start_time,
      end_time,
      purpose,
      recurring_pattern,
      recurring_end_date,
      attendee_ids,
    } =
      createBookingDto;
    const employee = await this.employeeService.findById(employeeId);
    const attendees = await this.resolveAttendees(attendee_ids);
    // Validate thời gian
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (startDate >= endDate) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Kiểm tra phòng tồn tại
    const room = await this.roomRepository.findOne({ where: { id: room_id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Nếu là booking không lặp lại
    if (!recurring_pattern) {
      
      
      const booking = await this.createSingleBooking(
        employee,
        room,
        startDate,
        endDate,
        purpose,
        attendees,
      );
      await this.notifyAttendeesAboutBooking(booking, attendees);
      return plainToInstance(BookingResponseDto, booking, {
        excludeExtraneousValues: true,
      });
    }

    // Nếu là booking lặp lại
    if (!recurring_end_date) {
      throw new BadRequestException('Recurring end date is required for recurring bookings');
    }

    const recurringEndDate = new Date(recurring_end_date);
    if (recurringEndDate <= startDate) {
      throw new BadRequestException('Recurring end date must be after start date');
    }
  
    
    const bookings = await this.createRecurringBooking(
      employee,
      room,
      startDate,
      endDate,
      purpose,
      attendees,
      recurring_pattern as BOOKING_PATTERN,
      recurringEndDate,
    );
    await this.notifyAttendeesAboutRecurringBookings(bookings, attendees);
    return plainToInstance(BookingResponseDto, bookings, {
      excludeExtraneousValues: true,
    });
  }

  // Tạo một booking đơn lẻ
  private async createSingleBooking(
    employee: Employee,
    room: Room,
    startDate: Date,
    endDate: Date,
    purpose: string,
    attendees: Employee[],
  ): Promise<Booking> {
    // Kiểm tra phòng có sẵn không
    const isAvailable = await this.checkRoomAvailability(room.id, startDate, endDate);
    if (!isAvailable) {
      throw new BadRequestException('Room is not available for the selected time');
    }

    // Tạo booking
    const booking = this.bookingRepository.create({
      start_time: startDate,
      end_time: endDate,
      purpose,
      status: BOOKING_STATUS.CONFIRMED,
      room: room,
      employee: employee,
      attendees,
    });


    return this.bookingRepository.save(booking) as Promise<Booking>;
  }

  // Tạo booking lặp lại
  private async createRecurringBooking(
    employee: Employee,
    room: Room,
    startDate: Date,
    endDate: Date,
    purpose: string,
    attendees: Employee[],
    pattern: BOOKING_PATTERN,
    recurringEndDate: Date,
  ): Promise<Booking[]> {
    const bookings: Booking[] = [];
    let currentStart = new Date(startDate);
    let currentEnd = new Date(endDate);

    // Tính toán khoảng cách giữa start và end
    const duration = endDate.getTime() - startDate.getTime();

    // Tạo các booking theo pattern cho đến khi chạm recurring_end_date (inclusive)
    while (currentStart <= recurringEndDate) {
      // Kiểm tra phòng có sẵn không
      const isAvailable = await this.checkRoomAvailability(room.id, currentStart, currentEnd);
      if (!isAvailable) {
        throw new BadRequestException(
          `Room is not available for ${currentStart.toISOString()} to ${currentEnd.toISOString()}`,
        );
      }

      // Tạo booking cho lần lặp này
      const booking = this.bookingRepository.create({
        start_time: new Date(currentStart),
        end_time: new Date(currentEnd),
        purpose,
        status: BOOKING_STATUS.CONFIRMED,
        recurring_pattern: pattern,
        recurring_end_date: recurringEndDate,
      });
      booking.room = room;
      booking.employee = employee;
      booking.attendees = attendees;

      bookings.push(booking);

      // Tăng thời gian theo pattern
      currentStart = this.addPatternToDate(currentStart, pattern);
      currentEnd = new Date(currentStart.getTime() + duration);
    }

    if (bookings.length === 0) {
      throw new BadRequestException(
        'No bookings created. Recurring end date might be too close to start date.',
      );
    }

    // Lưu tất cả bookings
    return this.bookingRepository.save(bookings) as Promise<Booking[]>;
  }

  // Thêm pattern vào date
  private addPatternToDate(date: Date, pattern: BOOKING_PATTERN): Date {
    const newDate = new Date(date);

    switch (pattern) {
      case BOOKING_PATTERN.DAILY:
        newDate.setDate(newDate.getDate() + 1);
        break;
      case BOOKING_PATTERN.WEEKLY:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case BOOKING_PATTERN.MONTHLY:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }

    return newDate;
  }

  // Lấy tất cả bookings
  async getAllBookings(
    roomId?: string,
    employeeId?: string,
    status?: BOOKING_STATUS,
    attendeeId?: string,
    includeOnlyParent?: boolean,
  ) {
    let query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.attendees', 'attendees');

    if (roomId) {
      query.andWhere('booking.room.id = :roomId', { roomId });
    }

    if (employeeId) {
      query.andWhere('booking.employee.id = :employeeId', { employeeId });
    }

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    if (attendeeId) {
      query.andWhere('attendees.id = :attendeeId', { attendeeId });
    }

    // Option để chỉ lấy parent bookings (non-recurring hoặc parent của recurring group)
    if (includeOnlyParent) {
      query.andWhere('booking.parent_booking_id IS NULL');
    }

    query.orderBy('booking.start_time', 'ASC');

    const bookings = await query.getMany();

    return this.mapToBookingResponseShort(bookings);
  }

  // Lấy booking theo ID
  async getBookingById(bookingId: string): Promise<BookingResponseDto> {
    const booking = await this.getBookingEntityById(bookingId);
    return this.toBookingResponseDto(booking);
  }

  private async getBookingEntityById(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['room', 'employee', 'attendees'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // Cập nhật booking đơn lẻ
  async updateBooking(
    bookingId: string,
    updateBookingDto: UpdateBookingDto,
    requesterId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.getBookingEntityById(bookingId);

    // Chỉ creator mới được sửa
    if (!booking.employee || booking.employee.id !== requesterId) {
      throw new ForbiddenException('Only the creator can update this booking');
    }

    // Handle potential room/time changes
    let nextStart = booking.start_time;
    let nextEnd = booking.end_time;
    let nextRoom = booking.room;

    if (updateBookingDto.start_time !== undefined) {
      nextStart = new Date(updateBookingDto.start_time as any);
    }
    if (updateBookingDto.end_time !== undefined) {
      nextEnd = new Date(updateBookingDto.end_time as any);
    }

    if (nextStart >= nextEnd) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (updateBookingDto.room_id !== undefined && updateBookingDto.room_id !== booking.room?.id) {
      const room = await this.roomRepository.findOne({ where: { id: updateBookingDto.room_id } });
      if (!room) {
        throw new NotFoundException('Room not found');
      }
      nextRoom = room;
    }

    // Check availability excluding current booking
    const isAvailable = await this.checkRoomAvailability(nextRoom.id, nextStart, nextEnd, booking.id);
    if (!isAvailable) {
      throw new BadRequestException('Room is not available for the selected time');
    }

    // Apply changes
    booking.start_time = nextStart;
    booking.end_time = nextEnd;
    booking.room = nextRoom;

    if (updateBookingDto.purpose !== undefined) {
      booking.purpose = updateBookingDto.purpose;
    }

    // Cập nhật status
    if (updateBookingDto.status === BOOKING_STATUS.CANCELLED) {
      booking.status = BOOKING_STATUS.CANCELLED;
    } else if (updateBookingDto.status === BOOKING_STATUS.CHECKED_IN) {
      booking.status = BOOKING_STATUS.CHECKED_IN;
    } else if (updateBookingDto.status === BOOKING_STATUS.CHECKED_OUT) {
      booking.status = BOOKING_STATUS.CHECKED_OUT;
    }

    let addedAttendees: Employee[] = [];
    if (updateBookingDto.attendee_ids !== undefined) {
      const previousAttendeeIds = new Set((booking.attendees ?? []).map((attendee) => attendee.id));
      const nextAttendees = await this.resolveAttendees(updateBookingDto.attendee_ids);
      booking.attendees = nextAttendees;
      addedAttendees = nextAttendees.filter((attendee) => !previousAttendeeIds.has(attendee.id));
    }

    const updatedBooking = await this.bookingRepository.save(booking);
    if (addedAttendees.length > 0) {
      await this.notifyAttendeesAboutBooking(updatedBooking, addedAttendees);
    }

    return this.toBookingResponseDto(updatedBooking);
  }

  async addAttendees(bookingId: string, attendeeIds: string[]): Promise<BookingResponseDto> {
    const booking = await this.getBookingEntityById(bookingId);
    const attendeesToAdd = await this.resolveAttendees(attendeeIds);
    const existingAttendees = booking.attendees ?? [];

    const existingIds = new Set(existingAttendees.map((attendee) => attendee.id));
    const mergedAttendees = [
      ...existingAttendees,
      ...attendeesToAdd.filter((attendee) => !existingIds.has(attendee.id)),
    ];

    booking.attendees = mergedAttendees;
    const updatedBooking = await this.bookingRepository.save(booking);
    await this.notifyAttendeesAboutBooking(updatedBooking, attendeesToAdd.filter((attendee) => !existingIds.has(attendee.id)));
    return this.toBookingResponseDto(updatedBooking);
  }

  // Xóa booking đơn lẻ
  async deleteBooking(bookingId: string): Promise<void> {
    const booking = await this.getBookingEntityById(bookingId);
    await this.bookingRepository.remove(booking);
  }

  // Lấy bookings của một phòng trong khoảng thời gian
  async getBookingsByRoomAndDateRange(
    roomId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: {
        room: { id: roomId },
        start_time: Between(startDate, endDate),
      },
      relations: ['room', 'employee', 'attendees'],
      order: { start_time: 'ASC' },
    });
  }

  // Kiểm tra lịch sử booking của employee
  async getEmployeeBookingHistory(employeeId: string): Promise<BookingResponseDto[]> {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.attendees', 'attendees')
      .where('booking.employee_id = :employeeId', { employeeId })
      .orderBy('booking.start_time', 'DESC');

    const bookings = await query.getMany();
    const result = plainToInstance(BookingResponseDto, bookings, {
      excludeExtraneousValues: true,
    });
    return result;
  }

  // Lấy các booking sắp diễn ra (non-recurring hoặc recurring group)
  async getUpcomingBookings(
    employeeId: string,
    daysAhead: number = 7,
  ): Promise<BookingResponseDto[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.attendees', 'attendees')
      .where('booking.employee_id = :employeeId', { employeeId })
      .andWhere('booking.start_time >= :now', { now })
      .andWhere('booking.start_time <= :futureDate', { futureDate })
      .andWhere('booking.status != :cancelled', { cancelled: BOOKING_STATUS.CANCELLED })
      .orderBy('booking.start_time', 'ASC');

    const bookings = await query.getMany();
    return plainToInstance(BookingResponseDto, bookings, {
      excludeExtraneousValues: true,
    });
  }

  async findByRoom(roomId: string) {
    const bookings = await this.bookingRepository.find({
      where: { room: { id: roomId } },
      relations: ['room', 'employee', 'attendees'],
    });
    return this.mapToBookingResponseShort(bookings);
  }
  async findByEmployee(employeeId: string) {
    const bookings = await this.bookingRepository.find({
      where: { employee: { id: employeeId } },
      relations: ['room', 'employee', 'attendees'],
    });
    return this.mapToBookingResponseShort(bookings);
  }

  async findRoomByNameForBooking(roomName: string): Promise<Room> {
    const normalized = roomName.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Room name is required');
    }

    const rooms = await this.roomRepository.find({
      where: {
        name: Like(`%${roomName.trim()}%`),
      },
      order: { name: 'ASC' },
    });

    if (rooms.length === 0) {
      throw new NotFoundException(`Room with name "${roomName}" not found`);
    }

    const exact = rooms.find((room) => room.name.trim().toLowerCase() === normalized);
    return exact ?? rooms[0];
  }

  async getMeetingRoomSchedule(
    startTime: Date,
    endTime: Date,
    roomId?: string,
    minCapacity?: number,
  ) {
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const roomWhere: Record<string, unknown> = {};
    if (roomId) {
      roomWhere.id = roomId;
    }
    if (minCapacity !== undefined) {
      roomWhere.capacity = MoreThanOrEqual(minCapacity);
    }

    const rooms = await this.roomRepository.find({
      where: roomWhere,
      order: { name: 'ASC' },
    });

    if (roomId && rooms.length === 0) {
      throw new NotFoundException('Room not found');
    }

    if (rooms.length === 0) {
      return [];
    }

    const roomIds = rooms.map((room) => room.id);
    const bookings = await this.bookingRepository.find({
      where: {
        room: { id: In(roomIds) },
      },
      relations: ['room', 'employee', 'attendees'],
      order: { start_time: 'ASC' },
    });

    const activeOverlaps = bookings.filter(
      (booking) =>
        booking.status !== BOOKING_STATUS.CANCELLED &&
        booking.start_time < endTime &&
        booking.end_time > startTime,
    );

    const bookingMap = new Map<string, Booking[]>();
    for (const booking of activeOverlaps) {
      const key = booking.room?.id;
      if (!key) {
        continue;
      }

      const existed = bookingMap.get(key) ?? [];
      existed.push(booking);
      bookingMap.set(key, existed);
    }

    return rooms.map((room) => {
      const conflicts = bookingMap.get(room.id) ?? [];
      return {
        room,
        available: conflicts.length === 0,
        conflictCount: conflicts.length,
        conflicts: plainToInstance(BookingResponseDto, conflicts, {
          excludeExtraneousValues: true,
        }),
      };
    });
  }

  async findByCreatorOrAttendee(employeeId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.attendees', 'attendees')
      .where('employee.id = :employeeId', { employeeId })
      .orWhere('attendees.id = :employeeId', { employeeId })
      .distinct(true)
      .orderBy('booking.start_time', 'DESC')
      .getMany();

    return plainToInstance(BookingResponseDto, bookings, {
      excludeExtraneousValues: true,
    });
  }

  async findInvolvedBookingsSchedule(
    employeeId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<EmployeeScheduleItemDto[]> {
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.attendees', 'attendees')
      .where('(employee.id = :employeeId OR attendees.id = :employeeId)', { employeeId })
      .andWhere('booking.status != :cancelled', { cancelled: BOOKING_STATUS.CANCELLED })
      .distinct(true)
      .orderBy('booking.start_time', 'ASC');

    if (fromDate && toDate) {
      qb.andWhere('booking.start_time <= :toDate AND booking.end_time >= :fromDate', {
        fromDate,
        toDate,
      });
    } else if (fromDate) {
      qb.andWhere('booking.end_time >= :fromDate', { fromDate });
    } else if (toDate) {
      qb.andWhere('booking.start_time <= :toDate', { toDate });
    }

    const bookings = await qb.getMany();

    return bookings.map((booking) => {
      const item = new EmployeeScheduleItemDto();
      item.id = booking.id;
      item.type = EMPLOYEE_SCHEDULE_ITEM_TYPE.BOOKING;
      item.start_time = booking.start_time;
      item.end_time = booking.end_time;
      item.title = booking.purpose;
      item.subtitle = booking.room?.name;
      item.status = booking.status;
      return item;
    });
  }

  private async resolveAttendees(attendeeIds?: string[]): Promise<Employee[]> {
    if (!attendeeIds || attendeeIds.length === 0) {
      return [];
    }

    const uniqueAttendeeIds = [...new Set(attendeeIds)];
    const attendees = await Promise.all(
      uniqueAttendeeIds.map((attendeeId) => this.employeeService.findById(attendeeId)),
    );

    return attendees;
  }

  private async notifyAttendeesAboutBooking(booking: Booking, attendees: Employee[]): Promise<void> {
    if (!booking?.id || attendees.length === 0) {
      return;
    }

    const uniqueAttendees = attendees.filter(
      (attendee, index, list) => list.findIndex((item) => item.id === attendee.id) === index,
    );

    await Promise.all(
      uniqueAttendees
        .filter((attendee) => attendee.id !== booking.employee?.id)
        .map((attendee) =>
          this.notificationRepository.save(
            this.notificationRepository.create({
              employee: attendee,
              message: `You have been added to booking "${booking.purpose}" in room ${booking.room?.name ?? 'Unknown'} from ${booking.start_time.toISOString()} to ${booking.end_time.toISOString()}.`,
              type: 'BOOKING',
              status: 'UNREAD',
              created_at: new Date(),
            }),
          ),
        ),
    );
  }

  private async notifyAttendeesAboutRecurringBookings(bookings: Booking[], attendees: Employee[]): Promise<void> {
    if (bookings.length === 0 || attendees.length === 0) {
      return;
    }

    const notifications: Notification[] = [];
    for (const booking of bookings) {
      for (const attendee of attendees) {
        if (attendee.id === booking.employee?.id) {
          continue;
        }

        notifications.push(
          this.notificationRepository.create({
            employee: attendee,
            message: `You have been added to recurring booking "${booking.purpose}" in room ${booking.room?.name ?? 'Unknown'} from ${booking.start_time.toISOString()} to ${booking.end_time.toISOString()}.`,
            type: 'BOOKING',
            status: 'UNREAD',
            created_at: new Date(),
          }),
        );
      }
    }

    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
    }
  }

  private toBookingResponseDto(booking: Booking): BookingResponseDto {
    return plainToInstance(BookingResponseDto, booking, {
      excludeExtraneousValues: true,
    });
  }

  // Map booking entity to booking response short DTO
  mapToBookingResponseShort(booking: Booking): BookingResponseShortDto;
  mapToBookingResponseShort(bookings: Booking[]): BookingResponseShortDto[];
  mapToBookingResponseShort(bookingOrBookings: Booking | Booking[]): BookingResponseShortDto | BookingResponseShortDto[] {
    // Nếu là array thì map từng phần tử
    if (Array.isArray(bookingOrBookings)) {
      return bookingOrBookings.map(booking => {
        const dto = new BookingResponseShortDto();
        dto.id = booking.id;
        dto.startTime = booking.start_time;
        dto.endTime = booking.end_time;
        dto.name = booking.employee?.firstName + ' '+ booking.employee?.middleName + ' ' + booking.employee?.lastName  || 'Unknown';
        dto.roomName = booking.room?.name;
        dto.attendeeCount = booking.attendees?.length || 0;
        return dto;
      });
    }

    // Nếu là object đơn lẻ
    const dto = new BookingResponseShortDto();
    dto.id = bookingOrBookings.id;
    dto.startTime = bookingOrBookings.start_time;
    dto.endTime = bookingOrBookings.end_time;
    dto.name = bookingOrBookings.employee?.firstName + ' '+ bookingOrBookings.employee?.middleName + ' ' + bookingOrBookings.employee?.lastName  || 'Unknown';
    dto.roomName = bookingOrBookings.room?.name;
    dto.attendeeCount = bookingOrBookings.attendees?.length || 0;
    return dto;
  }
}
