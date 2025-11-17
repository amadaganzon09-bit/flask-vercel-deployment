const { put } = require('@vercel/blob');
const path = require('path');

/**
 * Uploads a file to Vercel Blob storage
 * @param {Object} file - The file object from multer
 * @param {string} folder - The folder name to store the file in
 * @returns {Promise<string>} - The URL of the uploaded file
 */
const uploadToVercelBlob = async (file, folder = 'images') => {
  try {
    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
    
    // Upload to Vercel Blob
    const blob = await put(`${folder}/${filename}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    
    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw new Error('Failed to upload file to Vercel Blob storage');
  }
};

module.exports = { uploadToVercelBlob };