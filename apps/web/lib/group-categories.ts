export const GROUP_CATEGORIES = [
  { value: 'spor_okulu', label: 'Spor Okulu' },
  { value: 'altyapi', label: 'Altyapı' },
] as const

export type GroupCategory = (typeof GROUP_CATEGORIES)[number]['value']

export function getGroupCategoryLabel(category: string | null | undefined): string {
  return GROUP_CATEGORIES.find((c) => c.value === category)?.label ?? GROUP_CATEGORIES[0].label
}

export function normalizeGroupCategory(category: string | null | undefined): GroupCategory {
  return GROUP_CATEGORIES.find((c) => c.value === category)?.value ?? GROUP_CATEGORIES[0].value
}
