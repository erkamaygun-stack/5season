import { supabase } from '../supabase';

export type StorageBucket =
  | 'health-docs'
  | 'consent-docs'
  | 'receipts'
  | 'expense-receipts'
  | 'school-logos';

// Signed URL üret — private bucket'lardaki dosyaları kısa süreli açmak için
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn = 3600 // saniye cinsinden; varsayılan 1 saat
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

// Veli dekont yükle → receipts/{uid}/{dosyaAdı}
// Döndürdüğü değer storage path'i — payments.receipt_url alanına kaydedilir
export async function uploadReceipt(
  fileBlob: Blob,
  fileName: string
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const path = `${user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, fileBlob, { upsert: false });

  if (error) {
    console.error('[uploadReceipt]', error.message);
    return null;
  }

  return path;
}

// Yüklenen bir dekonta signed URL al (veli kendi dosyasını görüntüler)
export async function getReceiptUrl(path: string): Promise<string | null> {
  return getSignedUrl('receipts', path, 1800); // 30 dakika
}
