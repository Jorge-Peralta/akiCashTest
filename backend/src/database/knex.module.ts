import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import knexFactory from 'knex';
import type { Knex } from 'knex';

/** DI token used to inject the singleton Knex instance across the app. */
export const KNEX_CONNECTION = 'KNEX_CONNECTION';

/**
 * Global module exposing a single shared Knex connection via DI.
 * Being @Global() means any feature module can `@Inject(KNEX_CONNECTION)`
 * without explicitly importing this module.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KNEX_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Knex => {
        const connection = knexFactory({
          client: 'mysql2',
          connection: {
            host: configService.get<string>('DB_HOST', '127.0.0.1'),
            port: configService.get<number>('DB_PORT', 3306),
            user: configService.get<string>('DB_USER', 'root'),
            password: configService.get<string>('DB_PASSWORD', ''),
            database: configService.get<string>('DB_NAME', 'akicash'),
          },
          pool: { min: 0, max: 10 },
        });

        // Let Nest close the pool gracefully on app shutdown. Knex instances
        // don't implement OnModuleDestroy themselves, so we attach the hook
        // Nest looks for directly onto the instance it will inject.
        (connection as Knex & { onModuleDestroy?: () => Promise<void> }).onModuleDestroy = () =>
          connection.destroy();

        return connection;
      },
    },
  ],
  exports: [KNEX_CONNECTION],
})
export class KnexModule {}
