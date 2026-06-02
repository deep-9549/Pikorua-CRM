import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiProperty() @IsString() full_name: string
  @ApiProperty() @IsEmail() email: string
  @ApiProperty() @IsString() @MinLength(8) password: string
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string
  @ApiProperty({ enum: ['super_admin', 'admin', 'sales_executive', 'viewer'] })
  @IsEnum(['super_admin', 'admin', 'sales_executive', 'viewer'])
  role: string
}
