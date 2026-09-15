import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('client', (table) => {
    table.increments('id').primary();
    table.string('full_name', 255).notNullable();
    table.string('dni', 32).notNullable();
    table.decimal('monthly_income', 12, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Business identifier must be unique.
    table.unique(['dni'], { indexName: 'uq_client_dni' });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client');
}
