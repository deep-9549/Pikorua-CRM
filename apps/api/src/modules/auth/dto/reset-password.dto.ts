import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @ApiProperty({ description: 'One-time token from the verification email' })
  @IsString()
  @MinLength(43)
  @MaxLength(43)
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Reset token is invalid' })
  token: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'New password must include uppercase, lowercase, and a number',
  })
  new_password: string
}
