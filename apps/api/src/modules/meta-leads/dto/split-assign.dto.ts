import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SplitAssignDto {
  @ApiProperty({ type: [String], description: 'Unassigned lead IDs to distribute' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  lead_ids: string[]

  @ApiProperty({ type: [String], description: 'Sales executive IDs to split the leads between' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  assigned_to_ids: string[]
}
