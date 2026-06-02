import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AssignLeadDto {
  @ApiProperty({ description: 'User ID to assign the lead to' })
  @IsUUID()
  assigned_to: string
}
