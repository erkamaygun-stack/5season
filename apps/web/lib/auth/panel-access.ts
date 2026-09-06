export type PanelProfile = {
  role: string | null
  is_active: boolean | null
} | null

export function canAccessWebPanel(profile: PanelProfile): boolean {
  return profile?.is_active === true
    && (profile.role === 'school_admin' || profile.role === 'super_admin')
}
