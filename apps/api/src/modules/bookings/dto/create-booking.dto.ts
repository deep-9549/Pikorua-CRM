import { IsUUID, IsNumber, IsPositive, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBookingDto {
  @ApiProperty() @IsUUID() lead_id: string
  @ApiProperty() @IsUUID() property_id: string
  @ApiProperty() @IsNumber() @IsPositive() amount: number
  @ApiPropertyOptional() @IsNumber() @IsPositive() @IsOptional() commission?: number
  @ApiPropertyOptional() @IsUUID() @IsOptional() assigned_to?: string
}
