require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

console.log('Initializing Supabase client');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

// Check if Supabase credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found in environment variables');
  console.warn('Make sure to set SUPABASE_URL and SUPABASE_KEY in your Vercel environment variables');
}

// Create Supabase client
let supabase;
try {
  console.log('Creating Supabase client with URL and Key');
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Error creating Supabase client:', error.message);
  // Create a mock client for development
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => Promise.resolve({ data: [], error: null }),
      delete: () => Promise.resolve({ data: [], error: null }),
      upsert: () => Promise.resolve({ data: [], error: null })
    }),
    rpc: () => Promise.resolve({ data: [], error: null })
  };
}

// Export the Supabase client
module.exports = supabase;