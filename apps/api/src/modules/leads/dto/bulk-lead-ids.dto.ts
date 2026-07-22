import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BulkLeadIdsDto {
  @ApiProperty({ type: [String], description: 'Lead IDs to update' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  lead_ids: string[]
}
