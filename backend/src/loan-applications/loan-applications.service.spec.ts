import type { Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientsService } from '../clients/clients.service.js';
import { KNEX_CONNECTION } from '../database/knex.module.js';
import { LoanApplicationsService } from './loan-applications.service.js';

/**
 * Unit test (not e2e) chosen deliberately: it mocks the Knex transaction so
 * it runs anywhere with no MySQL instance required, while still exercising
 * the real business logic in LoanApplicationsService.create — the 404 check
 * happening inside the transaction, and installment generation on approval.
 * See backend/README.md "Testing strategy" for the full rationale.
 */
describe('LoanApplicationsService', () => {
  let service: LoanApplicationsService;
  let clientsService: { findById: Mock };
  let knex: { transaction: Mock };
  let trx: Mock;

  const buildTableMock = () => ({
    where: vi.fn().mockReturnThis(),
    first: vi.fn(),
    insert: vi.fn(),
  });

  beforeEach(async () => {
    clientsService = { findById: vi.fn() };
    trx = vi.fn();
    knex = {
      transaction: vi.fn((callback: (trx: unknown) => Promise<unknown>) => callback(trx)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoanApplicationsService,
        { provide: ClientsService, useValue: clientsService },
        { provide: KNEX_CONNECTION, useValue: knex },
      ],
    }).compile();

    service = moduleRef.get(LoanApplicationsService);
  });

  it('throws NotFoundException when the client does not exist (maps to HTTP 404)', async () => {
    clientsService.findById.mockResolvedValue(undefined);

    await expect(
      service.create({ client_id: 999, requested_amount: 1000, term_months: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(clientsService.findById).toHaveBeenCalledWith(999, trx);
  });

  it('creates the loan_application and generates equal installments when status is approved', async () => {
    clientsService.findById.mockResolvedValue({
      id: 1,
      full_name: 'Jane Doe',
      dni: '12345678',
      monthly_income: '2000.00',
    });

    const loanApplicationTable = buildTableMock();
    loanApplicationTable.insert.mockResolvedValue([42]);
    loanApplicationTable.first.mockResolvedValue({ id: 42, client_id: 1, status: 'approved' });

    const installmentTable = buildTableMock();
    installmentTable.insert.mockResolvedValue([1]);

    trx.mockImplementation((table: string) => {
      if (table === 'loan_application') return loanApplicationTable;
      if (table === 'installment') return installmentTable;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await service.create({
      client_id: 1,
      requested_amount: 1000,
      term_months: 3,
      status: 'approved',
    });

    expect(loanApplicationTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 1,
        requested_amount: 1000,
        term_months: 3,
        status: 'approved',
      }),
    );

    expect(installmentTable.insert).toHaveBeenCalledTimes(1);
    const insertedInstallments = installmentTable.insert.mock.calls[0][0] as Array<{
      loan_application_id: number;
      amount: number;
      paid: boolean;
      due_date: string;
    }>;

    expect(insertedInstallments).toHaveLength(3);
    expect(insertedInstallments.every((i) => i.loan_application_id === 42)).toBe(true);
    expect(insertedInstallments.every((i) => i.paid === false)).toBe(true);

    // 1000 / 3 doesn't divide evenly: 333.33 + 333.33 + 333.34 must sum back to 1000 exactly.
    const total = insertedInstallments.reduce((sum, i) => sum + i.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(1000);
    expect(insertedInstallments[0].amount).toBe(333.33);
    expect(insertedInstallments[2].amount).toBe(333.34);

    expect(result).toEqual({ id: 42, client_id: 1, status: 'approved' });
  });

  it('splits amounts correctly even where native floating-point math would truncate a cent too low', async () => {
    // 0.57 / 3 === 0.18999999999999997 in IEEE-754, which previously made
    // Math.floor(x * 100) / 100 produce 0.18 instead of 0.19 for every
    // installment. big.js does the division in exact decimal arithmetic.
    clientsService.findById.mockResolvedValue({ id: 1, full_name: 'Jane Doe', dni: '1', monthly_income: '1' });

    const loanApplicationTable = buildTableMock();
    loanApplicationTable.insert.mockResolvedValue([99]);
    loanApplicationTable.first.mockResolvedValue({ id: 99, client_id: 1, status: 'approved' });

    const installmentTable = buildTableMock();
    installmentTable.insert.mockResolvedValue([1]);

    trx.mockImplementation((table: string) => {
      if (table === 'loan_application') return loanApplicationTable;
      if (table === 'installment') return installmentTable;
      throw new Error(`Unexpected table: ${table}`);
    });

    await service.create({ client_id: 1, requested_amount: 0.57, term_months: 3, status: 'approved' });

    const insertedInstallments = installmentTable.insert.mock.calls[0][0] as Array<{ amount: number }>;
    expect(insertedInstallments.map((i) => i.amount)).toEqual([0.19, 0.19, 0.19]);
  });

  it('does not generate installments when status is pending (default)', async () => {
    clientsService.findById.mockResolvedValue({ id: 1, full_name: 'Jane Doe', dni: '1', monthly_income: '1' });

    const loanApplicationTable = buildTableMock();
    loanApplicationTable.insert.mockResolvedValue([7]);
    loanApplicationTable.first.mockResolvedValue({ id: 7, client_id: 1, status: 'pending' });

    const installmentTable = buildTableMock();

    trx.mockImplementation((table: string) => {
      if (table === 'loan_application') return loanApplicationTable;
      if (table === 'installment') return installmentTable;
      throw new Error(`Unexpected table: ${table}`);
    });

    await service.create({ client_id: 1, requested_amount: 500, term_months: 6 });

    expect(installmentTable.insert).not.toHaveBeenCalled();
  });
});
