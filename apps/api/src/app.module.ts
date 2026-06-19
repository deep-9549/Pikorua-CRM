import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
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
import { ImportModule } from './modules/import/import.module'
import { validateEnv } from './common/config/env.validation'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnv }),
    // Global rate limiting: 100 requests / minute per IP by default. Sensitive
    // endpoints (e.g. login) tighten this further with the @Throttle decorator.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply the throttler globally so every route is rate limited by default.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
