import { ApiProperty } from '@nestjs/swagger';

export class RoomResponseDto {
  @ApiProperty({ description: 'Room ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Room name', example: 'Meeting Room A' })
  name: string;

  @ApiProperty({ description: 'Room capacity', example: 20 })
  capacity: number;

  @ApiProperty({ description: 'Room equipment', example: ['Projector', 'Whiteboard', 'AC'] })
  equipment: string[];
}
