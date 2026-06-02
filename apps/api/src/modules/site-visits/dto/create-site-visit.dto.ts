import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSiteVisitDto {
  @ApiProperty() @IsUUID() lead_id: string
  @ApiProperty() @IsUUID() employee_id: string
  @ApiProperty() @IsDateString() scheduled_date: string
  @ApiPropertyOptional() @IsUUID() @IsOptional() property_id?: string
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string
}
