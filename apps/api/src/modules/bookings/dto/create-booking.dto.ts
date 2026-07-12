import { IsUUID, IsNumber, IsPositive, IsOptional, IsEnum, IsDateString, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBookingDto {
  @ApiProperty() @IsUUID() lead_id: string
  @ApiProperty() @IsUUID() property_id: string
  @ApiProperty() @IsNumber() @IsPositive() amount: number
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() commission?: number
  @ApiPropertyOptional() @IsUUID() @IsOptional() assigned_to?: string
  @ApiPropertyOptional({ enum: ['confirmed', 'pending'] })
  @IsEnum(['confirmed', 'pending'])
  @IsOptional()
  status?: 'confirmed' | 'pending'
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  booked_at?: string
}
