import { IsEnum, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateBookingDto {
  @ApiPropertyOptional({ enum: ['confirmed', 'pending', 'cancelled'] })
  @IsEnum(['confirmed', 'pending', 'cancelled'])
  @IsOptional()
  status?: string
}
