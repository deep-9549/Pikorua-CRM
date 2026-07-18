import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, MaxLength } from 'class-validator'

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@pikorua.in' })
  @IsEmail()
  @MaxLength(254)
  email: string
}
