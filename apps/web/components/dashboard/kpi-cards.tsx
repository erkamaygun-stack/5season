import { Users, Layers, ClipboardList, TrendingUp, AlertCircle, Percent } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface KpiCardsProps {
  activeStudents: number
  activeGroups: number
  pendingApplications: number
  monthAidatRevenue: number
  pendingDebt: number
  collectionRate: number
}

interface MetricItem {
  label: string
  value: string
  icon: React.ElementType
  color: string
  bg: string
}

function GroupCard({ items }: { items: MetricItem[] }) {
  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full">
        <div className="grid grid-cols-3 divide-x divide-gray-100 h-full">
          {items.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function KpiCards({
  activeStudents,
  activeGroups,
  pendingApplications,
  monthAidatRevenue,
  pendingDebt,
  collectionRate,
}: KpiCardsProps) {
  const group1: MetricItem[] = [
    { label: 'Aktif Öğrenci', value: String(activeStudents), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aktif Gruplar', value: String(activeGroups), icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Bekleyen Başvuru', value: String(pendingApplications), icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  const group2: MetricItem[] = [
    { label: 'Bu Ay Toplanan Aidat', value: formatCurrency(monthAidatRevenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Bu Ay Bekleyen Borç', value: formatCurrency(pendingDebt), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Tahsilat Oranı', value: `%${collectionRate}`, icon: Percent, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <GroupCard items={group1} />
      <GroupCard items={group2} />
    </div>
  )
}
