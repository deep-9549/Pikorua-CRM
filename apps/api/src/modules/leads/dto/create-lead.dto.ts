import { IsString, IsOptional, IsEmail, IsEnum, IsArray, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

export class CreateLeadDto {
  @ApiProperty() @IsString() full_name: string
  @ApiProperty() @IsString() phone: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsEmail() @IsOptional() email?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsString() @IsOptional() city?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsString() @IsOptional() campaign_name?: string
  @ApiPropertyOptional() @Transform(emptyToUndefined) @IsString() @IsOptional() notes?: string
}
