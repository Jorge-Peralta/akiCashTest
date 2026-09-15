import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Big from 'big.js';
import type { Knex } from 'knex';
import { ClientsService } from '../clients/clients.service.js';
import { KNEX_CONNECTION } from '../database/knex.module.js';
import { CreateLoanApplicationDto, LoanApplicationStatus } from './dto/create-loan-application.dto.js';
import { QueryLoanApplicationsDto } from './dto/query-loan-applications.dto.js';

export interface LoanApplication {
  id: number;
  client_id: number;
  requested_amount: string;
  term_months: number;
  status: LoanApplicationStatus;
  created_at: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface InstallmentInsert {
  loan_application_id: number;
  due_date: string;
  amount: number;
  paid: boolean;
}

@Injectable()
export class LoanApplicationsService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly clientsService: ClientsService,
  ) {}

  async findAll(query: QueryLoanApplicationsDto): Promise<PaginatedResult<LoanApplication>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const baseQuery = this.knex<LoanApplication>('loan_application');

    if (query.status) {
      baseQuery.where('status', query.status);
    }
    if (query.from) {
      baseQuery.where('created_at', '>=', `${query.from} 00:00:00`);
    }
    if (query.to) {
      baseQuery.where('created_at', '<=', `${query.to} 23:59:59`);
    }

    const [data, countRow] = await Promise.all([
      baseQuery.clone().select('*').orderBy('created_at', 'desc').limit(limit).offset(offset),
      baseQuery.clone().count<{ count: string }[]>({ count: '*' }).first(),
    ]);

    return {
      data,
      total: Number(countRow?.count ?? 0),
      page,
      limit,
    };
  }

  async create(dto: CreateLoanApplicationDto): Promise<LoanApplication> {
    return this.knex.transaction(async (trx) => {
      const client = await this.clientsService.findById(dto.client_id, trx);
      if (!client) {
        throw new NotFoundException(`Client with id ${dto.client_id} was not found`);
      }

      const status: LoanApplicationStatus = dto.status ?? 'pending';
      const createdAt = new Date();

      const [id] = await trx('loan_application').insert({
        client_id: dto.client_id,
        requested_amount: dto.requested_amount,
        term_months: dto.term_months,
        status,
        created_at: createdAt,
      });

      if (status === 'approved') {
        const installments = this.buildInstallments(
          dto.requested_amount,
          dto.term_months,
          id,
          createdAt,
        );
        await trx('installment').insert(installments);
      }

      const loanApplication = await trx<LoanApplication>('loan_application').where({ id }).first();
      return loanApplication as LoanApplication;
    });
  }

  /**
   * Splits `requestedAmount` into `termMonths` equal installments.
   *
   * Rounding approach: done with `big.js`, not native `number` arithmetic.
   * IEEE-754 floats can't represent most decimals exactly (e.g. `0.57 / 3`
   * evaluates to `0.18999999999999997`), which previously caused
   * `Math.floor(x * 100) / 100` to truncate a full cent too low on ~0.7% of
   * amount/term combinations — a real, silent, per-installment money bug,
   * not just a display-rounding nitpick. `Big` does the division and
   * rounding in exact decimal arithmetic instead.
   *
   * Each installment is `requestedAmount / termMonths` rounded DOWN to 2
   * decimals, so no installment ever exceeds its fair share. Whatever
   * remainder is left over from that truncation (only non-zero when the
   * division doesn't split evenly, e.g. 1000 / 3 = 333.333...) is added onto
   * the LAST installment, so the sum of all installments always equals
   * `requestedAmount` exactly.
   *
   * Due dates are spaced monthly, starting exactly one month after the loan
   * application's `created_at`.
   */
  private buildInstallments(
    requestedAmount: number,
    termMonths: number,
    loanApplicationId: number,
    createdAt: Date,
  ): InstallmentInsert[] {
    const total = new Big(requestedAmount);
    const baseAmount = total.div(termMonths).round(2, Big.roundDown);
    const remainder = total.minus(baseAmount.times(termMonths));

    return Array.from({ length: termMonths }, (_, index) => {
      const dueDate = new Date(createdAt);
      dueDate.setMonth(dueDate.getMonth() + index + 1);

      const isLastInstallment = index === termMonths - 1;
      const amount = (isLastInstallment ? baseAmount.plus(remainder) : baseAmount).toNumber();

      return {
        loan_application_id: loanApplicationId,
        due_date: dueDate.toISOString().slice(0, 10),
        amount,
        paid: false,
      };
    });
  }
}
