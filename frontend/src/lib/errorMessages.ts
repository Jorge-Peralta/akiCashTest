// Spanish translations for the known backend validation messages, enumerated
// from backend/src/loan-applications/dto/create-loan-application.dto.ts.
// Any message not in this list (including messages from other, unreviewed
// endpoints) is returned unchanged rather than guessed at.
const KNOWN_MESSAGES: Record<string, string> = {
  'client_id must be an integer': 'El ID de cliente debe ser un número entero',
  'requested_amount must be a number with up to 2 decimals':
    'El monto solicitado debe ser un número con hasta 2 decimales',
  'requested_amount must be greater than 0': 'El monto solicitado debe ser mayor que 0',
  'term_months must be an integer': 'El plazo (meses) debe ser un número entero',
  'term_months must be greater than 0': 'El plazo (meses) debe ser mayor que 0',
  'status must be one of: pending, approved, rejected': 'El estado debe ser uno de: pendiente, aprobada, rechazada',
}

/**
 * Translates known backend validation messages (see KNOWN_MESSAGES above) to
 * Spanish for display. class-validator error arrays get joined with ", " by
 * the API layer, so this splits on that separator, translates each known
 * fragment, and leaves anything unrecognized untouched.
 */
export function translateApiErrorMessage(message: string): string {
  return message
    .split(', ')
    .map((part) => KNOWN_MESSAGES[part.trim()] ?? part)
    .join(', ')
}
