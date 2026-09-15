import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export type LoanApplicationStatus = 'pending' | 'approved' | 'rejected';

export const LOAN_APPLICATION_STATUSES: LoanApplicationStatus[] = ['pending', 'approved', 'rejected'];

export class CreateLoanApplicationDto {
  @IsInt({ message: 'client_id must be an integer' })
  @Type(() => Number)
  client_id!: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'requested_amount must be a number with up to 2 decimals' })
  @IsPositive({ message: 'requested_amount must be greater than 0' })
  @Type(() => Number)
  requested_amount!: number;

  @IsInt({ message: 'term_months must be an integer' })
  @Min(1, { message: 'term_months must be greater than 0' })
  @Type(() => Number)
  term_months!: number;

  @IsOptional()
  @IsIn(LOAN_APPLICATION_STATUSES, { message: `status must be one of: ${LOAN_APPLICATION_STATUSES.join(', ')}` })
  status?: LoanApplicationStatus;
}
