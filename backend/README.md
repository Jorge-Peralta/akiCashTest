# AkiCash Backend — API de Solicitudes de Crédito

NestJS + Knex (sin ORM) + MySQL. Implementa la Parte 1 de la prueba técnica:
`GET /loan-applications` (paginado, filtrable) y `POST /loan-applications`
(creación transaccional con generación opcional de cuotas).


## Requisitos

- Node.js 20+
- Una instancia de MySQL 8.x accesible desde esta máquina. Hay un
  `docker-compose.yml` en la raíz del repo que levanta una:

```bash
cd ..                  # raíz del repo
docker compose up -d mysql
```

Esto levanta `mysql:8.0` en `127.0.0.1:3306` con `root`/`root` y una base de
datos `akicash` pre-creada (coincide con `.env.example` — no hace falta hacer
`CREATE DATABASE` manualmente).

## Variables de entorno

Copiá `.env.example` a `.env` y ajustá lo que necesites:

```bash
cp .env.example .env
```

| Variable      | Descripción                                  | Valor por defecto |
| ------------- | --------------------------------------------- | ------------------ |
| `PORT`        | Puerto HTTP de la app Nest                    | `3000`      |
| `DB_HOST`     | Host de MySQL                                 | `127.0.0.1` |
| `DB_PORT`     | Puerto de MySQL                               | `3306`      |
| `DB_USER`     | Usuario de MySQL                              | `root`      |
| `DB_PASSWORD` | Contraseña de MySQL                           | `root`      |
| `DB_NAME`     | Nombre de la base de datos MySQL              | `akicash`   |

Tanto la Knex CLI (`src/database/knexfile.ts`) como el `KnexModule` de Nest
(`src/database/knex.module.ts`, vía `@nestjs/config`) leen estas mismas
variables.

## Instalación

```bash
npm install
```

## Migraciones

```bash
npm run migrate            # knex migrate:latest
npm run migrate:rollback   # knex migrate:rollback
npm run migrate:make       # knex migrate:make --knexfile ... -x ts (genera una nueva migración)
```

Las migraciones viven en `src/database/migrations/` y crean, en orden:
`client`, `loan_application` (FK → `client`), `installment`
(FK → `loan_application`). Índices: único en `client.dni`, compuesto en
`loan_application(status, created_at)`, compuesto en
`installment(due_date, paid)`.

## Ejecución

```bash
npm run start:dev
```

## API

### `GET /loan-applications?page=&limit=&status=&from=&to=`

- `page` (default `1`), `limit` (default `10`) — paginación.
- `status` — opcional, uno de `pending` | `approved` | `rejected`.
- `from` / `to` — opcional, fecha ISO (`YYYY-MM-DD`), filtro de rango
  inclusivo sobre `created_at`.
- Devuelve `{ data, total, page, limit }`.
- Construido enteramente con el query builder de Knex (`.where()`,
  `.select()`, `.limit()`, `.offset()`, `.count()`) — **no se usa
  `knex.raw`** en ningún lugar de este código.

### `POST /loan-applications`

Body: `client_id` (requerido, entero), `requested_amount` (requerido, número
> 0), `term_months` (requerido, entero > 0), `status` (opcional, por defecto
`pending`).

Todo validado vía `class-validator` sobre `CreateLoanApplicationDto` a través
del `ValidationPipe` global (`whitelist: true, forbidNonWhitelisted: true,
transform: true`) — campos desconocidos, montos negativos/cero,
`term_months` no entero, y valores de `status` inválidos son todos
rechazados con `400`.

La lógica de negocio corre dentro de **una sola transacción de Knex**:

1. Busca al cliente (`trx('client').where({ id: client_id }).first()`). Si no
   existe, lanza `NotFoundException` → `404` (capturado y mapeado por el
   filtro de excepciones global, no se traga en un `500`).
2. Inserta la fila de `loan_application`.
3. Si `status === 'approved'`, genera `term_months` filas de cuotas.
4. Hace commit si todo sale bien; Knex hace rollback automático de toda la
   transacción si cualquier paso lanza una excepción.

**Redondeo de cuotas**: hecho con [`big.js`](https://github.com/MikeMcl/big.js),
no con aritmética nativa de `number` (el punto flotante IEEE-754 puede
truncar un centavo de más en montos que no dividen exacto, p. ej. `0.57 / 3`).
Cada cuota es `requested_amount / term_months` redondeado hacia abajo a 2
decimales; el remanente de una división no exacta se suma a la **última**
cuota, así la suma siempre coincide exactamente con `requested_amount`.
Fechas de vencimiento espaciadas mensualmente, empezando un mes después del
`created_at` de la solicitud.

## Manejo de errores

`src/common/filters/http-exception.filter.ts` está registrado globalmente
(`app.useGlobalFilters(...)` en `main.ts`) y normaliza toda respuesta a:

```json
{ "statusCode": 404, "message": "...", "error": "NotFoundException", "path": "...", "timestamp": "..." }
```

Las subclases de `HttpException` (p. ej. `NotFoundException`, errores de
validación) conservan su código de estado real; cualquier otra cosa se
mapea a `500` sin filtrar detalles internos del error.

## Estrategia de pruebas

**Test unitario** sobre `LoanApplicationsService.create`
(`src/loan-applications/loan-applications.service.spec.ts`), mockeando la
transacción de Knex, por sobre un test e2e/supertest — corre sin necesitar
una instancia real de MySQL, y cubre las dos piezas más riesgosas del
servicio: el chequeo de 404 dentro de la transacción y la generación/redondeo
de cuotas al aprobar.

Cubre: (a) el happy path con `status: 'approved'` genera las cuotas
correctas; (b) `404` cuando el cliente no existe; (c) que no se generen
cuotas cuando `status` se queda en `pending`.

```bash
npm test          # vitest run
npm run test:cov  # vitest run --coverage
```
