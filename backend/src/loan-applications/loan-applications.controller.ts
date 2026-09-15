import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto.js';
import { QueryLoanApplicationsDto } from './dto/query-loan-applications.dto.js';
import { LoanApplicationsService } from './loan-applications.service.js';

@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(private readonly loanApplicationsService: LoanApplicationsService) {}

  @Get()
  findAll(@Query() query: QueryLoanApplicationsDto) {
    return this.loanApplicationsService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateLoanApplicationDto) {
    return this.loanApplicationsService.create(dto);
  }
}
