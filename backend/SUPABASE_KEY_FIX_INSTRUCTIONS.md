# Supabase Key Fix Instructions

You're encountering the "Bucket 'images' not found" error because you're using an anon key instead of a service_role key. The anon key has limited permissions and cannot access Supabase Storage properly.

## Issue Summary

- **Current Key Type**: anon key (limited permissions)
- **Required Key Type**: service_role key (full permissions)
- **Error**: "new row violates row-level security policy" when trying to access storage

## Fix Steps

### 1. Get the Service Role Key

1. Go to your [Supabase Dashboard](https://app.supabase.io/)
2. Select your project
3. Navigate to Settings → API
4. Scroll down to the "Service Role Key" section
5. Copy the service_role key (NOT the anon key)

### 2. Update Local Environment (.env file)

1. Open your `.env` file in a text editor
2. Find the line starting with `SUPABASE_KEY=`
3. Replace the entire value after the `=` with your service_role key
4. Save the file

### 3. Update Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Find the `SUPABASE_KEY` variable
5. Click the pencil icon to edit
6. Replace the value with your service_role key
7. Click "Save"
8. Redeploy your application

### 4. Verify the Fix

After updating the keys, test the storage functionality:

```bash
cd backend
node test_supabase_storage.js
```

You should now see your buckets listed, including the "images" bucket.

## Security Note

The service_role key has full access to your Supabase project. Keep it secure and never commit it to version control. The `.env` file should be in your `.gitignore` to prevent it from being uploaded to GitHub.

## Why This Happens

- The anon key is meant for client-side operations with limited permissions
- The service_role key is meant for server-side operations with full permissions
- Supabase Storage bucket listing and management requires service_role permissions
- Your database operations work with the anon key because they use RLS (Row Level Security) policies
- Storage operations bypass RLS and require the service_role key

Once you've updated your keys, your Supabase Storage should work correctly with your application.