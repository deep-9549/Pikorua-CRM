import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateProfileDto {
  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  full_name: string

  @ApiPropertyOptional({ example: '+91 98765 43210', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string
}
