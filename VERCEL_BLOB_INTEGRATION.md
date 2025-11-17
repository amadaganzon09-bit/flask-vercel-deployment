# Vercel Blob Integration for Image Uploads

This document explains how the application now uses Vercel Blob storage for handling image uploads in production deployments.

## Overview

The application has been updated to use Vercel Blob storage for image uploads when deployed on Vercel, while maintaining local file storage for development environments. This provides better scalability and reliability for production deployments.

## Key Changes

### 1. New Dependencies

- Added `@vercel/blob` package for handling Vercel Blob storage operations

### 2. Updated Multer Configuration

The multer configuration in `backend/utils/multer.js` now uses:
- `memoryStorage()` for Vercel deployments (stores files in memory for direct upload to Vercel Blob)
- `diskStorage()` for local development (stores files on disk as before)

### 3. New Vercel Blob Utility

A new utility file `backend/utils/vercelBlob.js` was created with:
- `uploadToVercelBlob()` function that handles uploading files to Vercel Blob storage

### 4. Updated Controllers

#### Account Controller (`backend/controllers/accountController.js`)
- Modified `createAccount()` and `updateAccount()` functions to use Vercel Blob for image uploads in production
- Maintains existing local file handling for development environments
- Updated error handling to properly manage file cleanup

#### User Controller (`backend/controllers/userController.js`)
- Modified `uploadProfilePicture()` function to use Vercel Blob for profile picture uploads in production
- Maintains existing local file handling for development environments
- Updated response handling to correctly return Vercel Blob URLs
- Updated error handling to properly manage file cleanup

### 5. Frontend Compatibility

The frontend code in `frontend/js/dashboard.js` already correctly handles:
- Direct URLs for images (works with both local paths and Vercel Blob URLs)
- Profile picture updates
- Account image displays

## How It Works

### In Development (Local)
1. Files are stored on disk in the `frontend/images` directory
2. Image paths are stored in the database as relative paths
3. Frontend accesses images directly via the static file server

### In Production (Vercel)
1. Files are uploaded directly to Vercel Blob storage
2. Image URLs are stored in the database as full URLs
3. Frontend accesses images directly from Vercel Blob storage

## Environment Variables

No new environment variables are required. The system automatically detects Vercel deployment using the `VERCEL` environment variable.

## Benefits

1. **Scalability**: Images are stored in a dedicated storage service
2. **Reliability**: Vercel Blob provides high availability and durability
3. **Performance**: Images are served from a CDN
4. **Cost-effective**: Pay only for storage and bandwidth used
5. **Seamless**: No changes required in frontend code
6. **Backward Compatible**: Local development workflow remains unchanged

## Implementation Details

### File Upload Flow

1. User selects an image file in the frontend
2. File is sent to the backend via multipart form data
3. Backend detects deployment environment:
   - **Vercel**: Uploads file to Vercel Blob and stores the URL in the database
   - **Local**: Saves file to disk and stores the relative path in the database
4. Database stores either a relative path (local) or full URL (Vercel Blob)
5. Frontend receives the image reference and displays it directly

### Error Handling

- If Vercel Blob upload fails, the operation is aborted with an error message
- Local file cleanup is only performed in development environments
- Database updates are only committed if file uploads succeed

## Testing

To test the integration:
1. Deploy to Vercel and verify image uploads work correctly
2. Run locally and verify image uploads still work as before
3. Check that existing images continue to display correctly

## Future Improvements

1. Add automatic cleanup of unused images
2. Implement image optimization/resizing before upload
3. Add support for other cloud storage providers