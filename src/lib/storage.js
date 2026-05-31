// MatMind Storage — helpers for uploading files to Supabase Storage
// Bucket: channel-files (public, 10MB limit)

import { supabase } from './supabase';

const BUCKET = 'channel-files';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
]);

/**
 * Upload a file to the channel-files bucket.
 * Returns { url, name, type, size } on success.
 * Throws a user-readable Error on failure.
 */
export async function uploadChannelFile(file, teamId) {
  if (!supabase) throw new Error('File uploads are not available in demo mode.');
  if (!file)     throw new Error('No file provided.');
  if (file.size > MAX_BYTES) throw new Error('File is too large. Maximum size is 10 MB.');
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type "${file.type}". Allowed: images and PDFs.`);
  }

  // Build a unique path: team_id/timestamp-random.ext
  const ext  = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const uid  = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = teamId ? `${teamId}/${uid}.${ext}` : `${uid}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return { url: publicUrl, name: file.name, type: file.type, size: file.size };
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB — logos should be small

/**
 * Upload a team logo to the channel-files bucket under logos/.
 * Returns the public URL string. Throws a user-readable Error on failure.
 */
export async function uploadTeamLogo(file, teamId) {
  if (!supabase) throw new Error('Logo upload is not available in demo mode.');
  if (!file)     throw new Error('No file provided.');
  if (file.size > LOGO_MAX_BYTES) throw new Error('Logo is too large. Maximum size is 2 MB.');
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error('Logo must be a PNG, JPG, GIF, WEBP, or SVG image.');
  }

  const ext  = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `logos/${teamId || 'team'}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadErr) throw new Error(`Logo upload failed: ${uploadErr.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}
