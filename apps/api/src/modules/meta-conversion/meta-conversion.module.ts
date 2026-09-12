import { Module } from '@nestjs/common'
import { MetaConversionService } from './meta-conversion.service'

@Module({
  providers: [MetaConversionService],
  exports: [MetaConversionService],
})
export class MetaConversionModule {}
