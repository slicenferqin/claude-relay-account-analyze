# Redis账号看板部署发布文档

## 1. 部署架构概述

### 1.1 生产环境架构
```
┌─────────────────────────────────────────────────────────────┐
│                    阿里云ECS服务器                            │
│                  (118.178.186.69)                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Docker容器                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │  │   Nginx    │  │  Backend   │  │   Frontend   │  │  │
│  │  │  (80/443)  │  │   (3000)   │  │    (5173)    │  │  │
│  │  └────────────┘  └────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────┐                        │
│                    │     Redis     │                        │
│                    │    (6379)     │                        │
│                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 部署要求
- **服务器配置**: 最低2核4G内存
- **操作系统**: Ubuntu 20.04 LTS 或 CentOS 7+
- **软件要求**: Docker 20.10+, Docker Compose 2.0+
- **域名**: 需要一个域名并配置SSL证书

## 2. 环境准备

### 2.1 服务器初始化
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget vim htop

# 设置时区
sudo timedatectl set-timezone Asia/Shanghai

# 配置防火墙
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Backend API (可选，建议通过Nginx代理)
sudo ufw enable
```

### 2.2 安装Docker和Docker Compose
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 添加当前用户到docker组
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 2.3 安装Node.js（用于本地构建）
```bash
# 使用nvm安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node --version
npm --version
```

## 3. 项目部署配置

### 3.1 Docker配置文件

#### docker/Dockerfile.frontend
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY packages/frontend/package*.json ./
RUN npm ci

# 复制源代码并构建
COPY packages/frontend/ ./
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### docker/Dockerfile.backend
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY packages/backend/package*.json ./
RUN npm ci --only=production

# 复制编译后的代码
COPY packages/backend/dist ./dist
COPY packages/backend/.env.production ./.env

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD ["node", "dist/index.js"]
```

#### docker/nginx.conf
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # 缓存策略
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket代理
    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康检查端点
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    container_name: dashboard-frontend
    restart: unless-stopped
    networks:
      - dashboard-network
    depends_on:
      - backend

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    container_name: dashboard-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - REDIS_HOST=host.docker.internal
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
    ports:
      - "3000:3000"
    networks:
      - dashboard-network
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: dashboard-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    networks:
      - dashboard-network
    depends_on:
      - frontend
      - backend

networks:
  dashboard-network:
    driver: bridge

volumes:
  nginx_cache:
```

### 3.2 环境变量配置

#### .env.production
```env
# 服务器配置
NODE_ENV=production
PORT=3000

# Redis配置
REDIS_HOST=118.178.186.69
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 前端URL（用于CORS）
FRONTEND_URL=https://your-domain.com

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/dashboard/app.log

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
```

## 4. 部署脚本

### 4.1 自动化部署脚本

