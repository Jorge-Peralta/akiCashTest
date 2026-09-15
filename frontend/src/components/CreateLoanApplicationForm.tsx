import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, createLoanApplication } from '../api/loanApplications'
import type { LoanStatus } from '../api/loanApplications'
import { STATUS_LABELS_ES } from '../lib/statusLabels'
import { translateApiErrorMessage } from '../lib/errorMessages'

interface CreateLoanApplicationFormProps {
  onCreated: () => void
}

const STATUS_OPTIONS: LoanStatus[] = ['pending', 'approved', 'rejected']

const inputClasses =
  'rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'

/**
 * All form state lives locally in this component (not lifted to App).
 * That's deliberate: typing into these inputs re-renders only this form,
 * never the table or the status filter above it, since App's state (and
 * therefore the table's props) doesn't change until a successful submit.
 */
export function CreateLoanApplicationForm({ onCreated }: CreateLoanApplicationFormProps) {
  const [clientId, setClientId] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [status, setStatus] = useState<LoanStatus>('pending')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const parsedClientId = Number(clientId)
    const parsedAmount = Number(requestedAmount)
    const parsedTerm = Number(termMonths)

    if (!clientId || !requestedAmount || !termMonths || Number.isNaN(parsedClientId) || Number.isNaN(parsedAmount) || Number.isNaN(parsedTerm)) {
      setError('El ID de cliente, el monto solicitado y el plazo (meses) son obligatorios y deben ser números.')
      return
    }

    setSubmitting(true)
    try {
      await createLoanApplication({
        client_id: parsedClientId,
        requested_amount: parsedAmount,
        term_months: parsedTerm,
        status,
      })
      setSuccess(true)
      setClientId('')
      setRequestedAmount('')
      setTermMonths('')
      setStatus('pending')
      onCreated()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(translateApiErrorMessage(err.message))
      } else {
        setError('Error inesperado al crear la solicitud de crédito.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-900">Nueva solicitud de crédito</h3>

      <div className="flex flex-col gap-1">
        <label htmlFor="clientId" className="text-sm font-medium text-gray-700">
          Cliente (ID)
        </label>
        <input
          id="clientId"
          type="number"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Ej: 1 (ID numérico de un cliente existente)"
          required
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="requestedAmount" className="text-sm font-medium text-gray-700">
          Monto solicitado
        </label>
        <input
          id="requestedAmount"
          type="number"
          step="0.01"
          value={requestedAmount}
          onChange={(e) => setRequestedAmount(e.target.value)}
          required
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="termMonths" className="text-sm font-medium text-gray-700">
          Plazo (meses)
        </label>
        <input
          id="termMonths"
          type="number"
          step="1"
          value={termMonths}
          onChange={(e) => setTermMonths(e.target.value)}
          required
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-sm font-medium text-gray-700">
          Estado
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LoanStatus)}
          className={`${inputClasses} bg-white`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {STATUS_LABELS_ES[opt]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {submitting ? 'Creando...' : 'Crear solicitud'}
      </button>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && <p className="text-sm font-medium text-green-700">Solicitud de crédito creada.</p>}
    </form>
  )
}
