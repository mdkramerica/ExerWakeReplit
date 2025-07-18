// Script to run the compliance portal instead of the main app
const { spawn } = require('child_process');
const path = require('path');

console.log('Switching to Hand Assessment Compliance Portal...');

// Change to the compliance portal directory
const portalPath = path.join(__dirname, 'hand-assessment-compliance-portal');
process.chdir(portalPath);

console.log('Starting compliance portal server...');

// Run the dev command
const child = spawn('npm', ['run', 'dev'], { 
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Error starting compliance portal:', error.message);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`Compliance portal exited with code ${code}`);
  process.exit(code);
});