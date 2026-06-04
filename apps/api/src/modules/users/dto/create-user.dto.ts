import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { USER_ROLES, UserRole } from '../../../common/constants/roles'

export class CreateUserDto {
  @ApiProperty() @IsString() full_name: string
  @ApiProperty() @IsEmail() email: string
  @ApiProperty() @IsString() @MinLength(8) password: string
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string
  @ApiProperty({ enum: USER_ROLES })
  @IsIn(USER_ROLES)
  role: UserRole
}
