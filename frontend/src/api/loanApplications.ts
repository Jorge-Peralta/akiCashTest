// Typed fetch wrapper for the loan-applications API.
// The base URL is read from Vite env so it's never hardcoded here.
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'

export type LoanStatus = 'pending' | 'approved' | 'rejected'

export interface LoanApplication {
  id: number
  client_id: number
  // Comes back as a string from the backend (MySQL decimal serialization).
  requested_amount: string
  term_months: number
  status: LoanStatus
  created_at: string
}

export interface LoanApplicationsResponse {
  data: LoanApplication[]
  total: number
  page: number
  limit: number
}

export interface ListLoanApplicationsParams {
  page: number
  limit: number
  status?: LoanStatus
  from?: string
  to?: string
}

export interface CreateLoanApplicationInput {
  client_id: number
  requested_amount: number
  term_months: number
  status?: LoanStatus
}

/** Shape of the backend's error body, per its global exception filter. */
export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  error: string
  path: string
  timestamp: string
}

/**
 * Thrown for any non-2xx response. Carries the parsed backend error body
 * (when the response was valid JSON) so callers can render field-level
 * validation messages instead of a generic "something went wrong".
 */
export class ApiError extends Error {
  status: number
  body: ApiErrorBody | undefined

  constructor(message: string, status: number, body: ApiErrorBody | undefined) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function messageFromBody(body: ApiErrorBody | undefined, fallback: string): string {
  if (!body) return fallback
  if (Array.isArray(body.message)) return body.message.join(', ')
  if (typeof body.message === 'string') return body.message
  return fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    // Network failure (backend down, CORS, DNS, offline, etc.)
    throw new ApiError('No se pudo conectar con el servidor. ¿Está corriendo el backend?', 0, undefined)
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      body = undefined
    }
    throw new ApiError(messageFromBody(body, `La solicitud falló con estado ${response.status}`), response.status, body)
  }

  // 204 or empty body
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getLoanApplications(params: ListLoanApplicationsParams): Promise<LoanApplicationsResponse> {
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.status) query.set('status', params.status)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)

  return request<LoanApplicationsResponse>(`/loan-applications?${query.toString()}`)
}

export function createLoanApplication(input: CreateLoanApplicationInput): Promise<LoanApplication> {
  return request<LoanApplication>('/loan-applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
