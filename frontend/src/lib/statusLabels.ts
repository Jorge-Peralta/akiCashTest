import type { LoanStatus } from '../api/loanApplications'

/** Spanish display labels for the loan status enum. Display-only — the
 * underlying data/type values ('pending' | 'approved' | 'rejected') never
 * change, this only maps them to a label at render time. */
export const STATUS_LABELS_ES: Record<LoanStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}
