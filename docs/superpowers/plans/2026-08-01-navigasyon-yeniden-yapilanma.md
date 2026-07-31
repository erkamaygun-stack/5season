# Navigasyon Yeniden Yapılanması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sidebar'ı 6 öğeden 4 öğeye indir (Ana Sayfa, Üyeler, Finans, Ayarlar), `/program` sayfasını kaldır ve içeriğini (Takvim, Gruplar, Yoklama, Personel) ilgili yeni yerlere dağıt.

**Architecture:** Next.js 14 App Router, server component sayfalar + client component'ler. Mevcut alt-bileşenler (StaffTable, YoklamaClient, LeaveRequestsSection, AddGroupModal, WeekGrid vb.) olduğu gibi yeniden kullanılır — sadece hangi sayfanın onları render ettiği ve veri çektiği değişir. Route silme/taşıma işlemleri sunucu tarafı `redirect()` stub'larıyla korunur.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Auth), TypeScript, Tailwind, shadcn/ui.

## Global Constraints

- Bu depoda test framework yok (`package.json`'da sadece `dev`/`build`/`start`/`lint`). Her görevin doğrulama adımı `npx tsc --noEmit` (hızlı tip kontrolü) + son görevde tam `npm run build`'dur.
- Yorumlar Türkçe yazılır (CLAUDE.md kuralı). Yeni `"use client"` satırlarının üstüne neden gerektiğini açıklayan tek satır Türkçe yorum eklenir.
- Server component'lerde Supabase hataları asla sessizce yutulmaz; mevcut dosyalardaki desen korunur (destructure edilip `?? []`/`?? null` ile güvenli varsayılan kullanılır).
- Hiçbir görev `.env`, `seed.sql` dosyalarına dokunmaz.
- Tüm komutlar `apps/web/` dizininden çalıştırılır.

---

### Task 1: Sidebar — 4 öğeye indir

**Files:**
- Modify: `apps/web/components/layout/sidebar.tsx`

**Interfaces:**
- Değişiklik yok — component'in dışa açık `SidebarProps` arayüzü aynı kalır.

- [ ] **Step 1: `navItems` listesini 4 öğeye indir ve footer linkini güncelle**

`apps/web/components/layout/sidebar.tsx` içinde:

```tsx
import {
  Home, Users, Wallet, Settings, Zap,
} from 'lucide-react'
```

```tsx
const navItems = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/ogrenciler', label: 'Üyeler', icon: Users },
  { href: '/finans', label: 'Finans', icon: Wallet },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]
```

`Calendar` ve `UserCircle` import'ları kaldırılır (artık kullanılmıyor). Footer'daki okul logosu linkinde:

```tsx
const isActive = pathname.startsWith('/ayarlar')
return (
  <Link
    href="/ayarlar"
```

(önceki `pathname.startsWith('/okul')` ve `href="/okul"` satırlarının yerini alır.)

- [ ] **Step 2: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/layout/sidebar.tsx
git commit -m "refactor: sidebar'ı 4 öğeye indir (Ana Sayfa, Üyeler, Finans, Ayarlar)"
```

---

### Task 2: Ayarlar sayfası — Okul + Hesabım birleşimi

**Files:**
- Create: `apps/web/app/(admin)/ayarlar/tab-nav.tsx`
- Create: `apps/web/app/(admin)/ayarlar/page.tsx`
- Create: `apps/web/app/(admin)/ayarlar/okul-form.tsx` (taşınan `okul/okul-form.tsx`)
- Create: `apps/web/app/(admin)/ayarlar/hesabim-client.tsx` (taşınan `hesabim/hesabim-client.tsx`)
- Create: `apps/web/app/(admin)/ayarlar/actions.ts` (taşınan `hesabim/actions.ts`)
- Delete: `apps/web/app/(admin)/okul/page.tsx`, `apps/web/app/(admin)/okul/okul-form.tsx`
- Delete: `apps/web/app/(admin)/hesabim/page.tsx`, `apps/web/app/(admin)/hesabim/hesabim-client.tsx`, `apps/web/app/(admin)/hesabim/actions.ts`

**Interfaces:**
- Consumes: `OkulForm({ school })`, `HesabimClient({ profile })` — mevcut prop tipleri değişmeden taşınır.
- Produces: `/ayarlar?tab=okul` ve `/ayarlar?tab=hesabim` route'ları.

- [ ] **Step 1: `okul-form.tsx` ve `hesabim-client.tsx`/`actions.ts` dosyalarını taşı**

`apps/web/app/(admin)/okul/okul-form.tsx` dosyasını **olduğu gibi** `apps/web/app/(admin)/ayarlar/okul-form.tsx` yoluna kopyala (içerik değişmiyor, import'lar zaten `@/` alias kullanıyor).

`apps/web/app/(admin)/hesabim/hesabim-client.tsx` dosyasını **olduğu gibi** `apps/web/app/(admin)/ayarlar/hesabim-client.tsx` yoluna kopyala.

`apps/web/app/(admin)/hesabim/actions.ts` dosyasını `apps/web/app/(admin)/ayarlar/actions.ts` yoluna kopyala, içinde şu satırı değiştir:

```ts
  revalidatePath('/hesabim')
```
→
```ts
  revalidatePath('/ayarlar')
```

`hesabim-client.tsx` içindeki `import { updateProfile, changePassword } from './actions'` satırı değişmeden kalır (relative import, yeni konumda otomatik doğru dosyayı gösterir).

- [ ] **Step 2: `tab-nav.tsx` oluştur**

`apps/web/app/(admin)/ayarlar/tab-nav.tsx`:

```tsx
'use client'
// useSearchParams ile aktif sekmeyi tespit etmek için client component gerekli

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'okul', label: 'Okul' },
  { key: 'hesabim', label: 'Hesabım' },
] as const

