import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('loan_application', (table) => {
    table.increments('id').primary();
    table
      .integer('client_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('client')
      .onDelete('CASCADE');
    table.decimal('requested_amount', 12, 2).notNullable();
    table.integer('term_months').unsigned().notNullable();
    // Native MySQL ENUM column (fixed, small set of values — no lookup table needed).
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Supports GET /loan-applications filtering by status + created_at range.
    table.index(['status', 'created_at'], 'idx_loan_application_status_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('loan_application');
}
