import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual } from 'typeorm';
import { Room } from '../entity/room.entity';
import { CreateRoomDto, UpdateRoomDto } from '../dto';
import { GcsService } from './gcs.service';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private readonly gcsService: GcsService,
  ) {}

  // Tạo phòng mới
  async createRoom(createRoomDto: CreateRoomDto): Promise<Room> {
    const { name, capacity, equipment, imageKey, imageUrl, location } = createRoomDto;

    if (!name || name.trim() === '') {
      throw new BadRequestException('Room name is required');
    }

    if (capacity < 1) {
      throw new BadRequestException('Room capacity must be at least 1');
    }

    const room = this.roomRepository.create({
      name,
      capacity,
      equipment: equipment || [],
      imageKey,
      imageUrl,
      location,
    });

    return this.roomRepository.save(room);
  }

  // Lấy tất cả phòng
  async getAllRooms(): Promise<Room[]> {
    return this.roomRepository.find({
      order: { name: 'ASC' },
    });
  }

  // Lấy phòng theo ID
  async getRoomById(roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return room;
  }

  // Cập nhật phòng
  async updateRoom(roomId: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.getRoomById(roomId);

    if (updateRoomDto.name !== undefined) {
      if (updateRoomDto.name.trim() === '') {
        throw new BadRequestException('Room name cannot be empty');
      }
      room.name = updateRoomDto.name;
    }

    if (updateRoomDto.capacity !== undefined) {
      if (updateRoomDto.capacity < 1) {
        throw new BadRequestException('Room capacity must be at least 1');
      }
      room.capacity = updateRoomDto.capacity;
    }

    if (updateRoomDto.equipment !== undefined) {
      room.equipment = updateRoomDto.equipment;
    }

    if (updateRoomDto.imageKey !== undefined) {
      room.imageKey = updateRoomDto.imageKey;
    }

    if (updateRoomDto.imageUrl !== undefined) {
      room.imageUrl = updateRoomDto.imageUrl;
    }

    if (updateRoomDto.location !== undefined) {
      room.location = updateRoomDto.location;
    }

    return this.roomRepository.save(room);
  }

  // Xóa phòng
  async deleteRoom(roomId: string): Promise<void> {
    const room = await this.getRoomById(roomId);
    await this.roomRepository.remove(room);
  }

  // Tìm phòng theo tên
  async findRoomsByName(name: string): Promise<Room[]> {
    return this.roomRepository.find({
      where: {
        name: Like(`%${name}%`),
      },
    });
  }

  // Tìm phòng theo capacity
  async findRoomsByCapacity(minCapacity: number): Promise<Room[]> {
    return this.roomRepository.find({
      where: {
        capacity: MoreThanOrEqual(minCapacity),
      },
      order: { capacity: 'ASC' },
    });
  }

  async uploadRoomImage(roomId: string, file: Express.Multer.File) {
    const room = await this.getRoomById(roomId);

    if (!file) {
      throw new BadRequestException('file is required');
    }

    const safeFileName = file.originalname.replace(/\s+/g, '-');
    const key = `rooms/${room.id}/${Date.now()}-${safeFileName}`;

    const uploaded = await this.gcsService.uploadFile({
      key,
      file: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });

    room.imageKey = uploaded.key;
    room.imageUrl = uploaded.fileUrl;
    await this.roomRepository.save(room);

    return {
      roomId: room.id,
      key: uploaded.key,
      fileUrl: uploaded.fileUrl,
    };
  }

  async getRoomImageReadUrl(roomId: string) {
    const room = await this.getRoomById(roomId);

    if (!room.imageKey) {
      throw new NotFoundException('Room does not have an image');
    }

    const readUrl = await this.gcsService.createReadUrl(room.imageKey);

    return {
      roomId: room.id,
      readUrl,
    };
  }
}