#### scripts/deploy.sh
```bash
#!/bin/bash

# 部署脚本
set -e

echo "========================================="
echo "Redis Account Dashboard Deployment Script"
echo "========================================="

# 配置变量
DEPLOY_ENV=${1:-production}
BRANCH=${2:-main}
DEPLOY_DIR="/opt/account-dashboard"
BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要条件
check_requirements() {
    log_info "Checking requirements..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi
    
    log_info "All requirements satisfied"
}

# 备份当前版本
backup_current() {
    if [ -d "$DEPLOY_DIR" ]; then
        log_info "Backing up current deployment..."
        mkdir -p "$BACKUP_DIR"
        tar -czf "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" -C "$DEPLOY_DIR" .
        log_info "Backup saved to $BACKUP_DIR/backup_${TIMESTAMP}.tar.gz"
    fi
}

# 拉取最新代码
pull_latest_code() {
    log_info "Pulling latest code from branch: $BRANCH"
    
    if [ ! -d "$DEPLOY_DIR" ]; then
        log_info "Cloning repository..."
        git clone https://github.com/your-username/account-dashboard.git "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
        git checkout "$BRANCH"
    else
        cd "$DEPLOY_DIR"
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    fi
}

# 构建前端
build_frontend() {
    log_info "Building frontend..."
    cd "$DEPLOY_DIR/packages/frontend"
    npm ci
    npm run build
}

# 构建后端
build_backend() {
    log_info "Building backend..."
    cd "$DEPLOY_DIR/packages/backend"
    npm ci
    npm run build
}

# 构建Docker镜像
build_docker_images() {
    log_info "Building Docker images..."
    cd "$DEPLOY_DIR"
    docker-compose -f docker/docker-compose.yml build --no-cache
}

# 停止旧容器
stop_old_containers() {
    log_info "Stopping old containers..."
    cd "$DEPLOY_DIR"
    docker-compose -f docker/docker-compose.yml down || true
}

# 启动新容器
start_new_containers() {
    log_info "Starting new containers..."
    cd "$DEPLOY_DIR"
    docker-compose -f docker/docker-compose.yml up -d
}

# 健康检查
health_check() {
    log_info "Performing health check..."
    sleep 10
    
    # 检查后端健康状态
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_info "Backend is healthy"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # 检查前端
    if curl -f http://localhost > /dev/null 2>&1; then
        log_info "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
        return 1
    fi
    
    return 0
}

# 清理旧镜像
cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
}

# 回滚函数
rollback() {
    log_error "Deployment failed, rolling back..."
    
    if [ -f "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" ]; then
        cd "$DEPLOY_DIR"
        docker-compose -f docker/docker-compose.yml down
        rm -rf "$DEPLOY_DIR/*"
        tar -xzf "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" -C "$DEPLOY_DIR"
        docker-compose -f docker/docker-compose.yml up -d
        log_info "Rollback completed"
    else
        log_error "No backup found for rollback"
    fi
}

# 主部署流程
main() {
    log_info "Starting deployment for environment: $DEPLOY_ENV"
    
    # 设置错误处理
    trap 'rollback' ERR
    
    check_requirements
    backup_current
    pull_latest_code
    build_frontend
    build_backend
    build_docker_images
    stop_old_containers
    start_new_containers
    
    if health_check; then
        cleanup_old_images
        log_info "========================================="
        log_info "Deployment completed successfully!"
        log_info "========================================="
    else
        rollback
        exit 1
    fi
}

# 执行主流程
main
```

### 4.2 快速部署脚本

#### scripts/quick-deploy.sh
```bash
#!/bin/bash

# 快速部署脚本（用于更新代码不重建镜像）
set -e

DEPLOY_DIR="/opt/account-dashboard"

echo "Quick deployment starting..."

cd "$DEPLOY_DIR"

# 拉取最新代码
git pull origin main

# 仅构建应用
cd packages/frontend && npm run build
cd ../backend && npm run build

# 重启容器
cd "$DEPLOY_DIR"
docker-compose -f docker/docker-compose.yml restart

echo "Quick deployment completed!"
```

## 5. SSL证书配置

### 5.1 使用Let's Encrypt免费证书
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo systemctl enable certbot.timer
```

### 5.2 配置Nginx SSL
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... 其他配置
}
```

## 6. 监控和日志

### 6.1 日志管理
```bash
# 查看容器日志
docker logs dashboard-backend -f
docker logs dashboard-frontend -f
docker logs dashboard-nginx -f

# 日志轮转配置 /etc/logrotate.d/dashboard
/opt/account-dashboard/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        docker exec dashboard-backend kill -USR1 1
    endscript
}
```

### 6.2 监控配置

#### 使用Prometheus + Grafana
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      
volumes:
  prometheus_data:
  grafana_data:
```

### 6.3 告警配置
```bash
# 配置邮件告警
# /opt/account-dashboard/scripts/alert.sh

#!/bin/bash

check_service() {
    if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "Backend service is down" | mail -s "Dashboard Alert" admin@example.com
    fi
}

# 添加到crontab
*/5 * * * * /opt/account-dashboard/scripts/alert.sh
```

## 7. 备份策略

### 7.1 自动备份脚本
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 备份应用数据
docker exec dashboard-backend npm run export -- --output "/tmp/data_${TIMESTAMP}.json"
docker cp dashboard-backend:/tmp/data_${TIMESTAMP}.json "$BACKUP_DIR/"

# 备份配置文件
tar -czf "$BACKUP_DIR/config_${TIMESTAMP}.tar.gz" \
    /opt/account-dashboard/.env \
    /opt/account-dashboard/docker/

# 清理旧备份（保留30天）
find "$BACKUP_DIR" -type f -mtime +30 -delete

# 同步到远程存储（可选）
# rsync -av "$BACKUP_DIR/" backup-server:/backups/dashboard/
```

