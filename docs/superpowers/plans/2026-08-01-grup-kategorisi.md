# Grup Kategorisi (Spor Okulu / Altyapı) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grupları yönetici panelinde "Spor Okulu" ve "Altyapı" olarak iki kategoriye ayırmak — grup ekleme/düzenleme formlarında kategori seçimi, dashboard'da iki ayrı bölüm, Üyeler sayfasındaki filtre chip'lerinde kategoriye göre gruplama.

**Architecture:** `groups` tablosuna `category` kolonu eklenir (migration). Kategori etiketleri/listesi tek bir paylaşılan sabitte (`apps/web/lib/group-categories.ts`) tutulur, dört farklı UI noktası (grup ekle, grup düzenle, dashboard, üye filtreleri) bu sabitten okur. Backend server action'ları (`createGroup`, `updateGroup`) yeni alanı geçirir. RLS ve iş mantığı (aidat, cron) değişmez.

**Tech Stack:** Next.js 14 App Router (Server Components + Server Actions), Supabase (Postgres), TypeScript, Tailwind, shadcn/ui Select.

## Global Constraints

- Yorumlar Türkçe yazılır (proje kuralı, CLAUDE.md).
- Kategori değerleri sabit: `'spor_okulu'` ve `'altyapi'` (DB check constraint ve TS tipleri bu iki değerle sınırlı).
- Bu proje test framework'ü (jest/vitest vb.) içermiyor — doğrulama adımları TDD unit-test döngüsü yerine **tip kontrolü** (`npx tsc --noEmit`) ve son görevde **tarayıcıda manuel doğrulama** şeklinde yapılır.
- Migration dosyası oluşturulur ama bu plan kapsamında `supabase db push` ÇALIŞTIRILMAZ — canlı veritabanına uygulamak kullanıcıya bırakılır. Bu nedenle Task 8'deki tarayıcı testi migration'ın kullanıcı tarafından uygulanmış olmasını gerektirir; uygulanmadıysa o adım atlanır ve durum kullanıcıya bildirilir.
- `.env` dosyalarına dokunulmaz, `seed.sql` değiştirilmez (CLAUDE.md).

---

### Task 1: Migration + `database.types.ts`

**Files:**
- Create: `supabase/migrations/20260801000001_group_category.sql`
- Modify: `packages/shared/database.types.ts:164-188` (groups tablo tipi)

**Interfaces:**
- Produces: `groups.category` kolonu (`text`, `not null`, default `'spor_okulu'`, check `in ('spor_okulu','altyapi')`); TS tarafında `Database['public']['Tables']['groups']['Row']['category']: string` ve `Insert['category']?: string`.

- [ ] **Step 1: Migration dosyasını oluştur**

`supabase/migrations/20260801000001_group_category.sql`:

```sql
-- Grupları "Spor Okulu" ve "Altyapı" olarak kategorilere ayırmak için kolon ekler.
-- Mevcut gruplar varsayılan olarak 'spor_okulu' olur, idareci sonradan düzeltir.
alter table groups
  add column category text not null default 'spor_okulu'
  check (category in ('spor_okulu', 'altyapi'));
```

- [ ] **Step 2: `database.types.ts` içinde `groups` tipini güncelle**

`packages/shared/database.types.ts:164-188` mevcut hali:

```ts
      groups: {
        Row: {
          id: string
          school_id: string
          name: string
          age_min: number | null
          age_max: number | null
          capacity: number | null
          primary_coach_id: string | null
          monthly_fee: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; name: string
          age_min?: number | null; age_max?: number | null; capacity?: number | null
          primary_coach_id?: string | null; monthly_fee?: number | null
          is_active?: boolean | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
        Relationships: [
          { foreignKeyName: "groups_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
          { foreignKeyName: "groups_primary_coach_id_fkey"; columns: ["primary_coach_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] }
        ]
      }
```

Şuna değiştir (sadece `category` eklendi):

```ts
      groups: {
        Row: {
          id: string
          school_id: string
          name: string
          age_min: number | null
          age_max: number | null
          capacity: number | null
          primary_coach_id: string | null
          monthly_fee: number | null
          category: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; name: string
          age_min?: number | null; age_max?: number | null; capacity?: number | null
          primary_coach_id?: string | null; monthly_fee?: number | null
          category?: string
          is_active?: boolean | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
        Relationships: [
          { foreignKeyName: "groups_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
          { foreignKeyName: "groups_primary_coach_id_fkey"; columns: ["primary_coach_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] }
        ]
      }
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Mevcut hatalarla aynı sonuç (bu tek başına yeni bir hata eklemez, çünkü henüz `category` kullanan kod yok).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260801000001_group_category.sql packages/shared/database.types.ts
git commit -m "feat: groups tablosuna category kolonu ekle (migration + types)"
```

