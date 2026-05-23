'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TrendPoint {
  date: string
  absent: number
}

export default function AttendanceTrend({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Devamsızlık Trendi (Son 30 Gün)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
            <Tooltip
              formatter={(value: number) => [value, 'Devamsız']}
              labelFormatter={(label) => `Tarih: ${label}`}
            />
            <Bar dataKey="absent" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
