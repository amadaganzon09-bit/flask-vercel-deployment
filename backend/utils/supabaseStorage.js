const supabase = require('../supabaseClient');

/**
 * Upload a file to Supabase Storage
 * @param {Buffer|File} fileBuffer - The file buffer or file object
 * @param {string} fileName - The name to save the file as
 * @param {string} bucketName - The storage bucket name (default: 'images')
 * @returns {Promise<{publicUrl: string, error: Error|null}>}
 */
async function uploadFileToSupabase(fileBuffer, fileName, bucketName = 'images') {
  try {
    console.log(`Uploading file to Supabase Storage: ${fileName} in bucket: ${bucketName}`);
    
    // First, check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { publicUrl: null, error: new Error(`Failed to access Supabase Storage. Please check your Supabase configuration. Details: ${listError.message}`) };
    }
    
    // Check if the specified bucket exists
    const bucketExists = buckets && buckets.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      return { publicUrl: null, error: new Error(`Bucket "${bucketName}" not found. Please create the bucket in your Supabase Storage dashboard at https://app.supabase.io/project/_/storage/buckets`) };
    }
    
    console.log(`Bucket '${bucketName}' found. Proceeding with file upload.`);
    
    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file to Supabase Storage:', error);
      // Improve error message for better user guidance
      if (error.message && error.message.includes('new row violates row-level security policy')) {
        return { publicUrl: null, error: new Error('Storage policy violation. Please check your Supabase Storage policies. You may need to review the RLS policies for your bucket.') };
      }
      return { publicUrl: null, error };
    }

    console.log('File uploaded successfully:', data);

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log('Public URL generated:', publicUrl);
    return { publicUrl, error: null };
  } catch (err) {
    console.error('Unexpected error uploading file to Supabase Storage:', err);
    return { publicUrl: null, error: err };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} fileName - The name of the file to delete
 * @param {string} bucketName - The storage bucket name (default: 'images')
 * @returns {Promise<{error: Error|null}>}
 */
async function deleteFileFromSupabase(fileName, bucketName = 'images') {
  try {
    console.log(`Deleting file from Supabase Storage: ${fileName} in bucket: ${bucketName}`);
    
    // First, check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return { error: new Error(`Failed to access Supabase Storage. Please check your Supabase configuration. Details: ${listError.message}`) };
    }
    
    // Check if the specified bucket exists
    const bucketExists = buckets && buckets.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      return { error: new Error(`Bucket "${bucketName}" not found. Please create the bucket in your Supabase Storage dashboard at https://app.supabase.io/project/_/storage/buckets`) };
    }
    
    console.log(`Bucket '${bucketName}' found. Proceeding with file deletion.`);
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error('Error deleting file from Supabase Storage:', error);
      // Improve error message for better user guidance
      if (error.message && error.message.includes('new row violates row-level security policy')) {
        return { error: new Error('Storage policy violation. Please check your Supabase Storage policies. You may need to review the RLS policies for your bucket.') };
      }
      return { error };
    }

    console.log('File deleted successfully');
    return { error: null };
  } catch (err) {
    console.error('Unexpected error deleting file from Supabase Storage:', err);
    return { error: err };
  }
}

/**
 * Get the public URL for a file in Supabase Storage
 * @param {string} fileName - The name of the file
 * @param {string} bucketName - The storage bucket name (default: 'images')
 * @returns {string} The public URL of the file
 */
function getPublicUrlFromSupabase(fileName, bucketName = 'images') {
  try {
    console.log(`Getting public URL for file: ${fileName} in bucket: ${bucketName}`);
    
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    console.log('Public URL retrieved:', data.publicUrl);
    return data.publicUrl;
  } catch (err) {
    console.error('Error getting public URL from Supabase Storage:', err);
    return null;
  }
}

module.exports = {
  uploadFileToSupabase,
  deleteFileFromSupabase,
  getPublicUrlFromSupabase
};