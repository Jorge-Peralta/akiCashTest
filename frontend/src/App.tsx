import { useCallback, useEffect, useState } from 'react'
import { ApiError, getLoanApplications } from './api/loanApplications'
import type { LoanApplication } from './api/loanApplications'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { StatusFilter } from './components/StatusFilter'
import type { StatusFilterValue } from './components/StatusFilter'
import { Pagination } from './components/Pagination'
import { LoanApplicationsTable } from './components/LoanApplicationsTable'
import { CreateLoanApplicationForm } from './components/CreateLoanApplicationForm'
import { translateApiErrorMessage } from './lib/errorMessages'

const LIMIT = 10

function App() {
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
  // Debounced so the select doesn't necessarily need it to be "correct" UX-wise,
  // but the mechanism is real: the API call only fires once the value settles.
  const debouncedStatus = useDebouncedValue(statusFilter, 400)

  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)

  const [data, setData] = useState<LoanApplication[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reset to page 1 whenever the (debounced) filter changes.
  useEffect(() => {
    setPage(1)
  }, [debouncedStatus])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getLoanApplications({
      page,
      limit: LIMIT,
      status: debouncedStatus === 'all' ? undefined : debouncedStatus,
    })
      .then((response) => {
        if (cancelled) return
        setData(response.data)
        setTotal(response.total)
      })
      .catch((err) => {
        if (cancelled) return
        setData([])
        setTotal(0)
        setError(
          translateApiErrorMessage(
            err instanceof ApiError ? err.message : 'Error inesperado al cargar las solicitudes de crédito.',
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, debouncedStatus, reloadToken])

  const handleRetry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])

  const handleCreated = useCallback(() => {
    // Jump back to page 1 so the newly created application is visible,
    // and force a refetch even if we were already on page 1.
    setPage(1)
    setReloadToken((token) => token + 1)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">AkiCash — Solicitudes de Crédito</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de solicitudes de crédito</p>
        </header>

        <section className="mb-4">
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </section>

        <section>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <LoanApplicationsTable data={data} loading={loading} error={error} onRetry={handleRetry} />
          </div>
          {!loading && !error && (
            <div className="mt-4">
              <Pagination page={page} limit={LIMIT} total={total} onPageChange={handlePageChange} />
            </div>
          )}
        </section>

        <section className="mt-10 border-t border-gray-200 pt-8">
          <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <CreateLoanApplicationForm onCreated={handleCreated} />
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
