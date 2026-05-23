import { Server } from 'lucide-react'

export default function SistemPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sistem</h1>
        <p className="text-sm text-gray-500 mt-1">Sistem sağlığı, loglar ve yapılandırma</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Server className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">Sistem yönetimi yakında eklenecek.</p>
      </div>
    </div>
  )
}
