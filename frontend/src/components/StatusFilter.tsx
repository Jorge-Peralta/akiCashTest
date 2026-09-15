import { memo } from 'react'
import type { LoanStatus } from '../api/loanApplications'

export type StatusFilterValue = LoanStatus | 'all'

interface StatusFilterProps {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
}

const OPTIONS: Array<{ value: StatusFilterValue; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
]

/**
 * Status is a closed 3-value enum, so a <select> is the correct control
 * here (no free text to validate/typo, no partial-match search needed).
 * The value still flows through useDebouncedValue in App before it drives
 * the API call, so the debounce behavior is real, not decorative.
 */
function StatusFilterComponent({ value, onChange }: StatusFilterProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      Estado:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StatusFilterValue)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export const StatusFilter = memo(StatusFilterComponent)
