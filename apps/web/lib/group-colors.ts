export const GROUP_COLORS = [
  { key: 'blue', text: 'text-blue-500', bg: 'bg-blue-500/10', swatch: 'bg-blue-500' },
  { key: 'red', text: 'text-red-500', bg: 'bg-red-500/10', swatch: 'bg-red-500' },
  { key: 'yellow', text: 'text-yellow-500', bg: 'bg-yellow-500/10', swatch: 'bg-yellow-500' },
  { key: 'green', text: 'text-green-500', bg: 'bg-green-500/10', swatch: 'bg-green-500' },
  { key: 'purple', text: 'text-purple-500', bg: 'bg-purple-500/10', swatch: 'bg-purple-500' },
  { key: 'pink', text: 'text-pink-500', bg: 'bg-pink-500/10', swatch: 'bg-pink-500' },
  {
    key: 'white',
    text: 'text-neutral-400 dark:text-white',
    bg: 'bg-neutral-400/10 dark:bg-white/10',
    swatch: 'bg-white ring-1 ring-inset ring-foreground/20',
  },
  { key: 'cyan', text: 'text-cyan-500', bg: 'bg-cyan-500/10', swatch: 'bg-cyan-500' },
] as const

export type GroupColorKey = (typeof GROUP_COLORS)[number]['key']

export function getGroupColor(colorKey: string | null | undefined, fallbackIndex: number) {
  return GROUP_COLORS.find((c) => c.key === colorKey) ?? GROUP_COLORS[fallbackIndex % GROUP_COLORS.length]
}