---

### Task 2: Paylaşılan kategori sabiti

**Files:**
- Create: `apps/web/lib/group-categories.ts`

**Interfaces:**
- Produces: `GROUP_CATEGORIES: readonly [{value:'spor_okulu',label:'Spor Okulu'}, {value:'altyapi',label:'Altyapı'}]`, `type GroupCategory = 'spor_okulu' | 'altyapi'`, `getGroupCategoryLabel(category: string | null | undefined): string`.

- [ ] **Step 1: Dosyayı oluştur**

`apps/web/lib/group-categories.ts`:

```ts
export const GROUP_CATEGORIES = [
  { value: 'spor_okulu', label: 'Spor Okulu' },
  { value: 'altyapi', label: 'Altyapı' },
] as const

export type GroupCategory = (typeof GROUP_CATEGORIES)[number]['value']

export function getGroupCategoryLabel(category: string | null | undefined): string {
  return GROUP_CATEGORIES.find((c) => c.value === category)?.label ?? GROUP_CATEGORIES[0].label
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hatasız (yeni dosya henüz hiçbir yerde import edilmiyor, izole derlenir).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/group-categories.ts
git commit -m "feat: grup kategorisi için paylaşılan sabit ekle"
```

---

### Task 3: Backend actions — `createGroup` / `updateGroup`

**Files:**
- Modify: `apps/web/app/(admin)/gruplar/actions.ts:19-50` (`createGroup`)
- Modify: `apps/web/app/(admin)/gruplar/actions.ts:52-78` (`updateGroup`)

