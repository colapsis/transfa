module.exports = {
  apps: [{
    name: 'transfa-server',
    script: './server/index.js',
    cwd: '/var/www/transfa',
    instances: 2,
    exec_mode: 'cluster',
    // Cap each worker so 2 workers + OS fit comfortably in 3.8 GB
    max_memory_restart: '800M',
    node_args: '--max-old-space-size=768',
    env: {
      NODE_ENV: 'production',
    },
    // Merge logs from both workers into single files
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // Give in-flight uploads 30 s to finish before hard kill
    kill_timeout: 30000,
    listen_timeout: 10000,
    // Restart if the process file errors; avoid restart loops on config bugs
    max_restarts: 10,
    restart_delay: 2000,
  }],
};
