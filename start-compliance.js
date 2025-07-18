const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Hand Assessment Compliance Portal...');

// Change to the compliance portal directory
const portalPath = path.join(__dirname, 'hand-assessment-compliance-portal');
process.chdir(portalPath);

console.log('Current directory:', process.cwd());
console.log('Starting server and client...');

// Run the dev command which starts both server and client
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