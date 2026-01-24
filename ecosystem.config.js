module.exports = {
  apps: [{
    name: 'gas-station-dev',
    script: 'server.js',
    cwd: 'C:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 9999
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    restart_delay: 4000,
    kill_timeout: 5000,
    autodump: true
  }]
}
