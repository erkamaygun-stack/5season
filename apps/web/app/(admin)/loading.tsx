export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Başlık */}
      <div className="space-y-1.5">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted/50 rounded" />
      </div>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-7 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* İçerik alanı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="h-4 w-36 bg-muted rounded" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 w-full bg-muted/50 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