export default function AyarlarTabNav() {
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'okul'

  return (
    <div className="flex border-b mb-6">
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={`/ayarlar?tab=${key}`}
          className={cn(
            'px-5 py-3 text-base font-semibold border-b-2 -mb-px transition-colors',
            active === key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `page.tsx` oluştur**

`apps/web/app/(admin)/ayarlar/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OkulForm from './okul-form'
import HesabimClient from './hesabim-client'
import AyarlarTabNav from './tab-nav'

type Tab = 'okul' | 'hesabim'

export default async function AyarlarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'hesabim' ? 'hesabim' : 'okul'
  const supabase = await createClient()

  let okulContent = null
  if (tab === 'okul') {
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, address, contact_phone, logo_url, default_aidat_amount, default_uniform_amount, collection_day')
      .limit(1)
      .single()
    okulContent = <OkulForm school={school as any} />
  }

  let hesabimContent = null
  if (tab === 'hesabim') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email, role, school_id')
      .eq('id', user.id)
      .single()

    if (!profile) redirect('/login')
    hesabimContent = <HesabimClient profile={profile as any} />
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Ayarlar</h1>
      <AyarlarTabNav />
      {okulContent}
      {hesabimContent}
    </div>
  )
}
```

- [ ] **Step 4: Eski `okul/` ve `hesabim/` klasörlerini sil**

```bash
rm -rf "apps/web/app/(admin)/okul" "apps/web/app/(admin)/hesabim"
```

- [ ] **Step 5: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok. (`okul/`, `hesabim/` klasörlerine referans veren başka dosya olmadığı Task hazırlığında grep ile doğrulandı.)

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(admin)/ayarlar" "apps/web/app/(admin)/okul" "apps/web/app/(admin)/hesabim"
git commit -m "refactor: Okul ve Hesabım ayarlarını tek /ayarlar sayfasında birleştir"
```

---

### Task 3: Eski route stub'larının hedeflerini güncelle

**Files:**
- Modify: `apps/web/app/(admin)/gruplar/page.tsx`
- Modify: `apps/web/app/(admin)/personel/page.tsx`
- Modify: `apps/web/app/(admin)/yoklama/page.tsx`

**Interfaces:**
- Değişiklik yok — hepsi zaten parametresiz `redirect()` stub'ı.

- [ ] **Step 1: `gruplar/page.tsx` — Ana Sayfaya yönlendir**

```tsx
import { redirect } from 'next/navigation'

export default function GruplarPage() {
  redirect('/')
}
```

- [ ] **Step 2: `personel/page.tsx` — Finans > Giderler'e yönlendir**

```tsx
import { redirect } from 'next/navigation'

export default function PersonelPage() {
  redirect('/finans?tab=giderler')
}
```

- [ ] **Step 3: `yoklama/page.tsx` — Ana Sayfaya yönlendir**

```tsx
import { redirect } from 'next/navigation'

export default function YoklamaPage() {
  redirect('/')
}
```

- [ ] **Step 4: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(admin)/gruplar/page.tsx" "apps/web/app/(admin)/personel/page.tsx" "apps/web/app/(admin)/yoklama/page.tsx"
git commit -m "refactor: kaldırılan /program sekmelerine işaret eden eski redirect hedeflerini güncelle"
```

---

### Task 4: Finans > Giderler'e Personel bloğu ekle

**Files:**
- Modify: `apps/web/app/(admin)/finans/page.tsx`

**Interfaces:**
- Consumes: `StaffTable({ staff })`, `StaffFilters()`, `AddStaffModal()` — `apps/web/components/personel/` altında değişmeden mevcut.
- Produces: Değişiklik yok (sayfa `searchParams`'a `search`, `type`, `active` alanları eklenir).

- [ ] **Step 1: Import'ları ve `searchParams` tipini genişlet**

`apps/web/app/(admin)/finans/page.tsx` içinde tam olarak şu eşleşen bloğu bul:

```tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, getMonthName, TR_MONTHS, nMonthsAgo } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AidatGrid from '@/components/aidat/aidat-grid'
import DekontlarClient from '../dekontlar/dekontlar-client'
import AddExpenseModal from '@/components/giderler/add-expense-modal'
import GiderlerClient from '@/components/giderler/giderler-client'
import FinansTabNav from './tab-nav'

type Tab = 'aidat' | 'dekontlar' | 'giderler' | 'raporlar'

export default async function FinansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { tab: tabParam = 'aidat', year: yearParam } = await searchParams
  const tab = (['aidat', 'dekontlar', 'giderler', 'raporlar'].includes(tabParam) ? tabParam : 'aidat') as Tab
```

Bunu şununla değiştir:

```tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, getMonthName, TR_MONTHS, nMonthsAgo } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import AidatGrid from '@/components/aidat/aidat-grid'
import DekontlarClient from '../dekontlar/dekontlar-client'
import AddExpenseModal from '@/components/giderler/add-expense-modal'
import GiderlerClient from '@/components/giderler/giderler-client'
import AddStaffModal from '@/components/personel/add-staff-modal'
import StaffTable from '@/components/personel/staff-table'
import StaffFilters from '@/components/personel/staff-filters'
import FinansTabNav from './tab-nav'

type Tab = 'aidat' | 'dekontlar' | 'giderler' | 'raporlar'

export default async function FinansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string; search?: string; type?: string; active?: string }>
}) {
  const supabase = await createClient()
  const { tab: tabParam = 'aidat', year: yearParam, search, type, active } = await searchParams
  const tab = (['aidat', 'dekontlar', 'giderler', 'raporlar'].includes(tabParam) ? tabParam : 'aidat') as Tab
```

- [ ] **Step 2: Giderler bloğunun başına personel verisi çekme ve render ekle**

Dosyada tam olarak şu satırı bul:

```tsx
  // ── Giderler ───────────────────────────────────────────────────────────────
  let giderlerContent = null
  if (tab === 'giderler') {
```

Bunu şununla değiştir (yeni personel bloğu, giderler bloğunun **üstüne eklenir** — giderler bloğunun kendi `// ── Giderler ──` başlığı, `let giderlerContent = null` ve `if (tab === 'giderler') {` satırları aynen korunur, silinmez):

```tsx
  // ── Personel (Giderler sekmesi içinde) ────────────────────────────────────
  let personelContent = null
  if (tab === 'giderler') {
    let staffQuery = supabase
      .from('staff')
      .select('id, full_name, staff_type, monthly_salary, is_active')
      .order('full_name')

    if (search) staffQuery = staffQuery.ilike('full_name', `%${search}%`)
    if (type) staffQuery = staffQuery.eq('staff_type', type)
    if (active === 'active') staffQuery = staffQuery.eq('is_active', true)
    if (active === 'inactive') staffQuery = staffQuery.eq('is_active', false)

    const { data: staffData } = await staffQuery
    const { data: staffGroupsData } = await supabase
      .from('groups')
      .select('id, name, primary_coach_id')
      .eq('is_active', true)

    const staffGroups: Record<string, string[]> = {}
    for (const g of staffGroupsData ?? []) {
      if ((g as any).primary_coach_id) {
        const coachId = (g as any).primary_coach_id as string
        if (!staffGroups[coachId]) staffGroups[coachId] = []
        staffGroups[coachId].push(g.name)
      }
    }

    const personelData = (staffData ?? []).map((s) => ({
      ...s,
      groups: staffGroups[s.id] ?? [],
    }))

    personelContent = (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Personel <span className="font-normal text-muted-foreground text-sm">({personelData.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled title="V1.1'de eklenecek">
              <Upload className="w-4 h-4 mr-1.5" />
              Excel Import
            </Button>
            <AddStaffModal />
          </div>
        </div>
        <StaffFilters />
        <StaffTable staff={personelData} />
      </div>
    )
  }

  // ── Giderler ───────────────────────────────────────────────────────────────
  let giderlerContent = null
  if (tab === 'giderler') {
```

Not: Bu değişiklikten sonra dosyada `// ── Giderler ──` başlığı ve devamındaki mevcut gövde (total hesaplama, `giderlerContent = (...)` ataması) **hiç dokunulmadan** aynen kalır — yalnızca yukarısına yeni personel bloğu eklenmiş olur.

- [ ] **Step 3: `personelContent`'i Giderler içeriğinin üstünde render et, Giderler JSX'ine başlık ekle**

Dosyanın sonundaki return bloğunda tam olarak şunu bul:

```tsx
      <div className="space-y-4">
        {aidatContent}
        {dekontlarContent}
        {giderlerContent}
        {raporlarContent}
      </div>
```

Bunu şununla değiştir:

```tsx
      <div className="space-y-4">
        {aidatContent}
        {dekontlarContent}
        {personelContent}
        {giderlerContent}
        {raporlarContent}
      </div>
```

Ayrıca, Personel bölümünden görsel olarak ayırmak için `giderlerContent` JSX'inin başına bir `<h2>` başlık ekle. Dosyada tam olarak şunu bul:

```tsx
    giderlerContent = (
      <>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Toplam: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </span>
          <AddExpenseModal />
        </div>
        <GiderlerClient initialExpenses={expenses ?? []} />
      </>
    )
```

Bunu şununla değiştir:

```tsx
    giderlerContent = (
      <>
        <h2 className="text-lg font-semibold text-foreground">Giderler</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Toplam: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </span>
          <AddExpenseModal />
        </div>
        <GiderlerClient initialExpenses={expenses ?? []} />
      </>
    )
```

- [ ] **Step 4: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(admin)/finans/page.tsx"
git commit -m "feat: Personel yönetimini Finans > Giderler sekmesine taşı"
```

---

### Task 5: Ana Sayfa — Grup Ekle butonu

**Files:**
- Modify: `apps/web/app/(admin)/page.tsx`

**Interfaces:**
- Consumes: `AddGroupModal({ coaches })` — `apps/web/components/gruplar/add-group-modal.tsx`, değişmeden mevcut.

- [ ] **Step 1: `coaches` verisini çek ve butonu ekle**

`apps/web/app/(admin)/page.tsx` içindeki import bloğuna ekle:

```tsx
import AddGroupModal from '@/components/gruplar/add-group-modal'
```

`groupsResult` sorgusunun yanına paralel bir `coachesResult` sorgusu ekle — mevcut:

```tsx
  const [profileResult, groupsResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('groups')
      .select('id, name, color, student_groups(student_id, is_active), staff(full_name)')
      .order('name'),
  ])
```

şu şekilde değişir:

```tsx
  const [profileResult, groupsResult, coachesResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('groups')
      .select('id, name, color, student_groups(student_id, is_active), staff(full_name)')
      .order('name'),
    supabase
      .from('staff')
      .select('id, full_name')
      .eq('staff_type', 'coach')
      .eq('is_active', true)
      .order('full_name'),
  ])
```

`groups` değişkeninin tanımlandığı satırın altına ekle:

```tsx
  const coaches = (coachesResult.data ?? []) as { id: string; full_name: string }[]
```

Grup kartları grid'inin hemen üstüne (`<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">` satırından önce) başlık + buton satırı ekle:

```tsx
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Gruplar</h2>
        <AddGroupModal coaches={coaches} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(admin)/page.tsx"
git commit -m "feat: Ana Sayfaya Grup Ekle butonu ekle"
```

---

### Task 6: Ana Sayfa — Takvim taşı, `/program` klasörünü sil

**Files:**
- Create: `apps/web/app/(admin)/takvim-client.tsx` (taşınan `program/ProgramClient.tsx`)
- Modify: `apps/web/app/(admin)/actions.ts` (mevcut dosyaya `cancelWeekSessions`/`cancelDaySessions` eklenir)
- Modify: `apps/web/app/(admin)/page.tsx` (Takvim bölümü eklenir)
- Modify: `apps/web/app/(admin)/gruplar/actions.ts:159` (`revalidatePath('/program')` → kaldırılır)
- Modify: `apps/web/components/gruplar/grup-detail-tabs.tsx:425` (`router.push('/program?tab=gruplar')` → `router.push('/')`)
- Delete: `apps/web/app/(admin)/program/` (tüm klasör: `page.tsx`, `ProgramClient.tsx`, `actions.ts`, `tab-nav.tsx`)

**Interfaces:**
- Consumes: `getWeekData(supabase, weekOffset)` → `WeekData` (`@/lib/program-week`), `WeekGrid` (`@/components/program/week-grid`) — değişmeden mevcut.
- Produces: `TakvimClient({ slots, sessions, weekDays, weekOffset, todayStr, weekStart, weekEnd })` — `ProgramClient`'ın birebir aynı prop arayüzü, sadece dosya adı/konumu değişti.

- [ ] **Step 1: `ProgramClient.tsx`'i `takvim-client.tsx` olarak kopyala, `/program` linklerini `/` yap**

`apps/web/app/(admin)/program/ProgramClient.tsx` dosyasının tamamını `apps/web/app/(admin)/takvim-client.tsx` yoluna kopyala. İçinde üç yeri değiştir:

```tsx
              href={`/program?week=${weekOffset - 1}`}
```
→
```tsx
              href={`/?week=${weekOffset - 1}`}
```

```tsx
              href="/program"
```
→
```tsx
              href="/"
```

```tsx
              href={`/program?week=${weekOffset + 1}`}
```
→
```tsx
              href={`/?week=${weekOffset + 1}`}
```

Component adı `ProgramClient` → `TakvimClient` olarak değiştirilir (export default fonksiyon adı ve dosyanın en üstündeki `export type { SlotRow, SessionRow, WeekDay }` satırı aynen kalır).

- [ ] **Step 2: `cancelWeekSessions`/`cancelDaySessions`'ı kök `actions.ts`'e taşı**

`apps/web/app/(admin)/actions.ts` dosyasının sonuna ekle:

```ts

export async function cancelWeekSessions(
  weekStart: string,
  weekEnd: string,
  reason: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: user?.id ?? null,
      cancelled_at: new Date().toISOString(),
    } as any)
    .gte('session_date', weekStart)
    .lte('session_date', weekEnd)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function cancelDaySessions(date: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('attendance_sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: user?.id ?? null,
      cancelled_at: new Date().toISOString(),
    } as any)
    .eq('session_date', date)
    .eq('status', 'scheduled')
  if (error) throw new Error(error.message)
  revalidatePath('/')
}
```

(Dosyanın tepesindeki `import { revalidatePath } from 'next/cache'` ve `import { createClient } from '@/lib/supabase/server'` satırları zaten mevcut, tekrar eklenmez.)

`takvim-client.tsx` içindeki import satırını güncelle:

```tsx
import { cancelWeekSessions, cancelDaySessions } from './actions'
```

(Dosya artık `app/(admin)/` kökünde olduğu için bu satır zaten kök `actions.ts`'i işaret eder — değişiklik gerekmez, sadece dosyanın yeni konumunda doğru çözümlendiğini teyit et.)

- [ ] **Step 3: Ana Sayfaya Takvim bölümünü ekle**

Bu adımda, Task 5'te zaten güncellenmiş olan `apps/web/app/(admin)/page.tsx`'in **tüm içeriğini** aşağıdakiyle değiştir (Task 5'teki Grup Ekle butonu değişiklikleri de bu son haline dahildir):

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import NotificationBar from '@/components/dashboard/notification-bar'
import { getGroupColor } from '@/lib/group-colors'
import AddGroupModal from '@/components/gruplar/add-group-modal'
import TakvimClient from './takvim-client'
import { getWeekData } from '@/lib/program-week'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { week } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [profileResult, groupsResult, coachesResult, weekData] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('groups')
      .select('id, name, color, student_groups(student_id, is_active), staff(full_name)')
      .order('name'),
    supabase
      .from('staff')
      .select('id, full_name')
      .eq('staff_type', 'coach')
      .eq('is_active', true)
      .order('full_name'),
    getWeekData(supabase, Number(week ?? 0)),
  ])

  const fullName = (profileResult.data as any)?.full_name ?? 'Hoşgeldiniz'
  const groups = (groupsResult.data ?? []) as any[]
  const coaches = (coachesResult.data ?? []) as { id: string; full_name: string }[]

  const activeStudentIds = groups.flatMap((g) =>
    (g.student_groups ?? []).filter((sg: any) => sg.is_active).map((sg: any) => sg.student_id),
  )

  const { data: paidInvoices } = activeStudentIds.length
    ? await supabase
        .from('aidat_invoices')
        .select('student_id')
        .eq('period_year', year)
        .eq('period_month', month)
        .eq('status', 'paid')
        .in('student_id', activeStudentIds)
    : { data: [] as { student_id: string }[] }

  const paidStudentIds = new Set((paidInvoices ?? []).map((inv) => inv.student_id))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Hoşgeldin, {fullName}!</h1>

      <Separator />

      <NotificationBar />

      <Separator />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Gruplar</h2>
        <AddGroupModal coaches={coaches} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g, i) => {
          const activeStudents = (g.student_groups ?? []).filter((sg: any) => sg.is_active)
          const total = activeStudents.length
          const paidCount = activeStudents.filter((sg: any) => paidStudentIds.has(sg.student_id)).length
          const percentage = total > 0 ? Math.round((paidCount / total) * 100) : 0
          const isHealthy = percentage >= 50
          const color = getGroupColor(g.color, i)

          return (
            <Link key={g.id} href={`/gruplar/${g.id}`} className="block">
              <div className="h-full rounded-xl bg-card p-5 ring-1 ring-foreground/10 space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${color.bg}`}>
                    <Users className={`w-3.5 h-3.5 ${color.text}`} />
                  </span>
                  <span className={`text-sm font-semibold truncate ${color.text}`}>{g.name}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {g.staff?.full_name ? `Antrenör: ${g.staff.full_name}` : 'Antrenör atanmadı'}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {paidCount}/{total}
                </p>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isHealthy ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {isHealthy ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  <span>%{percentage} aidat ödendi</span>
                </div>
              </div>
            </Link>
          )
        })}
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Henüz grup eklenmedi.</p>
        )}
      </div>

      <Separator />

      <h2 className="text-lg font-semibold text-foreground">Takvim</h2>
      <TakvimClient {...weekData} />
    </div>
  )
}
```

- [ ] **Step 4: `/program` klasörünü sil**

```bash
rm -rf "apps/web/app/(admin)/program"
```

- [ ] **Step 5: `gruplar/actions.ts`'teki `/program` revalidasyonunu kaldır**

`apps/web/app/(admin)/gruplar/actions.ts` içinde (deleteGroup fonksiyonunun sonunda):

```ts
  revalidatePath('/gruplar')
  revalidatePath('/program')
