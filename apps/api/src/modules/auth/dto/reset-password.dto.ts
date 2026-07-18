import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @ApiProperty({ description: 'One-time token from the verification email' })
  @IsString()
  @MinLength(40)
  @MaxLength(200)
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
