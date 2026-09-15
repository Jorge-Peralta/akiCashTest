import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('installment', (table) => {
    table.increments('id').primary();
    table
      .integer('loan_application_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('loan_application')
      .onDelete('CASCADE');
    table.date('due_date').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.boolean('paid').notNullable().defaultTo(false);

    // Supports the overdue-installments analytical query (Parte 2.3).
    table.index(['due_date', 'paid'], 'idx_installment_due_date_paid');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('installment');
}
