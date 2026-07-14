import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CompleteFollowUpDto {
  @ApiPropertyOptional() @IsString() @MaxLength(4000) @IsOptional() remarks?: string
}