**Interfaces:**
- Consumes: yok (bu tabaka DB'ye direkt yazar).
- Produces: `createGroup(data: { name: string; monthly_fee?: number | null; primary_coach_id?: string | null; category: string; slots: Array<{...}> })`, `updateGroup(id: string, data: { name: string; monthly_fee?: number | null; primary_coach_id?: string | null; category: string; is_active: boolean })`. Task 4 ve Task 5 bu imzaları kullanacak.

- [ ] **Step 1: `createGroup`'a `category` ekle**

`apps/web/app/(admin)/gruplar/actions.ts:19-39` mevcut hali:

```ts
export async function createGroup(data: {
  name: string
  monthly_fee?: number | null
  primary_coach_id?: string | null
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }>
}) {
  const { supabase, school_id } = await getContext()

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      school_id,
      name: data.name,
      monthly_fee: data.monthly_fee ?? null,
      primary_coach_id: data.primary_coach_id ?? null,
      is_active: true,
    } as any)
    .select('id')
    .single()

  if (error || !group) throw new Error(error?.message ?? 'Grup oluşturulamadı')
```

Şuna değiştir:

```ts
export async function createGroup(data: {
  name: string
  monthly_fee?: number | null
  primary_coach_id?: string | null
  category: string
  slots: Array<{ day_of_week: number; start_time: string; end_time: string }>
}) {
  const { supabase, school_id } = await getContext()

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      school_id,
      name: data.name,
      monthly_fee: data.monthly_fee ?? null,
      primary_coach_id: data.primary_coach_id ?? null,
      category: data.category,
      is_active: true,
    } as any)
    .select('id')
    .single()

  if (error || !group) throw new Error(error?.message ?? 'Grup oluşturulamadı')
```

- [ ] **Step 2: `updateGroup`'a `category` ekle**

`apps/web/app/(admin)/gruplar/actions.ts:52-73` mevcut hali:

```ts
export async function updateGroup(
  id: string,
  data: {
    name: string
    monthly_fee?: number | null
    primary_coach_id?: string | null
    is_active: boolean
  }
) {
  const { supabase } = await getContext()

  const { error } = await supabase
    .from('groups')
    .update({
      name: data.name,
      monthly_fee: data.monthly_fee ?? null,
      primary_coach_id: data.primary_coach_id ?? null,
      is_active: data.is_active,
    } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)
```

Şuna değiştir:

```ts
export async function updateGroup(
  id: string,
  data: {
    name: string
    monthly_fee?: number | null
    primary_coach_id?: string | null
    category: string
    is_active: boolean
  }
) {
  const { supabase } = await getContext()

  const { error } = await supabase
    .from('groups')
    .update({
      name: data.name,
      monthly_fee: data.monthly_fee ?? null,
      primary_coach_id: data.primary_coach_id ?? null,
      category: data.category,
      is_active: data.is_active,
    } as any)
    .eq('id', id)

  if (error) throw new Error(error.message)
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: `add-group-modal.tsx` ve `grup-detail-tabs.tsx` henüz `category` göndermediği için burada **yeni tip hataları görmen normal** (eksik zorunlu alan). Task 4 ve 5 bu hataları giderecek — bu adımda sadece `actions.ts` içinde sözdizimi hatası olmadığını doğrula (hata mesajları `add-group-modal.tsx` / `grup-detail-tabs.tsx` satırlarını göstermeli, `actions.ts` satırlarını değil).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(admin\)/gruplar/actions.ts
git commit -m "feat: createGroup ve updateGroup action'larina category parametresi ekle"
```

---

### Task 4: Grup Ekle modalı — kategori seçimi

**Files:**
- Modify: `apps/web/components/gruplar/add-group-modal.tsx`

**Interfaces:**
- Consumes: `GROUP_CATEGORIES` from `@/lib/group-categories` (Task 2), `createGroup(data: {..., category: string, ...})` from Task 3.

- [ ] **Step 1: Import ekle**

`apps/web/components/gruplar/add-group-modal.tsx:11` sonrasına (`TR_DAYS` import satırının altına) ekle:

```ts
import { GROUP_CATEGORIES } from '@/lib/group-categories'
```

- [ ] **Step 2: Form state'e `category` ekle**

`apps/web/components/gruplar/add-group-modal.tsx:28-32` mevcut hali:

```ts
  const [form, setForm] = useState({
    name: '',
    monthly_fee: '',
    primary_coach_id: '',
  })
```

Şuna değiştir:

```ts
  const [form, setForm] = useState({
    name: '',
    monthly_fee: '',
    primary_coach_id: '',
    category: GROUP_CATEGORIES[0].value as string,
  })
```

- [ ] **Step 3: `handleSubmit` içinde `createGroup` çağrısına ve form reset'e `category` ekle**

`apps/web/components/gruplar/add-group-modal.tsx:57-72` mevcut hali:

```ts
    startTransition(async () => {
      try {
        await createGroup({
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          slots: slots.map((s) => ({
            day_of_week: Number(s.day_of_week),
            start_time: s.start_time.length === 5 ? s.start_time + ':00' : s.start_time,
            end_time: s.end_time.length === 5 ? s.end_time + ':00' : s.end_time,
          })),
        })
        toast.success(`${form.name} grubu oluşturuldu`)
        setOpen(false)
        setForm({ name: '', monthly_fee: '', primary_coach_id: '' })
        setSlots([{ day_of_week: '1', start_time: '16:00', end_time: '17:30' }])
```

Şuna değiştir:

```ts
    startTransition(async () => {
      try {
        await createGroup({
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          category: form.category,
          slots: slots.map((s) => ({
            day_of_week: Number(s.day_of_week),
            start_time: s.start_time.length === 5 ? s.start_time + ':00' : s.start_time,
            end_time: s.end_time.length === 5 ? s.end_time + ':00' : s.end_time,
          })),
        })
        toast.success(`${form.name} grubu oluşturuldu`)
        setOpen(false)
        setForm({ name: '', monthly_fee: '', primary_coach_id: '', category: GROUP_CATEGORIES[0].value })
        setSlots([{ day_of_week: '1', start_time: '16:00', end_time: '17:30' }])
```

- [ ] **Step 4: JSX'e Kategori Select'i ekle**

`apps/web/components/gruplar/add-group-modal.tsx:89-97` mevcut hali (Grup Adı alanı):

```tsx
          <div className="space-y-1.5">
            <Label>Grup Adı *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="U10 Pazartesi-Çarşamba"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Aylık Ücret (₺)</Label>
```

Şuna değiştir (Grup Adı ile Aylık Ücret arasına Kategori Select'i eklendi):

```tsx
          <div className="space-y-1.5">
            <Label>Grup Adı *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="U10 Pazartesi-Çarşamba"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kategori *</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Aylık Ücret (₺)</Label>
```

- [ ] **Step 5: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: `add-group-modal.tsx` ile ilgili `category` eksikliği hatası artık yok. (`grup-detail-tabs.tsx` ile ilgili hata Task 5'e kadar kalabilir.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/gruplar/add-group-modal.tsx
git commit -m "feat: Yeni Grup modaline kategori secimi ekle"
```

---

### Task 5: Grup Düzenle modalı + Genel Bilgiler kartı + `[id]/page.tsx` sorgusu

**Files:**
- Modify: `apps/web/components/gruplar/grup-detail-tabs.tsx:1-190` (import, `Group` interface, `EditGroupModal`)
- Modify: `apps/web/components/gruplar/grup-detail-tabs.tsx:502-513` (Genel Bilgiler alan listesi)
- Modify: `apps/web/app/(admin)/gruplar/[id]/page.tsx:19-25` (Supabase sorgusu)

**Interfaces:**
- Consumes: `GROUP_CATEGORIES`, `getGroupCategoryLabel` from `@/lib/group-categories` (Task 2), `updateGroup(id, {..., category: string, ...})` from Task 3.
- Produces: `Group.category: string` (Task 6 ve 7'nin kullandığı `group.category` alanı burada tanımlanır).

- [ ] **Step 1: Import ekle**

`apps/web/components/gruplar/grup-detail-tabs.tsx:15` sonrasına ekle:

```ts
import { GROUP_CATEGORIES, getGroupCategoryLabel } from '@/lib/group-categories'
```

- [ ] **Step 2: `Group` interface'ine `category` ekle**

`apps/web/components/gruplar/grup-detail-tabs.tsx:45-55` mevcut hali:

```ts
interface Group {
  id: string
  name: string
  monthly_fee: number | null
  is_active: boolean | null
  primary_coach_id: string | null
  color: string | null
  staff: { id: string; full_name: string } | null
  group_schedule_slots: Slot[]
  student_groups: StudentGroup[]
}
```

Şuna değiştir:

```ts
interface Group {
  id: string
  name: string
  monthly_fee: number | null
  is_active: boolean | null
  primary_coach_id: string | null
  category: string
  color: string | null
  staff: { id: string; full_name: string } | null
  group_schedule_slots: Slot[]
  student_groups: StudentGroup[]
}
```

- [ ] **Step 3: `EditGroupModal` form state'ine `category` ekle**

`apps/web/components/gruplar/grup-detail-tabs.tsx:94-100` mevcut hali:

```ts
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: group.name,
    monthly_fee: group.monthly_fee != null ? String(group.monthly_fee) : '',
    primary_coach_id: group.primary_coach_id ?? '',
    is_active: group.is_active !== false ? 'active' : 'inactive',
  })
```

Şuna değiştir:

```ts
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: group.name,
    monthly_fee: group.monthly_fee != null ? String(group.monthly_fee) : '',
    primary_coach_id: group.primary_coach_id ?? '',
    category: group.category,
    is_active: group.is_active !== false ? 'active' : 'inactive',
  })
