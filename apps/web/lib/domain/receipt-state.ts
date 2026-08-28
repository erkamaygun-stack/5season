export type ReceiptStatus =
  | 'received'
  | 'identifying'
  | 'awaiting_selection'
  | 'pending_review'
  | 'cleanup_pending'
  | 'completed'
  | 'failed'

const TRANSITIONS: Record<ReceiptStatus, readonly ReceiptStatus[]> = {
  received: ['identifying', 'failed'],
  identifying: ['awaiting_selection', 'pending_review', 'failed'],
  awaiting_selection: ['identifying', 'pending_review', 'failed'],
  pending_review: ['cleanup_pending', 'failed'],
  cleanup_pending: ['completed', 'failed'],
  completed: [],
  failed: ['identifying', 'cleanup_pending'],
}

export function canTransitionReceipt(from: ReceiptStatus, to: ReceiptStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function assertReceiptTransition(from: ReceiptStatus, to: ReceiptStatus): void {
  if (!canTransitionReceipt(from, to)) {
    throw new Error(`invalid_receipt_transition:${from}->${to}`)
  }
}
