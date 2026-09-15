import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { LoanApplicationsController } from './loan-applications.controller.js';
import { LoanApplicationsService } from './loan-applications.service.js';

@Module({
  imports: [ClientsModule],
  controllers: [LoanApplicationsController],
  providers: [LoanApplicationsService],
})
export class LoanApplicationsModule {}
