#!/bin/bash

# 简化部署脚本 - 单端口部署
set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# 配置变量
PORT=${PORT:-8080}
NODE_ENV=${NODE_ENV:-production}

log_info "========================================="
log_info "Redis Account Dashboard 简化部署脚本"
log_info "========================================="
log_info "部署端口: $PORT"
log_info "环境: $NODE_ENV"

# 检查Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js未安装，请先安装Node.js 18或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js版本过低，需要18或更高版本，当前版本: $(node -v)"
    exit 1
fi

log_info "Node.js版本检查通过: $(node -v)"

# 检查npm
if ! command -v npm &> /dev/null; then
    log_error "npm未安装"
    exit 1
fi

# 1. 安装依赖
log_info "安装项目依赖..."
npm install

# 2. 构建前端
log_info "构建前端应用..."
cd packages/frontend
npm run build
cd ../..

# 3. 构建后端
log_info "构建后端应用..."
cd packages/backend
npm run build
cd ../..

# 4. 复制环境配置文件
if [ -f ".env.simple" ]; then
    log_info "复制环境配置文件..."
    cp .env.simple packages/backend/.env
else
    log_warn "未找到.env.simple文件，使用默认配置"
fi

# 5. 检查是否已有进程在运行
if command -v pm2 &> /dev/null; then
    log_info "检查现有服务..."
    pm2 stop dashboard-simple 2>/dev/null || true
    pm2 delete dashboard-simple 2>/dev/null || true
fi

# 6. 启动服务
log_info "启动服务..."

if command -v pm2 &> /dev/null; then
    # 使用PM2启动
    PORT=$PORT NODE_ENV=$NODE_ENV pm2 start packages/backend/dist/index.js --name "dashboard-simple"
    pm2 save
    log_info "服务已使用PM2启动"
    log_info "查看日志: pm2 logs dashboard-simple"
    log_info "重启服务: pm2 restart dashboard-simple"
    log_info "停止服务: pm2 stop dashboard-simple"
else
    # 直接启动（前台运行）
    log_warn "未安装PM2，服务将在前台运行"
    log_info "建议安装PM2以便后台运行: npm install -g pm2"
    cd packages/backend
    PORT=$PORT NODE_ENV=$NODE_ENV node dist/index.js
fi

log_info "========================================="
log_info "部署完成！"
log_info "访问地址: http://localhost:$PORT"
log_info "健康检查: http://localhost:$PORT/health"
log_info "========================================="