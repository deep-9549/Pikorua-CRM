import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength } from 'class-validator'

export class UpdateWhatsappTemplateDto {
  @ApiProperty({
    example: 'Hi {{lead_name}}, this is {{my_name}}. It was a pleasure talking to you.',
    description:
      'Thank-you message pre-filled into WhatsApp Web. Supports the {{lead_name}}, {{my_name}} and {{my_phone}} placeholders. An empty string resets to the default template.',
  })
  @IsString()
  // WhatsApp itself accepts far more, but the message travels as a URL query
  // parameter — keep it well inside what browsers reliably handle.
  @MaxLength(2000)
  template: string
}
