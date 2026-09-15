import { memo } from 'react'

interface PaginationProps {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

function PaginationComponent({ page, limit, total, onPageChange }: PaginationProps) {
  const isFirstPage = page <= 1
  const isLastPage = page * limit >= total
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const buttonClasses =
    'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-white'

  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={isFirstPage} className={buttonClasses}>
        Anterior
      </button>
      <span className="text-sm text-gray-600">
        Página {page} de {totalPages} ({total} en total)
      </span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={isLastPage} className={buttonClasses}>
        Siguiente
      </button>
    </div>
  )
}

export const Pagination = memo(PaginationComponent)