```
→
```ts
  revalidatePath('/gruplar')
  revalidatePath('/')
```

- [ ] **Step 6: `grup-detail-tabs.tsx`'teki grup silme yönlendirmesini düzelt**

`apps/web/components/gruplar/grup-detail-tabs.tsx` içinde:

```tsx
      router.push('/program?tab=gruplar')
```
→
```tsx
      router.push('/')
```

- [ ] **Step 7: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok. `/program` klasörüne referans veren dosya kalmadığını doğrula:

Run: `cd apps/web && grep -rn "/program\b" --include="*.ts" --include="*.tsx" app components lib`
Expected: Sonuç boş (hiçbir eşleşme yok).

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(admin)/page.tsx" "apps/web/app/(admin)/takvim-client.tsx" "apps/web/app/(admin)/actions.ts" "apps/web/app/(admin)/gruplar/actions.ts" "apps/web/components/gruplar/grup-detail-tabs.tsx"
git add -u "apps/web/app/(admin)/program"
git commit -m "feat: Takvimi Ana Sayfaya taşı, /program sayfasını kaldır"
```

---

### Task 7: Üyeler — grup bazlı filtre chip'leri

**Files:**
- Create: `apps/web/components/ogrenciler/group-filter-chips.tsx`
- Modify: `apps/web/app/(admin)/ogrenciler/page.tsx`

