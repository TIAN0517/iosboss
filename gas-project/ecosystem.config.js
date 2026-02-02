module.exports = {
  apps: [{
    name: 'gas-shop',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    cwd: '/root/媽媽ios/gas-project',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DATABASE_URL: 'postgresql://postgres:Ss520520@localhost:5432/mama_ios'
    }
  }]
};
