'use strict';

module.exports = {
  apps: [
    {
      name: 'mtc-api',
      script: 'server.js',
      cwd: __dirname,
      node_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 10000,
      env_production: {
        APP_ENVIRONMENT: 'production',
        NODE_ENV: 'production',
        API_HOST: '127.0.0.1',
        PUBLIC_APP_ORIGIN: 'https://amarilyspm.vercel.app'
      }
    },
    {
      name: 'mtc-ngrok',
      script: 'C:\\Maintenance App\\python program\\ngrok.exe',
      args: 'http --domain=unretired-skewer-driven.ngrok-free.dev 3000',
      cwd: __dirname,
      interpreter: 'none',
      autorestart: true,
      watch: false,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000
    }
  ]
};
