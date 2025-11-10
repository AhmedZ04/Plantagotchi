/**
 * Helper script to free port 4000 by killing any process using it
 */

const { exec } = require('child_process');
const os = require('os');

const PORT = 4000;
const platform = os.platform();

console.log(`Freeing port ${PORT}...\n`);

if (platform === 'win32') {
  // Windows
  exec(`netstat -ano | findstr :${PORT} | findstr LISTENING`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Port ${PORT} is already free!`);
      process.exit(0);
    } else {
      // Extract PIDs from output
      const lines = stdout.trim().split('\n');
      const pids = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[parts.length - 1]; // Last column is PID
      }).filter(Boolean);

      if (pids.length === 0) {
        console.log(`✅ Port ${PORT} is already free!`);
        process.exit(0);
      }

      console.log(`Found ${pids.length} process(es) using port ${PORT}:`);
      pids.forEach(pid => console.log(`  - PID: ${pid}`));
      console.log('');

      // Kill each process
      let killed = 0;
      pids.forEach((pid, index) => {
        exec(`taskkill /PID ${pid} /F`, (error, stdout, stderr) => {
          if (error) {
            console.log(`⚠️  Failed to kill process ${pid}: ${error.message}`);
          } else {
            console.log(`✅ Killed process ${pid}`);
            killed++;
          }

          // If this is the last process, exit
          if (index === pids.length - 1) {
            if (killed > 0) {
              console.log(`\n✅ Port ${PORT} is now free!`);
            }
            process.exit(killed > 0 ? 0 : 1);
          }
        });
      });
    }
  });
} else {
  // Mac/Linux
  exec(`lsof -ti:${PORT}`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Port ${PORT} is already free!`);
      process.exit(0);
    } else {
      const pids = stdout.trim().split('\n').filter(Boolean);
      console.log(`Found ${pids.length} process(es) using port ${PORT}:`);
      pids.forEach(pid => console.log(`  - PID: ${pid}`));
      console.log('');

      exec(`lsof -ti:${PORT} | xargs kill -9`, (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ Failed to kill processes: ${error.message}`);
          process.exit(1);
        } else {
          console.log(`✅ Port ${PORT} is now free!`);
          process.exit(0);
        }
      });
    }
  });
}

