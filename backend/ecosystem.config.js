'use strict';

module.exports = {
  apps: [{
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
      API_HOST: '127.0.0.1'
    }
  }]
};
