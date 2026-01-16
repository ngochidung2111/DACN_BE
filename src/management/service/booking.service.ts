import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking } from '../entity/booking.entity';
import { Room } from '../entity/room.entity';
import { BookingResponseDto, CreateBookingDto, UpdateBookingDto } from '../dto';
import { BOOKING_STATUS, BOOKING_PATTERN } from '../entity/constants';
import { plainToInstance } from 'class-transformer';
import { EmployeeService } from 'src/auth/service/employee.service';
import { Employee } from 'src/auth/entity/employee.entity';
import e from 'express';
import { BookingResponseShortDto } from '../dto/booking-response-short.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,

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
    const { room_id, start_time, end_time, purpose, recurring_pattern, recurring_end_date } =
      createBookingDto;
    const employee = await this.employeeService.findById(employeeId);
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
      
      
      const booking = await this.createSingleBooking(employee, room, startDate, endDate, purpose);
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
      recurring_pattern as BOOKING_PATTERN,
      recurringEndDate,
    );
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
    pattern: BOOKING_PATTERN,
    recurringEndDate: Date,
  ): Promise<Booking[]> {
    const bookings: Booking[] = [];
    let currentStart = new Date(startDate);
    let currentEnd = new Date(endDate);

    // Tính toán khoảng cách giữa start và end
    const duration = endDate.getTime() - startDate.getTime();

    // Tạo các booking theo pattern cho đến khi đạt recurring_end_date
    while (currentStart < recurringEndDate) {
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
    includeOnlyParent?: boolean,
  ) {
    let query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee');

    if (roomId) {
      query.andWhere('booking.room.id = :roomId', { roomId });
    }

    if (employeeId) {
      query.andWhere('booking.employee.id = :employeeId', { employeeId });
    }

    if (status) {
      query.andWhere('booking.status = :status', { status });
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
  async getBookingById(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['room', 'employee'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  // Cập nhật booking đơn lẻ
  async updateBooking(bookingId: string, updateBookingDto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);

    // Nếu là booking lặp lại, không cho phép đổi thời gian
    if (booking.recurring_pattern) {
      throw new BadRequestException(
        'Cannot update time for recurring bookings. Please cancel this booking and create a new one.',
      );
    }

    // Cập nhật status
    if (updateBookingDto.status === BOOKING_STATUS.CANCELLED) {
      booking.status = BOOKING_STATUS.CANCELLED;
    } else if (updateBookingDto.status === BOOKING_STATUS.CHECKED_IN) {
      booking.status = BOOKING_STATUS.CHECKED_IN;
    } else if (updateBookingDto.status === BOOKING_STATUS.CHECKED_OUT) {
      booking.status = BOOKING_STATUS.CHECKED_OUT;
    }

    return this.bookingRepository.save(booking);
  }

  // Xóa booking đơn lẻ
  async deleteBooking(bookingId: string): Promise<void> {
    const booking = await this.getBookingById(bookingId);
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
      relations: ['room', 'employee'],
      order: { start_time: 'ASC' },
    });
  }

  // Kiểm tra lịch sử booking của employee
  async getEmployeeBookingHistory(employeeId: string): Promise<BookingResponseDto[]> {
    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.employee', 'employee')
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
      relations: ['room', 'employee'],
    });
    return this.mapToBookingResponseShort(bookings);
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
    return dto;
  }
}