### 7.2 定时备份
```bash
# 添加到crontab
0 2 * * * /opt/account-dashboard/scripts/backup.sh
```

## 8. 故障恢复

### 8.1 服务恢复流程
```bash
# 1. 检查服务状态
docker-compose -f docker/docker-compose.yml ps

# 2. 重启服务
docker-compose -f docker/docker-compose.yml restart

# 3. 如果容器损坏，重新构建
docker-compose -f docker/docker-compose.yml up -d --force-recreate

# 4. 从备份恢复
tar -xzf /opt/backups/backup_TIMESTAMP.tar.gz -C /opt/account-dashboard/
docker-compose -f docker/docker-compose.yml up -d
```

### 8.2 数据恢复
```bash
# 导入备份数据
docker exec dashboard-backend npm run import -- --file /tmp/data_backup.json
```

## 9. 性能优化

### 9.1 系统优化
```bash
# 优化内核参数 /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30

# 应用配置
sudo sysctl -p
```

### 9.2 Docker优化
```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

## 10. 安全加固

### 10.1 防火墙配置
```bash
# 仅允许必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 10.2 SSH安全
```bash
# 修改SSH配置 /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# 重启SSH服务
sudo systemctl restart sshd
```

### 10.3 Docker安全
```yaml
# docker-compose中添加安全配置
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

## 11. 升级流程

### 11.1 零停机升级
```bash
#!/bin/bash
# scripts/upgrade.sh

# 1. 构建新版本镜像
docker-compose -f docker/docker-compose.yml build

# 2. 启动新容器（使用不同端口）
docker-compose -f docker/docker-compose.blue.yml up -d

# 3. 健康检查
sleep 10
if curl -f http://localhost:3001/health; then
    # 4. 切换流量
    docker-compose -f docker/docker-compose.yml down
    docker-compose -f docker/docker-compose.blue.yml down
    docker-compose -f docker/docker-compose.yml up -d
else
    docker-compose -f docker/docker-compose.blue.yml down
    echo "Upgrade failed"
    exit 1
fi
```

## 12. 运维检查清单

### 12.1 日常检查
- [ ] 服务健康状态
- [ ] 磁盘空间使用率
- [ ] 内存使用情况
- [ ] CPU负载
- [ ] 日志是否有异常
- [ ] Redis连接状态

### 12.2 周期性维护
- [ ] 清理Docker无用镜像和容器
- [ ] 日志文件轮转
- [ ] 备份文件检查
- [ ] SSL证书有效期
- [ ] 系统更新和补丁

## 13. 故障排查

### 13.1 常见问题
```bash
# 问题1: 容器无法启动
docker logs dashboard-backend
docker logs dashboard-frontend

# 问题2: Redis连接失败
docker exec dashboard-backend ping 118.178.186.69
telnet 118.178.186.69 6379

# 问题3: 内存不足
free -h
docker stats

# 问题4: 端口占用
netstat -tlnp | grep :3000
lsof -i :3000
```

### 13.2 应急联系方式
- 运维负责人: XXX (电话: XXX)
- 开发负责人: XXX (电话: XXX)
- 阿里云技术支持: 95187

## 14. 部署验收

### 14.1 功能验收
- [ ] API Key统计表格正常显示
- [ ] 账号统计看板数据准确
- [ ] 实时数据更新功能正常
- [ ] 数据导出功能可用
- [ ] WebSocket连接稳定

### 14.2 性能验收
- [ ] 页面加载时间 < 3秒
- [ ] API响应时间 < 500ms
- [ ] 并发用户数支持 > 100
- [ ] CPU使用率 < 70%
- [ ] 内存使用率 < 80%

---

本文档为Redis账号看板项目的完整部署指南，请严格按照步骤执行，确保系统稳定运行。