**Interfaces:**
- Produces: `GroupFilterChips({ groups }: { groups: { id: string; name: string }[] })` — URL'e `?group_id=` yazan client component.

- [ ] **Step 1: `group-filter-chips.tsx` oluştur**

```tsx
'use client'
// useSearchParams ile aktif filtreyi tespit etmek için client component gerekli

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Group {
  id: string
  name: string
}

export default function GroupFilterChips({ groups }: { groups: Group[] }) {
  const searchParams = useSearchParams()
  const activeGroupId = searchParams.get('group_id')

  function chipHref(groupId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (groupId) params.set('group_id', groupId)
    else params.delete('group_id')
    return `/ogrenciler?${params.toString()}`
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={chipHref(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          !activeGroupId
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/70'
        )}
      >
        Tümü
      </Link>
      {groups.map((g) => (
        <Link
          key={g.id}
          href={chipHref(g.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeGroupId === g.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          {g.name}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: `ogrenciler/page.tsx`'e chip filtresini bağla**

`apps/web/app/(admin)/ogrenciler/page.tsx` içindeki import bloğuna ekle:

```tsx
import GroupFilterChips from '@/components/ogrenciler/group-filter-chips'
```

Fonksiyon imzasını genişlet:

```tsx
export default async function OgrencilerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; group_id?: string }>
}) {
  const { tab: rawTab, group_id: groupId } = await searchParams
```

`studentsWithDebt` hesaplandıktan sonra, `tab === 'uyeler'` bloğunun sonuna grup filtresi ekle:

```tsx
    studentsWithDebt = (students ?? []).map((s) => ({
      ...s,
      debt: debtMap[s.id] ?? 0,
    }))

    if (groupId) {
      studentsWithDebt = studentsWithDebt.filter((s) =>
        (s.student_groups ?? []).some(
          (sg: any) => sg.is_active && sg.groups?.id === groupId,
        ),
      )
    }
```

Render bloğunda `<UyelerTabNav />`'ın altına, `StudentTable`'ın üstüne ekle:

```tsx
      <UyelerTabNav />

      {tab === 'uyeler' && <GroupFilterChips groups={groups} />}

      {tab === 'uyeler' && (
        <StudentTable students={studentsWithDebt as any} groups={groups} />
      )}
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/components/ogrenciler/group-filter-chips.tsx" "apps/web/app/(admin)/ogrenciler/page.tsx"
git commit -m "feat: Üyeler sayfasına grup bazlı filtre chip'leri ekle"
```

---

### Task 8: Grup Detay — "Bugünkü Yoklama" sekmesi

**Files:**
- Modify: `apps/web/app/(admin)/gruplar/[id]/page.tsx`
- Modify: `apps/web/components/gruplar/grup-detail-tabs.tsx`

**Interfaces:**
- Consumes: `YoklamaClient({ sessions, groupStudentMap })` (`@/app/(admin)/yoklama/yoklama-client`), `LeaveRequestsSection({ items })` (`@/app/(admin)/yoklama/leave-requests-section`) — mevcut, değişmeden.
- Produces: `GrupDetailTabs` yeni props alır: `todaySessions: Session[]`, `groupStudentMap: Record<string, {id:string; full_name:string}[]>`, `leaveRequests: LeaveRequest[]`.

- [ ] **Step 1: `gruplar/[id]/page.tsx`'i bugünkü oturum + izin talebi sorgularını içerecek şekilde tamamen yeniden yaz**

`apps/web/app/(admin)/gruplar/[id]/page.tsx` dosyasının **tüm içeriğini** aşağıdakiyle değiştir:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { today } from '@/lib/utils'
import GrupDetailTabs from '@/components/gruplar/grup-detail-tabs'

export default async function GrupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const todayStr = today()

  const [{ data: group }, { data: sessions }, { data: coaches }, { data: allStudents }, { data: todaySessionsRaw }] =
    await Promise.all([
      supabase
        .from('groups')
        .select(`
          id, name, monthly_fee, is_active, primary_coach_id, color,
          staff(id, full_name),
          group_schedule_slots(id, day_of_week, start_time, end_time),
          student_groups(id, is_active, joined_at, left_at, students(id, full_name, status))
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('attendance_sessions')
        .select('id, session_date, start_time, end_time, status, cancellation_reason, cancelled_at, notes')
        .eq('group_id', id)
        .order('session_date', { ascending: false })
        .limit(100),
      supabase
        .from('staff')
        .select('id, full_name')
        .eq('staff_type', 'coach')
        .eq('is_active', true)
        .order('full_name'),
      supabase
        .from('students')
        .select('id, full_name, status')
        .eq('status', 'active')
        .order('full_name'),
      supabase
        .from('attendance_sessions')
        .select(
          'id, start_time, end_time, status, group_id, groups(name), attendance_records(id, status, student_id, students(full_name))',
        )
        .eq('group_id', id)
        .eq('session_date', todayStr)
        .order('start_time'),
    ])

  if (!group) notFound()

  const activeStudentGroups = ((group as any).student_groups ?? []).filter(
    (sg: any) => sg.is_active && sg.students,
  )
  const groupStudentMap: Record<string, { id: string; full_name: string }[]> = {
    [id]: activeStudentGroups.map((sg: any) => ({ id: sg.students.id, full_name: sg.students.full_name })),
  }

  const activeStudentIds = activeStudentGroups.map((sg: any) => sg.students.id)
  const { data: leaveRequestsRaw } = activeStudentIds.length
    ? await supabase
        .from('leave_requests')
        .select('id, session_date, reason, status, students(full_name)')
        .in('student_id', activeStudentIds)
        .in('status', ['submitted', 'seen'])
        .gte('session_date', todayStr)
        .order('session_date')
    : { data: [] as any[] }

  return (
    <div>
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">{(group as any).name}</h1>
        <p className="text-sm text-muted-foreground">Grup Detayı</p>
      </div>
      <GrupDetailTabs
        group={group as any}
        sessions={sessions ?? []}
        coaches={coaches ?? []}
        allStudents={allStudents ?? []}
        todaySessions={(todaySessionsRaw ?? []) as any}
        groupStudentMap={groupStudentMap}
        leaveRequests={(leaveRequestsRaw ?? []) as any}
      />
    </div>
  )
}
```

- [ ] **Step 2: `grup-detail-tabs.tsx`'e yeni sekmeyi ekle**

Import bloğuna ekle:

```tsx
import YoklamaClient from '@/app/(admin)/yoklama/yoklama-client'
import LeaveRequestsSection from '@/app/(admin)/yoklama/leave-requests-section'
```

Component props tipini genişlet:

```tsx
export default function GrupDetailTabs({
  group: initialGroup,
  sessions,
  coaches,
  allStudents,
  todaySessions,
  groupStudentMap,
  leaveRequests,
}: {
  group: Group
  sessions: Session[]
  coaches: Coach[]
  allStudents: Student[]
  todaySessions: any[]
  groupStudentMap: Record<string, { id: string; full_name: string }[]>
  leaveRequests: any[]
}) {
```

`TabsList` içine, "Genel" sekmesinin hemen ardına yeni tetikleyici ekle:

```tsx
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="bugun">
            Bugünkü Yoklama {todaySessions.length > 0 ? `(${todaySessions.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="program">Program ({slots.length})</TabsTrigger>
```

"Genel" `TabsContent`'in hemen ardına yeni içerik bloğu ekle:

```tsx
        {/* ── BUGÜNKÜ YOKLAMA ──────────────────────────────────────────────── */}
        <TabsContent value="bugun">
          {todaySessions.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
              Bugün bu grup için planlanmış antrenman yok.
            </div>
          ) : (
            <YoklamaClient sessions={todaySessions as any} groupStudentMap={groupStudentMap} />
          )}
          <div className="mt-6">
            <LeaveRequestsSection items={leaveRequests as any} />
          </div>
        </TabsContent>
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hata yok.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(admin)/gruplar/[id]/page.tsx" "apps/web/components/gruplar/grup-detail-tabs.tsx"
git commit -m "feat: Grup detayına Bugünkü Yoklama sekmesi ekle"
```

---

### Task 9: Tam derleme ve manuel doğrulama

**Files:**
- Değişiklik yok — sadece doğrulama görevi.

- [ ] **Step 1: Tam build**

Run: `cd apps/web && npm run build`
Expected: Build başarıyla tamamlanır, route listesinde `/`, `/ogrenciler`, `/finans`, `/ayarlar`, `/gruplar/[id]` görünür; `/program` görünmez.

- [ ] **Step 2: `/program` referans taraması (son kontrol)**

Run: `cd apps/web && grep -rn "program" --include="*.tsx" --include="*.ts" "app/(admin)" | grep -v "components/program\|program-week\|program_week"`
Expected: Yalnızca `takvim-client.tsx` içindeki `getWeekData`/`program-week` importları gibi meşru eşleşmeler kalır; `/program` route referansı çıkmaz.

- [ ] **Step 3: Dev server ile manuel gezinme**

Run: `cd apps/web && npm run dev` (arka planda başlat)

Tarayıcıda sırayla kontrol et:
- `/` → Bildirimler, "Grup Ekle" butonu, grup kartları, altında Takvim (hafta gezinme + iptal butonları) görünüyor.
- `/ogrenciler` → Üyeler sekmesinde grup chip'leri görünüyor, bir gruba tıklayınca tablo filtreleniyor, "Tümü" ile sıfırlanıyor.
- `/finans?tab=giderler` → Personel bloğu (liste + Personel Ekle) üstte, Giderler tablosu altta görünüyor.
- `/gruplar/[bir-grup-id]` → "Bugünkü Yoklama" sekmesi açılıyor, oturum varsa yoklama işaretlenebiliyor.
- `/ayarlar` → Okul sekmesi varsayılan açılıyor, `/ayarlar?tab=hesabim` ile Hesabım sekmesi açılıyor, şifre değiştirme formu çalışıyor.
- Sidebar'da yalnızca Ana Sayfa, Üyeler, Finans, Ayarlar görünüyor; alt kısımdaki okul logosu `/ayarlar`'a gidiyor.
- `/program`, `/gruplar`, `/personel`, `/yoklama` adreslerine doğrudan gidildiğinde doğru sayfalara yönleniyor (sırasıyla 404, `/`, `/finans?tab=giderler`, `/`).

Dev server'ı durdur.

- [ ] **Step 4: Commit (varsa build sırasında oluşan küçük düzeltmeler)**

Eğer Step 1-3'te bir sorun bulunup düzeltildiyse:

```bash
git add -A apps/web
git commit -m "fix: build ve manuel doğrulama sırasında bulunan sorunları düzelt"
```

Sorun bulunmadıysa bu adım atlanır.
