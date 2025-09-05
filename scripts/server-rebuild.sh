#!/bin/bash

# 服务器重新构建脚本
# 用于清理旧依赖并重新构建项目

echo "========================================="
echo "开始重新构建 Account Dashboard 项目"
echo "========================================="

# 1. 停止当前运行的服务
echo "1. 停止当前服务..."
pm2 stop account-dashboard-backend 2>/dev/null || true
pm2 delete account-dashboard-backend 2>/dev/null || true

# 2. 进入项目目录
cd /root/account-dashboard || exit 1

# 3. 拉取最新代码
echo "2. 拉取最新代码..."
git pull origin main

# 4. 清理所有 node_modules 和缓存
echo "3. 清理旧的依赖和缓存..."
rm -rf node_modules
rm -rf packages/frontend/node_modules
rm -rf packages/backend/node_modules
rm -rf packages/shared/node_modules
rm -f package-lock.json
rm -f packages/*/package-lock.json

# 清理构建产物
rm -rf packages/backend/dist
rm -rf packages/backend/public
rm -rf packages/shared/dist

# 5. 安装依赖
echo "4. 安装新的依赖..."
npm install

# 6. 构建项目
echo "5. 构建项目..."
npm run build

# 7. 启动服务
echo "6. 启动服务..."
cd packages/backend
pm2 start dist/index.js --name account-dashboard-backend

# 8. 保存 PM2 配置
pm2 save
pm2 startup

echo "========================================="
echo "重新构建完成！"
echo "========================================="
echo ""
echo "检查服务状态："
pm2 status
echo ""
echo "查看日志："
echo "pm2 logs account-dashboard-backend"