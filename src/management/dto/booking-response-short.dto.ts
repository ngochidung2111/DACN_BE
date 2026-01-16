import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';


export class BookingResponseShortDto {
    @ApiProperty({ description: 'Booking ID', example: '6bfc3c51-1e0d-4f27-9a6c-7b32e9f482be' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'Start time of the booking', example: '2023-10-01T09:00:00Z' })
    @Expose()
    startTime: Date;

    @ApiProperty({ description: 'End time of the booking', example: '2023-10-01T10:00:00Z' })
    @Expose()
    endTime: Date;

    @ApiProperty({ description: 'Name associated with the booking', example: 'John Doe' })
    @Expose()
    name: string;
    @ApiProperty({ description: 'Room name associated with the booking', example: 'Conference Room A' })
    @Expose()
    roomName?: string;


}