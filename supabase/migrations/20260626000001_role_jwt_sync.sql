-- =====================================================
-- Role → JWT app_metadata senkronizasyonu
-- profiles.role değiştiğinde auth.users.raw_app_meta_data güncellenir
-- Böylece middleware her istekte profiles tablosuna sorgu atmaz
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_profile_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_sync ON public.profiles;

CREATE TRIGGER on_profile_role_sync
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_jwt();

-- Mevcut profillerin rollerini JWT'ye backfill et
UPDATE public.profiles SET role = role WHERE TRUE;
