require('dotenv').config();

// Use the same Supabase client as the application
const supabase = require('./supabaseClient');

console.log('Using Supabase client from supabaseClient.js');
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.SUPABASE_KEY);

async function debugStorage() {
  try {
    console.log('Testing Supabase Storage...');
    
    // Test basic connection
    console.log('Testing basic database connection...');
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (dbError) {
      console.error('Database connection error:', dbError.message);
      return;
    }
    
    console.log('Database connection successful');
    
    // List all buckets to check if 'images' bucket exists
    console.log('Listing all storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError.message);
      console.error('Error details:', listError);
      return;
    }
    
    console.log('Available buckets:', buckets);
    
    if (buckets && buckets.length > 0) {
      console.log('Bucket count:', buckets.length);
      buckets.forEach((bucket, index) => {
        console.log(`Bucket ${index + 1}:`, bucket);
      });
    } else {
      console.log('No buckets found');
    }
    
    // Check if 'images' bucket exists
    const imagesBucket = buckets ? buckets.find(bucket => bucket.name === 'images') : null;
    if (!imagesBucket) {
      console.log("Bucket 'images' not found in the list");
    } else {
      console.log("Bucket 'images' found:", imagesBucket);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
    console.error('Error stack:', err.stack);
  }
}

debugStorage();