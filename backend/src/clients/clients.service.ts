import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/knex.module.js';

export interface Client {
  id: number;
  full_name: string;
  dni: string;
  monthly_income: string;
  created_at: Date;
}

@Injectable()
export class ClientsService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Looks up a client by id. Accepts an optional transaction so callers
   * (e.g. LoanApplicationsService.create) can run the existence check inside
   * the same `trx` used for the insert, avoiding a TOCTOU race.
   */
  findById(id: number, trx?: Knex.Transaction): Promise<Client | undefined> {
    const queryRunner = trx ?? this.knex;
    return queryRunner<Client>('client').where({ id }).first();
  }
}
