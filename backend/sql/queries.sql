-- Parte 2 — Queries de analítica SQL.
-- Esquema: client, loan_application (FK client_id), installment (FK loan_application_id).

-- 1) Monto total desembolsado (status = 'approved') por cliente en un rango de fechas.
--    Reemplazá los dos placeholders con los valores reales (por ejemplo, vía una query
--    parametrizada en la app, o fechas literales si la corrés a mano).
SELECT
  c.id AS client_id,
  c.full_name,
  c.dni,
  SUM(la.requested_amount) AS total_disbursed
FROM client c
JOIN loan_application la ON la.client_id = c.id
WHERE la.status = 'approved'
  AND la.created_at >= :from_date   -- ej. '2026-01-01 00:00:00'
  AND la.created_at <= :to_date     -- ej. '2026-12-31 23:59:59'
GROUP BY c.id, c.full_name, c.dni
ORDER BY total_disbursed DESC;

-- 2) Los 5 clientes con mayor monto aprobado en lo que va del año.
SELECT
  c.id AS client_id,
  c.full_name,
  c.dni,
  SUM(la.requested_amount) AS total_approved
FROM client c
JOIN loan_application la ON la.client_id = c.id
WHERE la.status = 'approved'
  AND la.created_at >= DATE_FORMAT(CURDATE(), '%Y-01-01')
GROUP BY c.id, c.full_name, c.dni
ORDER BY total_approved DESC
LIMIT 5;

-- 3) Cuotas (installments) vencidas y no pagadas.
SELECT
  i.id AS installment_id,
  i.due_date,
  i.amount,
  la.id AS loan_application_id,
  la.client_id
FROM installment i
JOIN loan_application la ON la.id = i.loan_application_id
WHERE i.paid = FALSE
  AND i.due_date < CURDATE()
ORDER BY i.due_date ASC;

-- Nota sobre índices (query 3):
-- Ya existe un índice compuesto en installment(due_date, paid), creado en la
-- migración de `installment` (idx_installment_due_date_paid). Permite que
-- MySQL busque directamente las filas no pagadas ordenadas por due_date en
-- vez de escanear toda la tabla, lo cual importa cuando esta tabla tenga
-- millones de registros (una cuota por préstamo por mes, creciendo sin
-- límite, y los reportes de "atrasados" son una query muy frecuente).
-- El orden de las columnas importa: `paid` es booleano/de baja cardinalidad
-- (2 valores), así que NO debe ser la columna líder del índice o MySQL saca
-- poco provecho de él — poniendo `due_date` primero, el motor puede hacer un
-- range-scan de "due_date < CURDATE()" y usar `paid` como filtro secundario
-- dentro de ese rango, además de ya satisfacer el ORDER BY due_date sin un
-- filesort.
--
-- Nota sobre índices (queries 1 y 2):
-- Ambas dependen del índice compuesto en loan_application(status, created_at)
-- (ya presente en la migración de `loan_application`) para filtrar
-- `status = 'approved'` + el rango de fechas sin un full table scan, y del
-- índice de la FK loan_application.client_id para que el JOIN con `client`
-- sea una búsqueda por índice en vez de un escaneo.
