const fs = require('fs');

// Read the .env file
const envPath = '.env';
let envContent = fs.readFileSync(envPath, 'utf8');

console.log('Current .env content:');
console.log(envContent);

// Extract the SUPABASE_KEY line
const keyLine = envContent.match(/SUPABASE_KEY=.*/);
if (keyLine) {
  console.log('\nCurrent SUPABASE_KEY:');
  console.log(keyLine[0]);
  
  // Check if it's an anon key or service_role key
  const key = keyLine[0].split('=')[1];
  try {
    const decoded = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
    console.log('\nKey details:');
    console.log('Role:', decoded.role);
    console.log('Issued at:', new Date(decoded.iat * 1000));
    console.log('Expires at:', new Date(decoded.exp * 1000));
    
    if (decoded.role === 'anon') {
      console.log('\n⚠️  WARNING: You are using an anon key.');
      console.log('For full storage access, you should use a service_role key.');
      console.log('\nTo fix this:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to Settings → API');
      console.log('3. Copy the service_role key (NOT the anon key)');
      console.log('4. Replace the SUPABASE_KEY value in your .env file');
    } else if (decoded.role === 'service_role') {
      console.log('\n✅ You are using a service_role key, which is correct for storage operations.');
    } else {
      console.log('\n❓ Unknown key role:', decoded.role);
    }
  } catch (err) {
    console.log('\nCould not decode key:', err.message);
  }
} else {
  console.log('SUPABASE_KEY not found in .env file');
}