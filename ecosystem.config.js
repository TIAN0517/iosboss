module.exports = {
  apps: [{
    name: 'gas-station',
    script: 'cmd.exe',
    args: '/c npm run start',
    cwd: 'C:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 9999
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: true,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    listen_timeout: 10000
  }]
}
