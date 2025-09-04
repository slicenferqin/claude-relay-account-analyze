module.exports = {
  apps: [{
    name: 'dashboard-simple',
    script: './packages/backend/dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // 自动重启配置
    min_uptime: '10s',
    max_restarts: 10,
    
    // 健康检查
    kill_timeout: 5000,
    
    // 环境变量
    env_file: './packages/backend/.env'
  }],
  
  // 部署配置（可选）
  deploy: {
    production: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/account-dashboard.git',
      path: '/opt/account-dashboard',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};