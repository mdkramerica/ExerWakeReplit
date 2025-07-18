// Script to run the compliance portal instead of the main app
const { execSync } = require('child_process');
const path = require('path');

console.log('Switching to Hand Assessment Compliance Portal...');

// Change to the compliance portal directory
process.chdir(path.join(__dirname, 'hand-assessment-compliance-portal'));

// Run the dev command
execSync('npm run dev', { stdio: 'inherit' });