import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class CompleteFollowUpDto {
  @ApiProperty({ enum: ['spoken', 'not_spoken'] })
  @IsIn(['spoken', 'not_spoken']) call_status!: 'spoken' | 'not_spoken'
  @ApiPropertyOptional() @IsString() @MaxLength(4000) @IsOptional() remarks?: string
}
