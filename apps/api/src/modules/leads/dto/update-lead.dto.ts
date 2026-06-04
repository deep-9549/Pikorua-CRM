import { IsString, IsOptional, IsArray } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateLeadDto {
  // Stored in DB
  @ApiPropertyOptional() @IsString() @IsOptional() call_status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() hwc?: string
  @ApiPropertyOptional() @IsString() @IsOptional() follow_up_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() buying_status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() site_visit_status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() budget_range?: string
  @ApiPropertyOptional() @IsString() @IsOptional() profession?: string
  @ApiPropertyOptional() @IsString() @IsOptional() current_city?: string
  @ApiPropertyOptional() @IsString() @IsOptional() current_area?: string

  // Frontend-only fields — accepted to avoid 400, not persisted
  @ApiPropertyOptional() @IsString() @IsOptional() first_call_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() last_call_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() visit_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() visit_confirmation_date?: string
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() configuration?: string[]
  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string
}
