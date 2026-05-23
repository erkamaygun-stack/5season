import { Receipt } from 'lucide-react'

export default function AboneliklerPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonelikler</h1>
        <p className="text-sm text-gray-500 mt-1">Okul abonelik planları ve faturalar</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Receipt className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">Abonelik yönetimi yakında eklenecek.</p>
      </div>
    </div>
  )
}
