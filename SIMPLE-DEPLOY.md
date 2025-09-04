# Redis账号看板 - 简化部署指南

这是一个简化的部署方案，无需Docker、nginx、域名、SSL证书等复杂配置，只需要在服务器启动到指定端口，通过IP+端口即可访问。

## 🚀 快速部署

### 1. 环境准备

**系统要求：**
- Linux服务器（Ubuntu/CentOS）
- Node.js 18+ 
- Redis服务器

**安装Node.js：**
```bash
# 使用NodeSource仓库安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或者使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. 部署步骤

#### 上传代码到服务器
```bash
# 方式1: 直接下载
git clone https://github.com/your-repo/account-dashboard.git
cd account-dashboard

# 方式2: 上传代码包
scp -r ./account-dashboard root@your-server-ip:/opt/
ssh root@your-server-ip "cd /opt/account-dashboard"
```

#### 配置Redis连接
```bash
# 编辑环境配置
cp .env.simple packages/backend/.env

# 修改Redis配置
nano packages/backend/.env
```

修改以下配置项：
```env
REDIS_HOST=127.0.0.1    # Redis服务器IP
REDIS_PORT=6379         # Redis端口
REDIS_PASSWORD=         # Redis密码（如果有）
PORT=8080              # 应用端口
```

#### 一键部署
```bash
# 执行部署脚本
./deploy-simple.sh

# 或手动部署
chmod +x deploy-simple.sh
./deploy-simple.sh
```

### 3. 访问应用

部署完成后，通过以下地址访问：

- **应用首页**: `http://your-server-ip:8080`
- **健康检查**: `http://your-server-ip:8080/health`
- **API接口**: `http://your-server-ip:8080/api/`

## 🔧 服务管理

### PM2命令（推荐）

如果安装了PM2，可以使用以下命令管理服务：

```bash
# 安装PM2（全局）
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js --env production

# 查看服务状态
pm2 status

# 查看日志
pm2 logs dashboard-simple

# 重启服务
pm2 restart dashboard-simple

# 停止服务
pm2 stop dashboard-simple

# 删除服务
pm2 delete dashboard-simple

# 保存PM2配置
pm2 save

# 设置开机启动
pm2 startup
```

### 直接运行

如果不使用PM2，也可以直接运行：

```bash
cd packages/backend
PORT=8080 NODE_ENV=production node dist/index.js
```

### 后台运行（nohup）

```bash
cd packages/backend
nohup PORT=8080 NODE_ENV=production node dist/index.js > ../../logs/app.log 2>&1 &
```

## 🔒 防火墙配置

如果服务器开启了防火墙，需要开放端口：

```bash
# Ubuntu (ufw)
sudo ufw allow 8080
sudo ufw reload

# CentOS (firewalld)  
sudo firewall-cmd --zone=public --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

## 📊 监控和日志

### 查看应用日志
```bash
# PM2日志
pm2 logs dashboard-simple

# 直接查看日志文件
tail -f logs/combined.log
tail -f logs/error.log
```

### 监控应用状态
```bash
# PM2监控
pm2 monit

# 资源使用情况
htop
free -h
df -h
```

### 健康检查脚本
```bash
#!/bin/bash
# health-check.sh
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ $response -eq 200 ]; then
    echo "Service is healthy"
else
    echo "Service is unhealthy, restarting..."
    pm2 restart dashboard-simple
fi
```

```bash
# 设置定时健康检查
chmod +x health-check.sh
crontab -e
# 添加: */5 * * * * /path/to/health-check.sh
```

## 🔄 更新部署

### 更新代码
```bash
# 拉取最新代码
git pull origin main

# 重新构建和重启
npm run build
pm2 restart dashboard-simple
```

### 快速更新脚本
```bash
#!/bin/bash
# update.sh
set -e

echo "正在更新应用..."

# 拉取最新代码
git pull origin main

# 安装新依赖（如果有）
npm install

# 构建前端
cd packages/frontend
npm run build
cd ../..

# 构建后端
cd packages/backend  
npm run build
cd ../..

# 重启服务
pm2 restart dashboard-simple

echo "更新完成！"
```

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :8080
netstat -tlnp | grep :8080

# 杀死占用进程
sudo kill -9 <PID>
```

#### 2. Redis连接失败
```bash
# 测试Redis连接
redis-cli -h 127.0.0.1 -p 6379 ping

# 检查Redis服务状态
sudo systemctl status redis
```

#### 3. Node.js版本问题
```bash
# 检查Node版本
node -v
npm -v

# 如果版本过低，升级Node.js
nvm install 18
nvm use 18
```

#### 4. 权限问题
```bash
# 确保日志目录可写
chmod 755 logs/
chown -R $USER:$USER logs/

# 确保脚本可执行
chmod +x deploy-simple.sh
```

### 日志分析
```bash
# 查看错误日志
grep -i error logs/error.log

# 查看最近的错误
tail -n 100 logs/error.log

# 实时监控日志
tail -f logs/combined.log
```

## 📝 环境配置说明

### .env.simple 配置项
```env
# 应用配置
NODE_ENV=production           # 运行环境
PORT=8080                    # 应用端口

# Redis配置
REDIS_HOST=127.0.0.1         # Redis服务器地址
REDIS_PORT=6379              # Redis端口
REDIS_PASSWORD=              # Redis密码（可选）
REDIS_DB=0                   # Redis数据库编号

# JWT配置
JWT_SECRET=your-secret-key   # JWT密钥（请修改）
JWT_EXPIRES_IN=7d           # JWT过期时间

# 日志配置
LOG_LEVEL=info              # 日志级别

# 监控配置
ENABLE_METRICS=false        # 是否启用监控
```

## 🔐 安全建议

1. **修改默认端口**: 避免使用常见端口如3000、8080等
2. **设置强密码**: 修改JWT_SECRET为强密码
3. **限制访问IP**: 配置防火墙只允许特定IP访问
4. **定期更新**: 保持Node.js和依赖包更新
5. **备份数据**: 定期备份Redis数据

## 📞 技术支持

如果遇到问题，请检查：
1. Node.js版本是否符合要求
2. Redis服务是否正常运行
3. 端口是否被占用
4. 防火墙是否正确配置
5. 日志文件中的错误信息

---

**部署完成后，你可以通过 `http://your-server-ip:8080` 访问Redis账号看板！**