require('dotenv').config();

// Use the same Supabase client as the application
const supabase = require('./supabaseClient');

console.log('Using Supabase client from supabaseClient.js');

async function testCreateBucket() {
  try {
    console.log('Testing Supabase Storage bucket creation...');
    
    // Try to create the 'images' bucket
    console.log('Attempting to create "images" bucket...');
    const { data, error } = await supabase.storage.createBucket('images', {
      public: true
    });
    
    if (error) {
      console.error('Error creating bucket:', error.message);
      console.error('Error details:', error);
      return;
    }
    
    console.log('Bucket created successfully:', data);
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
    console.error('Error stack:', err.stack);
  }
}

testCreateBucket();