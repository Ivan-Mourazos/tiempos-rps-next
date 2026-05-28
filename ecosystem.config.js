module.exports = {
  apps: [
    {
      name: 'tiempos-rps-next',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};

