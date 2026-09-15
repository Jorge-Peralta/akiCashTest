# AkiCash Frontend — Solicitudes de Crédito

Cliente Vite + React + TypeScript para la API de solicitudes de crédito.

## Configuración

```bash
cd frontend
npm install
cp .env.example .env.local   # ajustá VITE_API_BASE_URL si el backend no está en localhost:3000
npm run dev
```

Build para producción:

```bash
npm run build
```

El backend debe estar corriendo (`cd ../backend && npm run start:dev`) y accesible en `VITE_API_BASE_URL`.

## Estructura

```
src/
  api/loanApplications.ts        fetch wrapper, request/response tipados, ApiError con el body del backend parseado
  hooks/useDebouncedValue.ts     hook de debounce genérico
  lib/statusLabels.ts            mapeo de status a etiquetas en español (solo display)
  lib/errorMessages.ts           mapeo de mensajes de validación conocidos del backend a español
  components/
    LoanApplicationsTable.tsx    estados de loading/error/vacío, filas memoizadas
    StatusFilter.tsx             <select> de status, memoizado
    Pagination.tsx                Prev/Next + indicador de página, memoizado
    CreateLoanApplicationForm.tsx  estado local del formulario, renderizado inline de errores de la API
  App.tsx                        conecta el estado, el efecto de fetch y los componentes entre sí
```

Estilos con Tailwind CSS (vía `@tailwindcss/vite`, sin librería de componentes).
