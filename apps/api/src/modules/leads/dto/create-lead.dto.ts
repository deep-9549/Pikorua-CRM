import { IsString, IsOptional, IsEmail, IsEnum, IsArray, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLeadDto {
  @ApiProperty() @IsString() full_name: string
  @ApiProperty() @IsString() phone: string
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string
  @ApiPropertyOptional() @IsString() @IsOptional() campaign_name?: string
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string
}