```

- [ ] **Step 4: `handleSubmit` içinde `updateGroup` çağrısına ve `onSuccess` payload'ına `category` ekle**

`apps/web/components/gruplar/grup-detail-tabs.tsx:106-128` mevcut hali:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    startTransition(async () => {
      try {
        await updateGroup(group.id, {
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          is_active: form.is_active === 'active',
        })
        toast.success('Grup bilgileri güncellendi')
        onSuccess({
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          is_active: form.is_active === 'active',
        })
      } catch (err: any) {
        toast.error('Güncellenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }
```

Şuna değiştir:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    startTransition(async () => {
      try {
        await updateGroup(group.id, {
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          category: form.category,
          is_active: form.is_active === 'active',
        })
        toast.success('Grup bilgileri güncellendi')
        onSuccess({
          name: form.name.trim(),
          monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
          primary_coach_id: form.primary_coach_id || null,
          category: form.category,
          is_active: form.is_active === 'active',
        })
      } catch (err: any) {
        toast.error('Güncellenemedi: ' + (err?.message ?? 'Bilinmeyen hata'))
      }
    })
  }
```

- [ ] **Step 5: JSX'e Kategori Select'i ekle**

`apps/web/components/gruplar/grup-detail-tabs.tsx:150-166` mevcut hali (Antrenör alanı ile Durum alanı arası):

```tsx
          <div className="space-y-1.5">
            <Label>Antrenör</Label>
            <Select value={form.primary_coach_id} onValueChange={(v) => set('primary_coach_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Seçilmedi —</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
```

Şuna değiştir (araya Kategori Select'i eklendi):

```tsx
          <div className="space-y-1.5">
            <Label>Antrenör</Label>
            <Select value={form.primary_coach_id} onValueChange={(v) => set('primary_coach_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Seçilmedi —</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
```

- [ ] **Step 6: Genel Bilgiler kartına "Kategori" satırı ekle**

`apps/web/components/gruplar/grup-detail-tabs.tsx:502-508` mevcut hali:

```tsx
                {([
                  ['Grup Adı', group.name],
                  ['Antrenör', coachName],
                  ['Aylık Ücret', formatCurrency(group.monthly_fee)],
                  ['Durum', group.is_active !== false ? 'Aktif' : 'Pasif'],
                ] as [string, string][]).map(([label, value]) => (
```

Şuna değiştir:

```tsx
                {([
                  ['Grup Adı', group.name],
                  ['Kategori', getGroupCategoryLabel(group.category)],
                  ['Antrenör', coachName],
                  ['Aylık Ücret', formatCurrency(group.monthly_fee)],
                  ['Durum', group.is_active !== false ? 'Aktif' : 'Pasif'],
                ] as [string, string][]).map(([label, value]) => (
```

- [ ] **Step 7: Sayfa sorgusuna `category` kolonu ekle**

`apps/web/app/(admin)/gruplar/[id]/page.tsx:19-25` mevcut hali:

```ts
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
```

Şuna değiştir:

```ts
      supabase
        .from('groups')
        .select(`
          id, name, monthly_fee, is_active, primary_coach_id, color, category,
          staff(id, full_name),
          group_schedule_slots(id, day_of_week, start_time, end_time),
          student_groups(id, is_active, joined_at, left_at, students(id, full_name, status))
        `)
        .eq('id', id)
        .single(),
```

- [ ] **Step 8: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hatasız derleme (Task 3'te kalan `category` eksikliği hataları burada giderilir).

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/gruplar/grup-detail-tabs.tsx apps/web/app/\(admin\)/gruplar/\[id\]/page.tsx
git commit -m "feat: Grup Duzenle modaline ve Genel Bilgiler kartina kategori ekle"
```

---

### Task 6: Ana Sayfa — iki ayrı kategori bölümü

**Files:**
- Modify: `apps/web/app/(admin)/page.tsx`

**Interfaces:**
- Consumes: `GROUP_CATEGORIES` from `@/lib/group-categories` (Task 2), `groups[].category` (Task 5'in DB tarafında zaten var olan kolonu, burada select'e eklenir).

- [ ] **Step 1: Import ekle**

`apps/web/app/(admin)/page.tsx:6` sonrasına (`getGroupColor` import satırının altına) ekle:

```ts
import { GROUP_CATEGORIES } from '@/lib/group-categories'
```

- [ ] **Step 2: `groups` sorgusuna `category` ekle**

`apps/web/app/(admin)/page.tsx:28-31` mevcut hali:

```ts
    supabase
      .from('groups')
      .select('id, name, color, student_groups(student_id, is_active), staff(full_name)')
      .order('name'),
```

Şuna değiştir:

```ts
    supabase
      .from('groups')
      .select('id, name, color, category, student_groups(student_id, is_active), staff(full_name)')
      .order('name'),
```

- [ ] **Step 3: Gruplar bölümünü iki kategoriye ayır**

`apps/web/app/(admin)/page.tsx:71-119` mevcut hali:

```tsx
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
```

Şuna değiştir:

```tsx
      <div className="flex items-center justify-end">
        <AddGroupModal coaches={coaches} />
      </div>

      {GROUP_CATEGORIES.map((cat) => {
        const catGroups = groups.filter((g) => (g.category ?? GROUP_CATEGORIES[0].value) === cat.value)

        return (
          <div key={cat.value} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{cat.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {catGroups.map((g, i) => {
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
              {catGroups.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Henüz grup eklenmedi.</p>
              )}
            </div>
          </div>
        )
      })}
```

- [ ] **Step 4: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hatasız derleme.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(admin\)/page.tsx
git commit -m "feat: Ana Sayfada gruplari Spor Okulu / Altyapi olarak ikiye ayir"
```

---

### Task 7: Üyeler sayfası — kategoriye göre gruplanmış filtre chip'leri

**Files:**
- Modify: `apps/web/app/(admin)/ogrenciler/page.tsx:43-46`
- Modify: `apps/web/components/ogrenciler/group-filter-chips.tsx` (tüm dosya)

**Interfaces:**
- Consumes: `GROUP_CATEGORIES` from `@/lib/group-categories` (Task 2).
- Produces: `GroupFilterChips({ groups: { id: string; name: string; category: string }[] })` — mevcut `?group_id=` filtreleme davranışı korunur.

- [ ] **Step 1: Sayfa sorgusuna `category` ekle**

`apps/web/app/(admin)/ogrenciler/page.tsx:43-46` mevcut hali:

```ts
    const { data: groupsData } = await supabase
      .from('groups')
      .select('id, name')
      .order('name')
```

Şuna değiştir:

```ts
    const { data: groupsData } = await supabase
      .from('groups')
      .select('id, name, category')
      .order('name')
```

- [ ] **Step 2: `GroupFilterChips` bileşenini kategoriye göre grupla**

`apps/web/components/ogrenciler/group-filter-chips.tsx` mevcut tam içeriği:

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

Tüm dosyayı şununla değiştir:

```tsx
'use client'
// useSearchParams ile aktif filtreyi tespit etmek için client component gerekli

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GROUP_CATEGORIES } from '@/lib/group-categories'

interface Group {
  id: string
  name: string
  category: string
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

  function chipClass(isActive: boolean) {
    return cn(
      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/70'
    )
  }

  return (
    <div className="space-y-2">
      <Link href={chipHref(null)} className={chipClass(!activeGroupId)}>
        Tümü
      </Link>
      {GROUP_CATEGORIES.map((cat) => {
        const catGroups = groups.filter((g) => g.category === cat.value)
        if (catGroups.length === 0) return null

        return (
          <div key={cat.value} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
              {cat.label}
            </span>
            {catGroups.map((g) => (
              <Link key={g.id} href={chipHref(g.id)} className={chipClass(activeGroupId === g.id)}>
                {g.name}
              </Link>
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hatasız derleme.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(admin\)/ogrenciler/page.tsx apps/web/components/ogrenciler/group-filter-chips.tsx
git commit -m "feat: Uyeler sayfasindaki grup filtre chiplerini kategoriye gore grupla"
```

---

### Task 8: Migration'ı uygula ve uçtan uca manuel doğrulama

**Files:** Yok (sadece komut çalıştırma + tarayıcı doğrulaması).

**Interfaces:** Yok — bu görev önceki 7 görevin bütününü doğrular.

- [ ] **Step 1: Tüm proje için son tip kontrolü**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Hatasız derleme (0 hata).

- [ ] **Step 2: Kullanıcıya migration'ı uygulaması gerektiğini bildir**

Bu adım kullanıcı onayı gerektirir — `supabase db push` canlı/linked Supabase projesine yazar. Kullanıcıya sor: "Task 1'de oluşturulan migration'ı (`20260801000001_group_category.sql`) şimdi `supabase db push` ile uygulayayım mı?" Onay verirse çalıştır:

```bash
supabase db push
```

Onay vermezse bu adımı ve Step 3'ü atla, kullanıcıya migration'ı ve tip güncellemelerini kendisinin ne zaman isterse `supabase db push` ile uygulayabileceğini hatırlat.

- [ ] **Step 3: Dev server'ı başlat ve tarayıcıda doğrula (migration uygulandıysa)**

```bash
cd apps/web && npm run dev
```

Tarayıcıda `http://localhost:3000` adresine git ve sırayla doğrula:
1. Ana sayfada "Spor Okulu" ve "Altyapı" başlıklı iki ayrı grup bölümü görünüyor, mevcut gruplar "Spor Okulu" altında listeleniyor.
2. "Yeni Grup" ile yeni bir grup oluştur, Kategori alanından "Altyapı" seç, kaydet — grup "Altyapı" bölümünde görünmeli.
3. Bir grubun detay sayfasına gir, "Düzenle" ile kategoriyi "Spor Okulu"'na çevir, kaydet — Genel Bilgiler kartındaki "Kategori" satırı ve dashboard'daki bölüm güncellenmiş olmalı.
4. Üyeler sayfasına gir (`/ogrenciler`), filtre chip'lerinin "Spor Okulu" ve "Altyapı" başlıkları altında iki satıra ayrıldığını, bir chip'e tıklayınca filtrenin eskisi gibi çalıştığını doğrula.

Herhangi bir adımda beklenmeyen davranış görülürse (örn. toast hata mesajı, konsol hatası) durdur ve bildir.

- [ ] **Step 4: Dev server'ı durdur**

Doğrulama tamamlandıktan sonra terminal'de `Ctrl+C` ile dev server'ı kapat (veya arka planda çalıştırıldıysa ilgili process'i sonlandır).
