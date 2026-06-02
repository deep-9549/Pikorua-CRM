import { IsEnum, IsString, IsNumber, IsOptional, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateSiteVisitDto {
  @ApiPropertyOptional({ enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  @IsEnum(['scheduled', 'completed', 'cancelled', 'no_show'])
  @IsOptional()
  status?: string

  @ApiPropertyOptional() @IsString() @IsOptional() feedback?: string
  @ApiPropertyOptional() @IsNumber() @Min(1) @Max(5) @IsOptional() rating?: number
}
