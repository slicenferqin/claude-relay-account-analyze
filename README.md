# Account Dashboard

一个基于Vue 3 + TypeScript + Node.js的Redis账号数据监控看板系统。

## 项目概述

这是一个实时监控Redis中API Key和账号使用情况的看板应用，支持：

- **API Key管理**: 显示API Key使用统计、RPM、费用等信息
- **账号管理**: 展示账号Token使用量、费用消耗、分组信息  
- **分组管理**: 管理账号分组，查看分组统计
- **实时更新**: WebSocket实时数据推送
- **数据可视化**: ECharts图表展示趋势数据

## 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全
- **Element Plus** - Vue 3组件库
- **ECharts** - 数据可视化
- **Pinia** - 状态管理
- **Socket.io Client** - WebSocket客户端

### 后端
- **Node.js** - 运行时环境
- **Express** - Web框架
- **TypeScript** - 类型安全
- **Socket.io** - WebSocket服务
- **ioredis** - Redis客户端
- **Winston** - 日志系统

### 基础设施
- **Redis** - 数据存储
- **Docker** - 容器化部署
- **Nginx** - 反向代理

## 项目结构

```
account-dashboard/
├── packages/
│   ├── frontend/          # Vue前端应用
│   ├── backend/           # Node.js后端服务  
│   └── shared/            # 共享类型定义
├── docker/                # Docker配置
├── scripts/               # 部署脚本
└── docs/                  # 文档
```

## 快速开始

### 环境要求

- Node.js 18+
- Redis 6+
- Docker (可选)

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装所有子包依赖
npm run build
```

### 开发环境

1. **启动Redis**
   ```bash
   # 本地Redis或连接远程Redis
   # 配置backend/.env文件中的Redis连接信息
   ```

2. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp packages/backend/.env.example packages/backend/.env
   
   # 编辑配置文件
   vim packages/backend/.env
   ```

3. **启动开发服务**
   ```bash
   # 同时启动前后端开发服务
   npm run dev
   ```

4. **访问应用**
   - 前端: http://localhost:5173
   - 后端API: http://localhost:3000

### 生产部署

详见 [部署文档](docs/deployment-guide.md)

## 主要功能

### 📊 总览看板
- 实时系统指标
- 今日使用统计
- 费用趋势图表
- TOP用户排行

### 🔑 API Key管理
- API Key列表和状态
- 使用量和费用统计
- RPM监控
- 分组归属查看

### 👤 账号管理
- 账号使用统计卡片
- Token消耗监控
- 分组用户数统计
- 活跃度分析

### 👥 分组管理
- 分组列表管理
- 成员账户查看
- 关联API Keys

### 📈 实时更新
- WebSocket实时数据推送
- 自动刷新机制
- 连接状态监控

## 开发指南

### 代码规范
- 使用TypeScript进行类型检查
- 遵循ESLint配置规则
- 使用Prettier格式化代码

### 项目架构
- 前后端分离架构
- 共享TypeScript类型定义
- 状态管理使用Pinia
- WebSocket实现实时通信

### API设计
- RESTful API设计
- 统一响应格式
- 错误处理机制
- 请求速率限制

## 监控和运维

### 日志系统
- 使用Winston记录日志
- 支持多级别日志
- 生产环境文件日志

### 健康检查
- API健康检查端点
- Redis连接状态监控
- 系统性能指标

### 性能优化
- Redis连接池
- 数据缓存机制
- 前端组件懒加载
- 图片和资源优化

## 配置说明

### 后端配置 (packages/backend/.env)
```env
NODE_ENV=development
PORT=3000
REDIS_HOST=118.178.186.69
REDIS_PORT=6379
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

### 前端配置
- Vite代理配置
- Element Plus主题
- 图表库配置

## 故障排查

### 常见问题

1. **Redis连接失败**
   - 检查Redis服务状态
   - 验证连接配置
   - 确认网络连通性

2. **WebSocket连接断开**
   - 检查网络稳定性
   - 查看服务器日志
   - 验证CORS配置

3. **前端构建失败**
   - 清理node_modules
   - 检查依赖版本
   - 查看构建日志

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 技术支持

如有问题请查看[技术文档](docs/technical-design.md)或提交Issue。