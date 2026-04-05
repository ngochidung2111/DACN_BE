import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

import { AnnouncementInteraction, CompanyAnnouncement } from '../entity';
import { ANNOUNCEMENT_CATEGORY, INTERACTION_TYPE, ROLE } from '../entity/constants';
import { S3Service } from './s3.service';
import {
  AnnouncementCommentResponseDto,
  AnnouncementListResponseDto,
  AnnouncementQueryDto,
  AnnouncementResponseDto,
  AnnouncementToggleLikeResponseDto,
  CreateAnnouncementCommentDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../dto/announcement';
import { EmployeeService } from '../../auth/service/employee.service';

type UploadedAnnouncementImage = {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
};

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(CompanyAnnouncement)
    private readonly announcementRepository: Repository<CompanyAnnouncement>,
    @InjectRepository(AnnouncementInteraction)
    private readonly interactionRepository: Repository<AnnouncementInteraction>,
    private readonly employeeService: EmployeeService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadAnnouncementImage(announcementId: string, employeeId: string, file: UploadedAnnouncementImage) {
    const employee = await this.employeeService.findById(employeeId);

    if (![ROLE.ADMIN, ROLE.MANAGER].includes(employee.roles)) {
      throw new ForbiddenException('Only admin or manager can upload announcement images');
    }

    const announcement = await this.getAnnouncementEntityById(announcementId);

    if (!file) {
      throw new BadRequestException('file is required');
    }

    const safeFileName = file.originalname.replace(/\s+/g, '-');
    const key = `announcements/${announcement.id}/${Date.now()}-${safeFileName}`;

    const uploaded = await this.s3Service.uploadFile({
      key,
      file: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });

    const nextImages = Array.isArray(announcement.image_urls) ? [...announcement.image_urls] : [];
    nextImages.push(uploaded.fileUrl);
    announcement.image_urls = nextImages;
    await this.announcementRepository.save(announcement);

    return {
      announcementId: announcement.id,
      key: uploaded.key,
      fileUrl: uploaded.fileUrl,
      image_urls: nextImages,
    };
  }

  async createAnnouncement(employeeId: string, dto: CreateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const creator = await this.employeeService.findById(employeeId);
    if (![ROLE.ADMIN, ROLE.MANAGER].includes(creator.roles)) {
      throw new ForbiddenException('Only admin or manager can create announcements');
    }

    const announcement = this.announcementRepository.create({
      employee: creator,
      title: dto.title,
      content: dto.content,
      category: dto.category,
      pinned: dto.pinned ?? false,
    });

    const saved = await this.announcementRepository.save(announcement);
    return this.mapAnnouncementResponse(saved, { likeCount: 0, commentCount: 0, likedByMe: false });
  }

  async updateAnnouncement(announcementId: string, dto: UpdateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const announcement = await this.getAnnouncementEntityById(announcementId);

    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.content !== undefined) announcement.content = dto.content;
    if (dto.category !== undefined) announcement.category = dto.category;
    if (dto.pinned !== undefined) announcement.pinned = dto.pinned;

    const saved = await this.announcementRepository.save(announcement);
    const stats = (await this.getStatsMap([saved.id])).get(saved.id);
    return this.mapAnnouncementResponse(saved, stats);
  }

  async deleteAnnouncement(announcementId: string): Promise<void> {
    const announcement = await this.getAnnouncementEntityById(announcementId);
    await this.announcementRepository.remove(announcement);
  }

  async togglePin(announcementId: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.getAnnouncementEntityById(announcementId);
    announcement.pinned = !announcement.pinned;
    const saved = await this.announcementRepository.save(announcement);
    const stats = (await this.getStatsMap([saved.id])).get(saved.id);
    return this.mapAnnouncementResponse(saved, stats);
  }

  async getAnnouncements(
    query: AnnouncementQueryDto,
    viewerId?: string,
  ): Promise<AnnouncementListResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const qb = this.announcementRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.employee', 'employee');

    if (query.category) {
      qb.andWhere('announcement.category = :category', { category: query.category });
    }

    if (query.pinned !== undefined) {
      qb.andWhere('announcement.pinned = :pinned', { pinned: query.pinned });
    }

    if (query.search) {
      const keyword = `%${query.search}%`;
      qb.andWhere('(announcement.title LIKE :keyword OR announcement.content LIKE :keyword)', {
        keyword,
      });
    }

    qb.orderBy('announcement.pinned', 'DESC').addOrderBy('announcement.created_at', 'DESC');

    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const statsMap = await this.getStatsMap(items.map((item) => item.id), viewerId);

    return {
      items: items.map((item) => this.mapAnnouncementResponse(item, statsMap.get(item.id))),
      total,
      page,
      pageSize,
    };
  }

  async getPinnedAnnouncements(viewerId?: string): Promise<AnnouncementListResponseDto> {
    return this.getAnnouncements({ page: 1, pageSize: 100, pinned: true }, viewerId);
  }

  async getAnnouncementById(announcementId: string, viewerId?: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.getAnnouncementEntityById(announcementId);
    const comments = await this.getComments(announcementId);
    const stats = (await this.getStatsMap([announcement.id], viewerId)).get(announcement.id);

    return this.mapAnnouncementResponse(announcement, stats, comments);
  }

  async getAnnouncementInteractions(announcementId: string): Promise<AnnouncementCommentResponseDto[]> {
    await this.getAnnouncementEntityById(announcementId);
    return this.getComments(announcementId);
  }

  async toggleLike(
    employeeId: string,
    announcementId: string,
  ): Promise<AnnouncementToggleLikeResponseDto> {
    const employee = await this.employeeService.findById(employeeId);
    const announcement = await this.getAnnouncementEntityById(announcementId);

    const existingLike = await this.interactionRepository.findOne({
      where: {
        announcement: { id: announcement.id },
        employee: { id: employee.id },
        interaction_type: INTERACTION_TYPE.LIKE,
      },
      relations: ['announcement', 'employee'],
    });

    if (existingLike) {
      await this.interactionRepository.remove(existingLike);
      const likeCount = await this.getLikeCount(announcement.id);
      return { liked: false, likeCount };
    }

    await this.interactionRepository.save(
      this.interactionRepository.create({
        announcement,
        employee,
        interaction_type: INTERACTION_TYPE.LIKE,
        comment: null,
      }),
    );

    const likeCount = await this.getLikeCount(announcement.id);
    return { liked: true, likeCount };
  }

  async addComment(
    employeeId: string,
    announcementId: string,
    dto: CreateAnnouncementCommentDto,
  ): Promise<AnnouncementCommentResponseDto> {
    const employee = await this.employeeService.findById(employeeId);
    const announcement = await this.getAnnouncementEntityById(announcementId);

    const comment = this.interactionRepository.create({
      announcement,
      employee,
      interaction_type: INTERACTION_TYPE.COMMENT,
      comment: dto.comment,
    });

    const saved = await this.interactionRepository.save(comment);
    const loaded = await this.interactionRepository.findOne({
      where: { id: saved.id },
      relations: ['employee'],
    });

    if (!loaded) {
      throw new NotFoundException('Comment not found after save');
    }

    return plainToInstance(AnnouncementCommentResponseDto, loaded, {
      excludeExtraneousValues: true,
    });
  }

  async getMyInteractions(employeeId: string): Promise<AnnouncementListResponseDto> {
    await this.employeeService.findById(employeeId);

    const interactedAnnouncementIds = await this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoin('interaction.announcement', 'announcement')
      .leftJoin('interaction.employee', 'employee')
      .select('DISTINCT announcement.id', 'announcementId')
      .where('employee.id = :employeeId', { employeeId })
      .getRawMany<{ announcementId: string }>();

    const announcementIds = interactedAnnouncementIds.map((row) => row.announcementId);
    if (announcementIds.length === 0) {
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }

    const announcements = await this.announcementRepository.find({
      where: announcementIds.map((id) => ({ id })),
      relations: ['employee'],
      order: { created_at: 'DESC' },
    });

    const statsMap = await this.getStatsMap(announcementIds, employeeId);
    return {
      items: announcements.map((announcement) => this.mapAnnouncementResponse(announcement, statsMap.get(announcement.id))),
      total: announcements.length,
      page: 1,
      pageSize: announcements.length,
    };
  }

  private async getAnnouncementEntityById(announcementId: string): Promise<CompanyAnnouncement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id: announcementId },
      relations: ['employee'],
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  private async getComments(announcementId: string): Promise<AnnouncementCommentResponseDto[]> {
    const comments = await this.interactionRepository.find({
      where: {
        announcement: { id: announcementId },
        interaction_type: INTERACTION_TYPE.COMMENT,
      },
      relations: ['employee'],
      order: { created_at: 'ASC' },
    });

    return plainToInstance(AnnouncementCommentResponseDto, comments, {
      excludeExtraneousValues: true,
    });
  }

  private async getLikeCount(announcementId: string): Promise<number> {
    return this.interactionRepository.count({
      where: {
        announcement: { id: announcementId },
        interaction_type: INTERACTION_TYPE.LIKE,
      },
    });
  }

  private async getStatsMap(announcementIds: string[], viewerId?: string) {
    const statsMap = new Map<string, { likeCount: number; commentCount: number; likedByMe: boolean }>();

    if (announcementIds.length === 0) {
      return statsMap;
    }

    const aggregateRows = await this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoin('interaction.announcement', 'announcement')
      .select('announcement.id', 'announcementId')
      .addSelect('SUM(CASE WHEN interaction.interaction_type = :likeType THEN 1 ELSE 0 END)', 'likeCount')
      .addSelect('SUM(CASE WHEN interaction.interaction_type = :commentType THEN 1 ELSE 0 END)', 'commentCount')
      .where('announcement.id IN (:...announcementIds)', { announcementIds })
      .setParameters({ likeType: INTERACTION_TYPE.LIKE, commentType: INTERACTION_TYPE.COMMENT })
      .groupBy('announcement.id')
      .getRawMany<{ announcementId: string; likeCount: string; commentCount: string }>();

    aggregateRows.forEach((row) => {
      statsMap.set(row.announcementId, {
        likeCount: Number(row.likeCount || 0),
        commentCount: Number(row.commentCount || 0),
        likedByMe: false,
      });
    });

    announcementIds.forEach((id) => {
      if (!statsMap.has(id)) {
        statsMap.set(id, { likeCount: 0, commentCount: 0, likedByMe: false });
      }
    });

    if (viewerId) {
      const likedRows = await this.interactionRepository
        .createQueryBuilder('interaction')
        .leftJoin('interaction.announcement', 'announcement')
        .leftJoin('interaction.employee', 'employee')
        .select('announcement.id', 'announcementId')
        .where('announcement.id IN (:...announcementIds)', { announcementIds })
        .andWhere('employee.id = :viewerId', { viewerId })
        .andWhere('interaction.interaction_type = :likeType', { likeType: INTERACTION_TYPE.LIKE })
        .getRawMany<{ announcementId: string }>();

      likedRows.forEach((row) => {
        const entry = statsMap.get(row.announcementId);
        if (entry) {
          entry.likedByMe = true;
        }
      });
    }

    return statsMap;
  }

  private mapAnnouncementResponse(
    announcement: CompanyAnnouncement,
    stats?: { likeCount: number; commentCount: number; likedByMe: boolean },
    comments?: AnnouncementCommentResponseDto[],
  ): AnnouncementResponseDto {
    const response = new AnnouncementResponseDto();
    response.id = announcement.id;
    response.employee = announcement.employee;
    response.title = announcement.title;
    response.content = announcement.content;
    response.image_urls = announcement.image_urls;
    response.category = announcement.category as ANNOUNCEMENT_CATEGORY;
    response.pinned = announcement.pinned;
    response.created_at = announcement.created_at;
    response.likeCount = stats?.likeCount ?? 0;
    response.commentCount = stats?.commentCount ?? 0;
    response.likedByMe = stats?.likedByMe ?? false;
    response.comments = comments;
    return plainToInstance(AnnouncementResponseDto, response, { excludeExtraneousValues: true });
  }
}
