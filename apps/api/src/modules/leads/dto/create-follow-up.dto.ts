import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateFollowUpDto {
  @ApiProperty() @IsDateString() scheduled_at!: string
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() notes?: string
}
