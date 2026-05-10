import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Image uploads will fail.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Uploads a base64 image or Blob to Supabase Storage
 * @param imageData The image data (base64 string or Blob)
 * @param path The path in the bucket (e.g., 'violations/abc-123.jpg')
 * @returns The public URL of the uploaded image
 */
export async function uploadEvidence(imageData: string | Blob, path: string) {
  const bucket = 'exam-evidence';
  
  let body: any = imageData;
  
  // If it's a base64 string from canvas.toDataURL(), convert to Blob
  if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    const res = await fetch(imageData);
    body = await res.blob();
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, body, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}
