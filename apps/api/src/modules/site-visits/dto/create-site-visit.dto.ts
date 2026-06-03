import { IsUUID, IsDateString, IsString, IsOptional, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

export class CreateSiteVisitDto {
  @ApiProperty() @IsUUID() lead_id: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsUUID() @IsOptional() employee_id?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsDateString() @IsOptional() scheduled_date?: string
  @ApiPropertyOptional({ enum: ['yet_to_visit', 'visit_week_confirmed', 'visit_date_confirmed', 'visited'] })
  @IsEnum(['yet_to_visit', 'visit_week_confirmed', 'visit_date_confirmed', 'visited'])
  @IsOptional()
  site_visit_status?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsDateString() @IsOptional() visit_date?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsDateString() @IsOptional() visit_confirmation_date?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsUUID() @IsOptional() property_id?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsString() @IsOptional() notes?: string
}
