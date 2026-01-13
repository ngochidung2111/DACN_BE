import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual } from 'typeorm';
import { Room } from '../entity/room.entity';
import { CreateRoomDto, UpdateRoomDto } from '../dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  // Tạo phòng mới
  async createRoom(createRoomDto: CreateRoomDto): Promise<Room> {
    const { name, capacity, equipment } = createRoomDto;

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
}
