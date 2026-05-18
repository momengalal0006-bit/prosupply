const supabase = require('../config/supabase');
const path = require('path');

/**
 * Uploads a file buffer to Supabase Storage and returns the public URL.
 * @param {Object} file - The file object from multer (must have buffer, originalname, mimetype)
 * @param {string} bucket - The Supabase Storage bucket name (e.g., 'uploads')
 * @param {string} folder - Optional folder prefix (e.g., 'images' or 'documents')
 * @returns {Promise<string>} The public URL of the uploaded file
 */
const uploadToSupabase = async (file, bucket = 'uploads', folder = '') => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const ext = path.extname(file.originalname);
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  // Remove special chars from filename, keeping only alphanumeric and extension
  const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '');
  
  const fileName = folder 
    ? `${folder}/${cleanName}-${uniqueSuffix}${ext}`
    : `${cleanName}-${uniqueSuffix}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};

module.exports = { uploadToSupabase };
