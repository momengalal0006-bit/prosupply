const supabase = require('../config/supabase');
const path = require('path');

const uploadToSupabase = async (file, bucket = 'uploads', folder = '') => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const ext = path.extname(file.originalname);
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};

module.exports = { uploadToSupabase };
