import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { LeadsModule } from './modules/leads/leads.module'
import { MetaLeadsModule } from './modules/meta-leads/meta-leads.module'
import { EmployeesModule } from './modules/employees/employees.module'
import { PropertiesModule } from './modules/properties/properties.module'
import { ClientsModule } from './modules/clients/clients.module'
import { WhatsappModule } from './modules/whatsapp/whatsapp.module'
import { SiteVisitsModule } from './modules/site-visits/site-visits.module'
import { BookingsModule } from './modules/bookings/bookings.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    MetaLeadsModule,
    EmployeesModule,
    PropertiesModule,
    ClientsModule,
    WhatsappModule,
    SiteVisitsModule,
    BookingsModule,
    DashboardModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
