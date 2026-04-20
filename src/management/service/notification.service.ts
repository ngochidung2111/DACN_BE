import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

import { EmployeeService } from '../../auth/service/employee.service';
import { NotificationListResponseDto, NotificationResponseDto, QueryNotificationDto } from '../dto/notification';
import { Notification } from '../entity/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly employeeService: EmployeeService,
  ) {}

  async getMyNotifications(employeeId: string, query: QueryNotificationDto): Promise<NotificationListResponseDto> {
    await this.employeeService.findById(employeeId);

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.employee', 'employee')
      .where('employee.id = :employeeId', { employeeId });

    if (query.status) {
      qb.andWhere('notification.status = :status', { status: query.status.trim() });
    }

    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type.trim() });
    }

    if (query.search) {
      qb.andWhere('notification.message LIKE :search', { search: `%${query.search.trim()}%` });
    }

    qb.orderBy('notification.created_at', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: plainToInstance(NotificationResponseDto, items, { excludeExtraneousValues: true }),
      total,
      page,
      pageSize,
    };
  }
}
