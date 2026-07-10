import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateLeadDto {
  // Stored in DB
  @ApiPropertyOptional() @IsString() @IsOptional() call_status?: string
  @ApiPropertyOptional({ enum: ['customer_busy', 'wrong_number', 'out_of_reach', 'did_not_pickup'] })
  @IsEnum(['customer_busy', 'wrong_number', 'out_of_reach', 'did_not_pickup']) @IsOptional() not_spoken_reason?: string
  @ApiPropertyOptional() @IsString() @IsOptional() hwc?: string
  @ApiPropertyOptional() @IsString() @IsOptional() follow_up_date?: string
  @ApiPropertyOptional() @IsBoolean() @IsOptional() follow_up_done?: boolean
  @ApiPropertyOptional() @IsString() @IsOptional() follow_up_remarks?: string
  @ApiPropertyOptional() @IsString() @IsOptional() buying_status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() site_visit_status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() budget_range?: string
  @ApiPropertyOptional() @IsString() @IsOptional() profession?: string
  @ApiPropertyOptional() @IsString() @IsOptional() company_name?: string
  @ApiPropertyOptional() @IsString() @IsOptional() current_city?: string
  @ApiPropertyOptional() @IsString() @IsOptional() current_area?: string
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() preferred_locations?: string[]

  // Frontend-only fields — accepted to avoid 400, not persisted
  @ApiPropertyOptional() @IsString() @IsOptional() first_call_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() last_call_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() visit_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() visit_confirmation_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() project_name?: string
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() configuration?: string[]
  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string
}
