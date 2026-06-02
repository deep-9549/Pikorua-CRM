import { IsUUID, IsArray, ArrayMinSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BulkAssignDto {
  @ApiProperty({ type: [String], description: 'Lead IDs to assign' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  lead_ids: string[]

  @ApiProperty({ description: 'User ID to assign leads to' })
  @IsUUID()
  assigned_to: string
}
