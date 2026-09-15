import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from './clients/clients.module.js';
import { KnexModule } from './database/knex.module.js';
import { LoanApplicationsModule } from './loan-applications/loan-applications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    KnexModule,
    ClientsModule,
    LoanApplicationsModule,
  ],
})
export class AppModule {}
