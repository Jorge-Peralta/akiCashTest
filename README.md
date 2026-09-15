# AkiCash — Solicitudes de Crédito (Prueba Técnica)

Sistema mini de "Solicitudes de crédito": backend con NestJS + Knex (MySQL) y
frontend con Vite + React.

## Estructura

- [`backend/`](./backend) — API con NestJS y migraciones de Knex
- [`frontend/`](./frontend) — Cliente con Vite + React
- [`backend/sql/queries.sql`](./backend/sql/queries.sql) — consultas SQL de analítica (Parte 2): monto desembolsado por cliente, top 5 clientes por monto aprobado, cuotas atrasadas + notas de índices

## Configuración

```bash
# 1. MySQL (Docker)
docker compose up -d mysql   # mysql:8.0 en 127.0.0.1:3306, root/root, db "akicash"

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run migrate
npm run start:dev            # http://localhost:3000

# 3. Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:5173
```

Corré los tests del backend con `npm test` (dentro de `backend/`) — no requieren
base de datos, el test del flujo de creación mockea la transacción de Knex.

## Decisiones

- **Monorepo**, `backend/` + `frontend/`, sin repos separados.
- `status` modelado como un `ENUM` nativo de MySQL.
- Índices agregados además de las PKs/FKs: único en `client.dni`, compuesto en
  `loan_application(status, created_at)`, compuesto en
  `installment(due_date, paid)`.
- No hay endpoint `POST/GET /clients` (fuera de alcance del enunciado) — el
  formulario de creación toma un `client_id` en crudo.
- Redondeo de cuotas hecho con `big.js`, no con `number` nativo, para evitar
  errores de punto flotante en montos de dinero (detalle en `backend/README.md`).
- Test unitario (no e2e) para `LoanApplicationsService.create`, mockeando la
  transacción de Knex.
- CORS habilitado en el backend (`app.enableCors()`) para desarrollo local con
  el frontend en otro puerto.

## Preguntas de criterio

**¿Cuándo usarías una transacción con Knex en este ejercicio, y en qué parte del flujo la aplicarías?**

La uso en el POST de `/loan-applications`, que es el único endpoint donde hago más de un INSERT que tienen que vivir o morir juntos. Ahí primero valido que el cliente exista, después inserto la solicitud, y si viene con `status: 'approved'` genero las cuotas. Si cualquiera de esos pasos falla — el cliente no existe, o algo raro pasa insertando las cuotas — no quiero terminar con una solicitud a medias sin su plan de pagos, o peor, cuotas huérfanas apuntando a una solicitud que nunca se creó. Por eso todo el bloque va dentro de un `trx`: o se guarda todo, o no se guarda nada.

**¿Qué diferencia práctica hay entre un Guard y un Interceptor en NestJS?**

Para mí la diferencia está en el momento en que actúan y en qué controlan. El Guard corre antes de que el handler se ejecute, y su trabajo es decidir si la request puede pasar o no — es básicamente un portero: true/false, o lanza una excepción. Se usa para auth, roles, permisos, ese tipo de cosas.

El Interceptor en cambio envuelve toda la ejecución, antes y después del handler. Puede tocar lo que entra, dejar que el handler haga lo suyo, y después meterle mano a la respuesta antes de que salga (loguear tiempos, transformar el shape de la respuesta, cachear, mapear errores), usando los operadores de RxJS sobre el Observable que retorna. En resumen: el Guard decide si entrás, el Interceptor decide qué pasa con lo que entra y con lo que sale.

**¿Qué harías para evitar que la tabla de solicitudes en React se re-renderice innecesariamente al escribir en el buscador?**

Es justo lo que hice en este proyecto. Primero, el filtro tiene su propio estado y no dispara el fetch en cada tecla — pasa por un hook de debounce (`useDebouncedValue`) para que la llamada a la API solo se dispare cuando el usuario deja de escribir un rato (le puse 400ms). Segundo, separo el estado del filtro del estado de los datos de la tabla, así escribir no toca las props de la tabla hasta que el valor debounced realmente cambia. Y tercero, envuelvo la tabla y las filas en `React.memo`, con los callbacks (`onPageChange`, `onRetry`, etc.) memoizados con `useCallback`, para que si el componente padre se re-renderiza por otra razón, React no vuelva a renderizar toda la tabla si sus props no cambiaron de verdad.
