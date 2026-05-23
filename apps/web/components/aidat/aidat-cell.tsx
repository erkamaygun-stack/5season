import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string; amount: number; paid_amount: number; status: string; is_prorated: boolean
}

interface Props {
  invoice: Invoice | null
  onClick?: () => void
}

export default function AidatCell({ invoice, onClick }: Props) {
  if (!invoice) {
    return <div className="w-[72px] h-8 rounded bg-gray-100" />
  }

  const { status, amount, paid_amount, is_prorated } = invoice

  const cls =
    status === 'paid'
      ? 'bg-green-100 text-green-700 cursor-default'
      : status === 'partial'
      ? 'bg-yellow-100 text-yellow-700 cursor-pointer hover:brightness-95'
      : 'bg-red-100 text-red-700 cursor-pointer hover:brightness-95'

  return (
    <div
      onClick={onClick}
      className={`w-[72px] h-8 rounded flex flex-col items-center justify-center text-[10px] leading-tight font-medium transition-all ${cls}`}
    >
      {status === 'paid' ? (
        <span>✓ {is_prorated ? '½' : ''}</span>
      ) : status === 'partial' ? (
        <>
          <span>{formatCurrency(paid_amount)}</span>
          <span className="opacity-60">/ {formatCurrency(amount)}</span>
        </>
      ) : (
        <span>{formatCurrency(amount)}{is_prorated ? ' ½' : ''}</span>
      )}
    </div>
  )
}
