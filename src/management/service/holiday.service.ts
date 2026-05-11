import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Holiday } from '../entity/holiday.entity';
import { CreateHolidayDto, UpdateHolidayDto, CreateHolidaysDto } from '../dto/holiday';

@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
  ) {}

  async create(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = this.holidayRepository.create({
      ...createHolidayDto,
      date: new Date(createHolidayDto.date),
    });
    return this.holidayRepository.save(holiday);
  }

  async createBatch(createHolidaysDto: CreateHolidaysDto): Promise<Holiday[]> {
    const holidays = createHolidaysDto.holidays.map((dto) =>
      this.holidayRepository.create({
        ...dto,
        date: new Date(dto.date),
      }),
    );
    return this.holidayRepository.save(holidays);
  }

  async findAll(): Promise<Holiday[]> {
    return this.holidayRepository.find({
      where: { isActive: true },
      order: { date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOne({ where: { id } });
    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }
    return holiday;
  }

  async update(id: string, updateHolidayDto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findOne(id);
    const updateData = {
      ...updateHolidayDto,
      ...(updateHolidayDto.date && { date: new Date(updateHolidayDto.date) }),
    };
    Object.assign(holiday, updateData);
    return this.holidayRepository.save(holiday);
  }

  async remove(id: string): Promise<void> {
    const holiday = await this.findOne(id);
    await this.holidayRepository.remove(holiday);
  }

  async getHolidaysByMonth(year: number, month: number): Promise<Holiday[]> {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    return this.holidayRepository.find({
      where: {
        date: Between(start, end),
        isActive: true,
      },
      order: { date: 'ASC' },
    });
  }
}
