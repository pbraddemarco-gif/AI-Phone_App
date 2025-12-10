// Proxy monitoring service for development
// Checks if proxy/server.js is running, restarts if needed, logs status

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const PROXY_PATH = path.join(__dirname, 'server.js');
const HEALTH_URL = 'http://localhost:3001/health';
const CHECK_INTERVAL = 10000; // 10 seconds
const RESTART_DELAY = 2000; // 2 seconds

let proxyProcess = null;
let restartAttempts = 0;

function log(msg) {
  console.log(`[Monitor ${new Date().toISOString()}] ${msg}`);
}

function killPortProcess(port) {
  try {
    // Windows PowerShell command to get and kill process using the port
    const cmd = `$processId = (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess); if ($processId -and $processId -ne 0) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }`;
    execSync(`powershell.exe -Command "${cmd}"`);
    log(`Killed process using port ${port}`);
  } catch (err) {
    log(`No process found using port ${port} or failed to kill: ${err.message}`);
  }
}

function startProxy() {
  killPortProcess(3001);
  log('Starting proxy server...');
  proxyProcess = spawn('node', [PROXY_PATH], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  });
  proxyProcess.on('exit', (code, signal) => {
    log(`Proxy exited with code ${code}, signal ${signal}`);
    proxyProcess = null;
    setTimeout(() => startProxy(), RESTART_DELAY);
  });
  restartAttempts = 0;
}

function checkHealth() {
  http
    .get(HEALTH_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('ok')) {
          log('Proxy health OK');
          restartAttempts = 0;
        } else {
          log('Proxy health check failed, restarting...');
          restartProxy();
        }
      });
    })
    .on('error', (err) => {
      log('Health check error: ' + err.message);
      restartProxy();
    });
}

function restartProxy() {
  if (proxyProcess) {
    proxyProcess.kill();
  } else {
    startProxy();
  }
  restartAttempts++;
  if (restartAttempts > 5) {
    log('Proxy failed repeatedly. Manual intervention may be required.');
  }
}

function monitorLoop() {
  setInterval(() => {
    if (!proxyProcess) {
      log('Proxy not running, starting...');
      startProxy();
    } else {
      checkHealth();
    }
  }, CHECK_INTERVAL);
}

// Start monitoring
startProxy();
monitorLoop();
