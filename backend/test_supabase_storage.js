require('dotenv').config();

// Use the same Supabase client as the application
const supabase = require('./supabaseClient');

console.log('Using Supabase client from supabaseClient.js');
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.SUPABASE_KEY);

async function testStorage() {
  try {
    console.log('Testing Supabase Storage...');
    
    // List all buckets to check if 'images' bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError.message);
      return false;
    }
    
    console.log('Available buckets:', buckets);
    
    // Check if 'images' bucket exists
    const imagesBucket = buckets.find(bucket => bucket.name === 'images');
    if (!imagesBucket) {
      console.error("Bucket 'images' not found. Please create it in your Supabase dashboard.");
      return false;
    }
    
    console.log("Bucket 'images' found:", imagesBucket);
    
    // Try to create a test file in the images bucket
    const testFileName = 'test-file.txt';
    const testFileContent = 'This is a test file to verify Supabase Storage functionality.';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(testFileName, testFileContent, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading test file:', uploadError.message);
      
      // Check if it's a policy violation error
      if (uploadError.message.includes('new row violates row-level security policy')) {
        console.error('This indicates a policy issue. Please ensure you have the correct RLS policies set up.');
        console.error('Run the SQL commands from backend/sql/supabase_storage_policies.sql in your Supabase SQL Editor.');
      }
      
      return false;
    }
    
    console.log('Test file uploaded successfully:', uploadData);
    
    // Try to get the public URL for the test file
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(testFileName);
    
    console.log('Public URL for test file:', publicUrlData.publicUrl);
    
    // Try to delete the test file
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([testFileName]);
    
    if (deleteError) {
      console.error('Error deleting test file:', deleteError.message);
      return false;
    }
    
    console.log('Test file deleted successfully');
    
    console.log('Supabase Storage is working correctly!');
    return true;
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return false;
  }
}

testStorage().then(success => {
  if (success) {
    console.log('Supabase Storage setup is correct!');
  } else {
    console.log('Please check your Supabase Storage setup.');
    console.log('Ensure that:');
    console.log('1. The "images" bucket exists in your Supabase Storage');
    console.log('2. The RLS policies are correctly set up (see backend/sql/supabase_storage_policies.sql)');
    console.log('3. Your Supabase credentials are correct');
  }
});