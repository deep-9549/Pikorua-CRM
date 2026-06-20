import { IsEnum, IsString, IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateSiteVisitDto {
  @ApiPropertyOptional({ enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  @IsEnum(['scheduled', 'completed', 'cancelled', 'no_show'])
  @IsOptional()
  status?: string

  @ApiPropertyOptional() @IsString() @IsOptional() feedback?: string
  @ApiPropertyOptional() @IsNumber() @Min(1) @Max(5) @IsOptional() rating?: number
  @ApiPropertyOptional({ enum: ['visit_done', 'visit_rescheduled', 'visit_cancelled'] })
  @IsEnum(['visit_done', 'visit_rescheduled', 'visit_cancelled']) @IsOptional() outcome?: string
  @ApiPropertyOptional() @IsDateString() @IsOptional() rescheduled_date?: string
  @ApiPropertyOptional() @IsString() @IsOptional() cancellation_reason?: string
  @ApiPropertyOptional() @IsDateString() @IsOptional() follow_up_date?: string
}
