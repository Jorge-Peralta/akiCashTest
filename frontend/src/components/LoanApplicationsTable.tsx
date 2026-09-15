import { memo } from 'react'
import type { LoanApplication } from '../api/loanApplications'
import { STATUS_LABELS_ES } from '../lib/statusLabels'

interface LoanApplicationsTableProps {
  data: LoanApplication[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

function formatAmount(amount: string): string {
  const parsed = Number(amount)
  if (Number.isNaN(parsed)) return amount
  return parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

const STATUS_BADGE_STYLES: Record<LoanApplication['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

interface RowProps {
  loanApplication: LoanApplication
}

// Memoized per-row so that a re-render of the table (e.g. a new page of
// data) doesn't force React to re-diff every cell of every row that
// hasn't actually changed — each row only re-renders if its own object
// reference changes.
const LoanApplicationRow = memo(function LoanApplicationRow({ loanApplication }: RowProps) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{loanApplication.id}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{loanApplication.client_id}</td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-900">
        {formatAmount(loanApplication.requested_amount)}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">{loanApplication.term_months}</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[loanApplication.status]}`}
        >
          {STATUS_LABELS_ES[loanApplication.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(loanApplication.created_at)}</td>
    </tr>
  )
})

/**
 * Wrapped in React.memo: this component only takes `data`, `loading`,
 * `error`, and `onRetry` as props. As long as callers keep `onRetry`
 * stable (useCallback) and don't recreate `data` unnecessarily, typing in
 * sibling inputs (the status select, the create-application form fields)
 * never re-renders this table, because none of those keystrokes touch the
 * props this component actually receives — their state is local to their
 * own components. The debounce on the status filter additionally means
 * `data` itself only changes once per settled filter value, not per
 * keystroke/selection change.
 */
function LoanApplicationsTableComponent({ data, loading, error, onRetry }: LoanApplicationsTableProps) {
  if (loading) {
    return <div className="px-4 py-16 text-center text-sm text-gray-500">Cargando solicitudes de crédito...</div>
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-sm font-medium text-red-700">No se pudieron cargar las solicitudes: {error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="px-4 py-16 text-center text-sm text-gray-500">No hay solicitudes registradas.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
              Monto solicitado
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
              Plazo (meses)
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Fecha de creación
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((loanApplication) => (
            <LoanApplicationRow key={loanApplication.id} loanApplication={loanApplication} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const LoanApplicationsTable = memo(LoanApplicationsTableComponent)
