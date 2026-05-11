import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateHolidayDto } from './create-holiday.dto';

export class CreateHolidaysDto {
  @ApiProperty({
    description: 'Array of holidays to create',
    type: [CreateHolidayDto],
    example: [
      {
        date: '2026-04-30T00:00:00.000Z',
        name: 'Reunification Day',
        description: 'National holiday of Vietnam',
      },
      {
        date: '2026-09-02T00:00:00.000Z',
        name: 'National Day',
        description: 'Independence Day of Vietnam',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHolidayDto)
  holidays: CreateHolidayDto[];
}
