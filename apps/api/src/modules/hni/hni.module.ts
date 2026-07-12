import { Module } from '@nestjs/common'
import { HniController } from './hni.controller'
import { HniService } from './hni.service'

@Module({ controllers: [HniController], providers: [HniService] })
export class HniModule {}
