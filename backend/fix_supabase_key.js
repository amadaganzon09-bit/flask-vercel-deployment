const fs = require('fs');

console.log('=== Supabase Key Fixer ===');
console.log('This script will help you update your .env file to use the service_role key.');
console.log('\nPlease follow these steps:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to Settings → API');
console.log('3. Copy the service_role key (NOT the anon key)');
console.log('4. Paste it below when prompted');
console.log('\nNote: The service_role key starts with "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
console.log('and has "service_role" in the decoded payload.');

// In a real implementation, you would prompt for the key here
// For now, we'll just show instructions
console.log('\nAfter you get the service_role key, update your .env file:');
console.log('- Open .env file in a text editor');
console.log('- Find the SUPABASE_KEY line');
console.log('- Replace the value with your service_role key');
console.log('- Save the file');
console.log('\nThen test again with: node test_supabase_storage.js');