module.exports = {
  apps: [
    {
      name: 'mtc-server',
      script: './mtc-checklist/backend/server.py',
      interpreter: 'python',
      instances: 1,
      exec_mode: 'fork',
      env: {
        FLASK_ENV: 'development',
        DEBUG: 'True'
      },
      env_production: {
        FLASK_ENV: 'production',
        DEBUG: 'False'
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
