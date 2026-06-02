import { IsString, IsEnum, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLeadNoteDto {
  @ApiProperty() @IsString() content: string
  @ApiPropertyOptional() @IsEnum(['call', 'meeting', 'general', 'follow_up']) @IsOptional() type?: string
}
