/**
 * Helper script to check if port 4000 is in use
 * and provide instructions to free it
 */

const { exec } = require('child_process');
const os = require('os');

const PORT = 4000;
const platform = os.platform();

console.log(`Checking if port ${PORT} is in use...\n`);

if (platform === 'win32') {
  // Windows
  exec(`netstat -ano | findstr :${PORT}`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Port ${PORT} is available!`);
      process.exit(0);
    } else {
      console.log(`❌ Port ${PORT} is in use by the following process(es):\n`);
      console.log(stdout);
      console.log('\nTo free the port, run:');
      console.log(`  netstat -ano | findstr :${PORT}`);
      console.log('  taskkill /PID <PID> /F');
      console.log('\nOr kill all Node.js processes:');
      console.log('  taskkill /IM node.exe /F');
      process.exit(1);
    }
  });
} else {
  // Mac/Linux
  exec(`lsof -ti:${PORT}`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Port ${PORT} is available!`);
      process.exit(0);
    } else {
      const pid = stdout.trim();
      console.log(`❌ Port ${PORT} is in use by process ${pid}`);
      console.log('\nTo free the port, run:');
      console.log(`  kill -9 ${pid}`);
      console.log('\nOr kill all processes on this port:');
      console.log(`  lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    }
  });
}

