import { IsString, IsOptional, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateLeadDto {
  @ApiPropertyOptional() @IsEnum(['spoken', 'not_spoken', 'call_back_later']) @IsOptional() call_status?: string
  @ApiPropertyOptional() @IsEnum(['hot', 'warm', 'cold']) @IsOptional() hwc?: string
  @ApiPropertyOptional() @IsString() @IsOptional() follow_up_date?: string
  @ApiPropertyOptional() @IsEnum(['ready', 'exploring', 'not_ready']) @IsOptional() buying_status?: string
  @ApiPropertyOptional() @IsEnum(['scheduled', 'completed', 'not_scheduled']) @IsOptional() site_visit_status?: string
  @ApiPropertyOptional() @IsString() @IsOptional() budget_range?: string
  @ApiPropertyOptional() @IsString() @IsOptional() profession?: string
  @ApiPropertyOptional() @IsString() @IsOptional() current_city?: string
  @ApiPropertyOptional() @IsString() @IsOptional() current_area?: string
}
