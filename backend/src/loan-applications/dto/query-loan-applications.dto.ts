import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { LOAN_APPLICATION_STATUSES } from './create-loan-application.dto.js';
import type { LoanApplicationStatus } from './create-loan-application.dto.js';

export class QueryLoanApplicationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be greater than 0' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be greater than 0' })
  limit: number = 10;

  @IsOptional()
  @IsIn(LOAN_APPLICATION_STATUSES, { message: `status must be one of: ${LOAN_APPLICATION_STATUSES.join(', ')}` })
  status?: LoanApplicationStatus;

  /** Inclusive lower bound on created_at, e.g. "2025-01-01". */
  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid ISO date (YYYY-MM-DD)' })
  from?: string;

  /** Inclusive upper bound on created_at, e.g. "2025-01-31". */
  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid ISO date (YYYY-MM-DD)' })
  to?: string;
}
