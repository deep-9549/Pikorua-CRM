import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SendMessageDto {
  @ApiProperty() @IsUUID() conversation_id: string
  @ApiProperty() @IsString() content: string
  @ApiPropertyOptional() @IsEnum(['text', 'image', 'document', 'voice', 'location']) @IsOptional() type?: string
}
