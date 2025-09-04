# Redis账号看板技术设计文档

## 1. 项目概述

### 1.1 项目背景
基于Claude Relay Service的Redis数据存储，构建一个实时监控看板系统，用于管理和监控API Key使用情况以及账号统计信息。

### 1.2 项目目标
- 实时展示API Key使用统计（名称、最后使用时间、RPM、分组信息）
- 实时展示账号统计（Token使用量、费用消耗、活跃度、分组管理）
- 提供数据导出和报表功能
- 支持实时数据更新和历史趋势分析

### 1.3 技术选型决策
- **前端框架**: Vue 3 + TypeScript（选择理由：生态成熟、学习曲线平缓、适合快速开发）
- **UI组件库**: Element Plus（企业级组件库，适合数据密集型应用）
- **图表库**: ECharts（功能强大，适合复杂数据可视化）
- **后端框架**: Node.js + Express + TypeScript
- **数据访问**: Redis (ioredis库)
- **实时通信**: WebSocket (socket.io)
- **构建工具**: Vite（快速的开发构建）
- **部署**: Docker容器化部署

## 2. 系统架构

### 2.1 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                           │
│                    Vue 3 + Element Plus                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                      Nginx反向代理                           │
│                    (端口 80/443)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Node.js后端服务                            │
│                Express + Socket.io                           │
│                    (端口 3000)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                     Redis数据库                              │
│                 (118.178.186.69:6379)                        │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 项目结构
```
account-dashboard/
├── packages/
│   ├── frontend/                # 前端应用
│   │   ├── src/
│   │   │   ├── api/            # API调用层
│   │   │   ├── components/     # Vue组件
│   │   │   ├── views/          # 页面视图
│   │   │   ├── stores/         # Pinia状态管理
│   │   │   ├── types/          # TypeScript类型定义
│   │   │   ├── utils/          # 工具函数
│   │   │   └── App.vue
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/                 # 后端服务
│   │   ├── src/
│   │   │   ├── controllers/    # 控制器
│   │   │   ├── services/       # 业务服务
│   │   │   ├── models/         # 数据模型
│   │   │   ├── routes/         # 路由
│   │   │   ├── middleware/     # 中间件
│   │   │   ├── utils/          # 工具函数
│   │   │   ├── types/          # TypeScript类型定义
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                  # 共享代码
│       ├── src/
│       │   └── types/          # 共享类型定义
│       └── package.json
│
├── docker/                      # Docker配置
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
│
├── scripts/                     # 部署脚本
│   ├── deploy.sh
│   └── backup.sh
│
└── README.md
```

## 3. 数据模型设计

### 3.1 核心数据类型定义

```typescript
// packages/shared/src/types/apikey.ts
export interface ApiKeyInfo {
  id: string;
  name: string;
  description?: string;
  lastUsedAt: string;
  isActive: boolean;
  groupId?: string;
  groupName?: string;
  rpm: number;              // 计算得出的每分钟请求数
  dailyCostLimit?: number;
  currentDailyCost?: number;
  tags?: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface ApiKeyStatistics {
  keyId: string;
  name: string;
  lastUsedAt: string;
  rpm: number;
  currentGroup?: {
    id: string;
    name: string;
  };
  usage: {
    today: {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
    };
    last10Minutes: {
      avgRpm: number;
      totalRequests: number;
    };
  };
}

// packages/shared/src/types/account.ts
export interface AccountInfo {
  id: string;
  name: string;
  platform: 'claude-console' | 'claude' | 'gemini' | 'openai';
  isActive: boolean;
  lastUsedAt: string;
  status: 'active' | 'expired' | 'error' | 'created';
  accountType: 'shared' | 'dedicated' | 'group';
  priority: number;
  groupId?: string;
}

export interface AccountStatistics {
  accountId: string;
  accountName: string;
  todayTokenUsage: number;
  todayExpense: number;
  recentAvgRpm: number;      // 近10分钟平均RPM
  group?: {
    id: string;
    name: string;
    totalMembers: number;
    activeMembers: number;   // 近10分钟活跃用户数
  };
  usage: {
    hourly: Array<{
      hour: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
  };
}

// packages/shared/src/types/group.ts
export interface AccountGroup {
  id: string;
  name: string;
  platform: string;
  description?: string;
  memberCount: number;
  members: string[];
  createdAt: string;
  updatedAt: string;
}
```

## 4. API设计

### 4.1 RESTful API端点

```typescript
// API端点设计
interface ApiEndpoints {
  // API Key相关
  'GET /api/apikeys': {
    response: ApiKeyStatistics[];
    query?: {
      groupId?: string;
      isActive?: boolean;
      search?: string;
    };
  };
  
  'GET /api/apikeys/:id': {
    params: { id: string };
    response: ApiKeyStatistics;
  };
  
  'GET /api/apikeys/:id/usage': {
    params: { id: string };
    query: { 
      startDate?: string;
      endDate?: string;
      granularity?: 'hourly' | 'daily' | 'monthly';
    };
    response: UsageData[];
  };
  
  // 账号相关
  'GET /api/accounts': {
    response: AccountStatistics[];
    query?: {
      platform?: string;
      groupId?: string;
      status?: string;
    };
  };
  
  'GET /api/accounts/:id': {
    params: { id: string };
    response: AccountStatistics;
  };
  
  'GET /api/accounts/:id/cost': {
    params: { id: string };
    query: { date?: string };
    response: CostBreakdown;
  };
  
  // 分组相关
  'GET /api/groups': {
    response: AccountGroup[];
  };
  
  'GET /api/groups/:id/members': {
    params: { id: string };
    response: {
      accounts: AccountInfo[];
      apiKeys: ApiKeyInfo[];
    };
  };
  
  // 实时数据
  'GET /api/realtime/system-metrics': {
    response: SystemMetrics;
  };
  
  // 导出功能
  'GET /api/export/report': {
    query: {
      type: 'apikeys' | 'accounts';
      format: 'csv' | 'excel' | 'json';
      startDate?: string;
      endDate?: string;
    };
    response: Blob;
  };
}
```

### 4.2 WebSocket事件

```typescript
// WebSocket事件设计
interface SocketEvents {
  // 客户端 -> 服务器
  'subscribe:apikey': { keyId: string };
  'subscribe:account': { accountId: string };
  'subscribe:group': { groupId: string };
  'unsubscribe': { type: string; id: string };
  
  // 服务器 -> 客户端
  'apikey:update': ApiKeyStatistics;
  'account:update': AccountStatistics;
  'group:update': AccountGroup;
  'metrics:update': SystemMetrics;
  'alert': {
    type: 'warning' | 'error' | 'info';
    message: string;
    data?: any;
  };
}
```

## 5. 前端设计

### 5.1 页面路由设计

```typescript
// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      {
        path: 'overview',
        component: OverviewView,
        meta: { title: '总览' }
      },
      {
        path: 'apikeys',
        component: ApiKeysView,
        meta: { title: 'API Key管理' }
      },
      {
        path: 'accounts',
        component: AccountsView,
        meta: { title: '账号管理' }
      },
      {
        path: 'groups',
        component: GroupsView,
        meta: { title: '分组管理' }
      },
      {
        path: 'analytics',
        component: AnalyticsView,
        meta: { title: '数据分析' }
      }
    ]
  }
];
```

### 5.2 核心组件设计

```vue
<!-- ApiKeyTable.vue - API Key统计表格组件 -->
<template>
  <div class="api-key-table">
    <el-table :data="apiKeys" v-loading="loading">
      <el-table-column prop="name" label="API Key名称" sortable>
        <template #default="{ row }">
          <div class="key-name">
            <span>{{ row.name }}</span>
            <el-tag v-if="row.tags?.length" size="small">
              {{ row.tags[0] }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="lastUsedAt" label="最后使用时间" sortable>
        <template #default="{ row }">
          {{ formatTime(row.lastUsedAt) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="rpm" label="RPM" sortable>
        <template #default="{ row }">
          <el-progress 
            :percentage="calculateRpmPercentage(row.rpm)"
            :color="getRpmColor(row.rpm)"
          />
          <span>{{ row.rpm }} req/min</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="group" label="所属分组">
        <template #default="{ row }">
          <el-tag v-if="row.currentGroup">
            {{ row.currentGroup.name }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column label="今日消费">
        <template #default="{ row }">
          <span :class="getCostClass(row.usage.today.cost)">
            ${{ row.usage.today.cost.toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button size="small" @click="showDetail(row)">详情</el-button>
          <el-button size="small" @click="showChart(row)">趋势</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<!-- AccountStatistics.vue - 账号统计组件 -->
<template>
  <div class="account-statistics">
    <el-row :gutter="20">
      <el-col :span="6" v-for="stat in statistics" :key="stat.id">
        <el-card>
          <div class="stat-card">
            <div class="stat-title">{{ stat.accountName }}</div>
            <div class="stat-metrics">
              <div class="metric">
                <span class="label">今日Token:</span>
                <span class="value">{{ formatNumber(stat.todayTokenUsage) }}</span>
              </div>
              <div class="metric">
                <span class="label">今日费用:</span>
                <span class="value">${{ stat.todayExpense.toFixed(2) }}</span>
              </div>
              <div class="metric">
                <span class="label">近10分钟RPM:</span>
                <span class="value">{{ stat.recentAvgRpm }}</span>
              </div>
            </div>
            <div class="group-info" v-if="stat.group">
              <el-divider />
              <div class="group-name">分组: {{ stat.group.name }}</div>
              <div class="group-stats">
                <span>总用户: {{ stat.group.totalMembers }}</span>
                <span>活跃: {{ stat.group.activeMembers }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
```

### 5.3 状态管理设计

```typescript
// packages/frontend/src/stores/dashboard.ts
import { defineStore } from 'pinia';

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    apiKeys: [] as ApiKeyStatistics[],
    accounts: [] as AccountStatistics[],
    groups: [] as AccountGroup[],
    selectedTimeRange: 'today',
    refreshInterval: 10000, // 10秒刷新
    isConnected: false,
    filters: {
      groupId: null,
      platform: null,
      isActive: true
    }
  }),
  
  getters: {
    activeApiKeys: (state) => {
      return state.apiKeys.filter(key => key.isActive);
    },
    
    totalDailyCost: (state) => {
      return state.apiKeys.reduce((sum, key) => 
        sum + (key.usage?.today?.cost || 0), 0
      );
    },
    
    topUsageAccounts: (state) => {
      return state.accounts
        .sort((a, b) => b.todayTokenUsage - a.todayTokenUsage)
        .slice(0, 10);
    }
  },
  
  actions: {
    async fetchApiKeys() {
      const response = await apiClient.get('/api/apikeys', {
        params: this.filters
      });
      this.apiKeys = response.data;
    },
    
    async fetchAccounts() {
      const response = await apiClient.get('/api/accounts', {
        params: this.filters
      });
      this.accounts = response.data;
    },
    
    subscribeToRealTimeUpdates() {
      socket.on('apikey:update', (data) => {
        const index = this.apiKeys.findIndex(k => k.keyId === data.keyId);
        if (index !== -1) {
          this.apiKeys[index] = data;
        }
      });
      
      socket.on('account:update', (data) => {
        const index = this.accounts.findIndex(a => a.accountId === data.accountId);
        if (index !== -1) {
          this.accounts[index] = data;
        }
      });
    }
  }
});
```

## 6. 后端服务设计

### 6.1 Redis数据访问层

```typescript
// packages/backend/src/services/RedisService.ts
import Redis from 'ioredis';

export class RedisService {
  private client: Redis;
  
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || '118.178.186.69',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
  }
  
  async getApiKeyInfo(keyId: string): Promise<ApiKeyInfo> {
    const data = await this.client.hgetall(`apikey:${keyId}`);
    return this.parseApiKeyData(data);
  }
  
  async getApiKeyUsage(keyId: string, timeRange: TimeRange): Promise<UsageData> {
    const now = new Date();
    const keys: string[] = [];
    
    // 根据时间范围构建Redis key列表
    if (timeRange === 'today') {
      const dateStr = formatDate(now);
      keys.push(
        `usage:daily:${keyId}:${dateStr}`,
        `usage:hourly:${keyId}:${dateStr}:${now.getHours()}`
      );
    }
    
    const pipeline = this.client.pipeline();
    keys.forEach(key => pipeline.hgetall(key));
    const results = await pipeline.exec();
    
    return this.aggregateUsageData(results);
  }
  
  async calculateRPM(keyId: string): Promise<number> {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // 获取最近10分钟的请求数据
    const pipeline = this.client.pipeline();
    
    for (let i = 0; i < 10; i++) {
      const minute = new Date(tenMinutesAgo.getTime() + i * 60 * 1000);
      const hourKey = `usage:hourly:${keyId}:${formatDate(minute)}:${minute.getHours()}`;
      pipeline.hget(hourKey, 'requests');
    }
    
    const results = await pipeline.exec();
    const totalRequests = results.reduce((sum, [err, val]) => {
      return sum + (parseInt(val as string) || 0);
    }, 0);
    
    return Math.round(totalRequests / 10);
  }
  
  async getAccountStatistics(accountId: string): Promise<AccountStatistics> {
    const account = await this.client.hgetall(`claude_console_account:${accountId}`);
    const today = formatDate(new Date());
    
    // 获取今日使用数据
    const dailyUsage = await this.client.hgetall(
      `account_usage:daily:${accountId}:${today}`
    );
    
    // 获取关联的API Keys并计算费用
    const apiKeys = await this.getAccountApiKeys(accountId);
    const todayExpense = await this.calculateAccountDailyCost(accountId, apiKeys, today);
    
    // 计算近10分钟RPM
    const recentRpm = await this.calculateAccountRecentRPM(accountId);
    
    // 获取分组信息
    const group = await this.getAccountGroup(accountId);
    
    return {
      accountId,
      accountName: account.name,
      todayTokenUsage: parseInt(dailyUsage.allTokens || '0'),
      todayExpense,
      recentAvgRpm: recentRpm,
      group
    };
  }
  
  private async getAccountGroup(accountId: string): Promise<GroupInfo | undefined> {
    // 扫描所有分组查找账号所属分组
    const groups = await this.client.smembers('account_groups');
    
    for (const groupId of groups) {
      const members = await this.client.smembers(`account_group_members:${groupId}`);
      if (members.includes(accountId)) {
        const groupInfo = await this.client.hgetall(`account_group:${groupId}`);
        
        // 计算活跃用户数
        const activeCount = await this.countActiveGroupMembers(members);
        
        return {
          id: groupId,
          name: groupInfo.name,
          totalMembers: members.length,
          activeMembers: activeCount
        };
      }
    }
    
    return undefined;
  }
  
  private async countActiveGroupMembers(memberIds: string[]): Promise<number> {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    let activeCount = 0;
    
    for (const memberId of memberIds) {
      const account = await this.client.hget(
        `claude_console_account:${memberId}`,
        'lastUsedAt'
      );
      
      if (account && new Date(account).getTime() > tenMinutesAgo) {
        activeCount++;
      }
    }
    
    return activeCount;
  }
}
```

### 6.2 业务逻辑服务

```typescript
// packages/backend/src/services/DashboardService.ts
export class DashboardService {
  private redisService: RedisService;
  private cache: NodeCache;
  
  constructor() {
    this.redisService = new RedisService();
    this.cache = new NodeCache({ stdTTL: 10 }); // 10秒缓存
  }
  
  async getApiKeyStatistics(): Promise<ApiKeyStatistics[]> {
    const cacheKey = 'apikey_statistics';
    let data = this.cache.get<ApiKeyStatistics[]>(cacheKey);
    
    if (!data) {
      // 获取所有API Key
      const keyPattern = 'apikey:*';
      const keys = await this.redisService.scanKeys(keyPattern);
      
      data = await Promise.all(
        keys.map(async (key) => {
          const keyId = key.split(':')[1];
          const info = await this.redisService.getApiKeyInfo(keyId);
          const rpm = await this.redisService.calculateRPM(keyId);
          const usage = await this.redisService.getApiKeyUsage(keyId, 'today');
          
          return {
            keyId,
            name: info.name,
            lastUsedAt: info.lastUsedAt,
            rpm,
            currentGroup: info.groupId ? 
              await this.redisService.getGroupInfo(info.groupId) : undefined,
            usage
          };
        })
      );
      
      this.cache.set(cacheKey, data);
    }
    
    return data;
  }
  
  async getAccountStatistics(): Promise<AccountStatistics[]> {
    const cacheKey = 'account_statistics';
    let data = this.cache.get<AccountStatistics[]>(cacheKey);
    
    if (!data) {
      const accountPattern = 'claude_console_account:*';
      const accounts = await this.redisService.scanKeys(accountPattern);
      
      data = await Promise.all(
        accounts.map(async (key) => {
          const accountId = key.split(':')[1];
          return this.redisService.getAccountStatistics(accountId);
        })
      );
      
      this.cache.set(cacheKey, data);
    }
    
    return data;
  }
}
```

### 6.3 WebSocket实时更新

```typescript
// packages/backend/src/services/RealtimeService.ts
import { Server } from 'socket.io';

export class RealtimeService {
  private io: Server;
  private redisSubscriber: Redis;
  
  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });
    
    this.setupSocketHandlers();
    this.subscribeToRedisChanges();
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.on('subscribe:apikey', ({ keyId }) => {
        socket.join(`apikey:${keyId}`);
        this.sendInitialApiKeyData(socket, keyId);
      });
      
      socket.on('subscribe:account', ({ accountId }) => {
        socket.join(`account:${accountId}`);
        this.sendInitialAccountData(socket, accountId);
      });
      
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  private subscribeToRedisChanges() {
    // 使用Redis的keyspace notifications监听变化
    this.redisSubscriber = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
    
    // 启用keyspace notifications
    this.redisSubscriber.config('SET', 'notify-keyspace-events', 'KEA');
    
    // 订阅相关的key变化
    this.redisSubscriber.psubscribe('__keyevent@0__:hset');
    
    this.redisSubscriber.on('pmessage', async (pattern, channel, key) => {
      if (key.startsWith('apikey:')) {
        await this.handleApiKeyUpdate(key);
      } else if (key.startsWith('claude_console_account:')) {
        await this.handleAccountUpdate(key);
      } else if (key.includes('usage:')) {
        await this.handleUsageUpdate(key);
      }
    });
  }
  
  private async handleApiKeyUpdate(key: string) {
    const keyId = key.split(':')[1];
    const statistics = await this.dashboardService.getApiKeyStatisticsById(keyId);
    
    this.io.to(`apikey:${keyId}`).emit('apikey:update', statistics);
    this.io.emit('apikey:list:update', { keyId, statistics });
  }
  
  startMetricsPolling() {
    // 每10秒轮询一次系统指标
    setInterval(async () => {
      const metrics = await this.redisService.getSystemMetrics();
      this.io.emit('metrics:update', metrics);
    }, 10000);
  }
}
```

## 7. 性能优化策略

### 7.1 缓存策略
- **多级缓存**: Redis作为一级缓存，Node.js内存作为二级缓存
- **缓存预热**: 服务启动时预加载热点数据
- **增量更新**: 使用WebSocket推送变化数据，避免全量刷新

### 7.2 数据查询优化
- **批量查询**: 使用pipeline减少Redis往返次数
- **并行处理**: Promise.all并发处理多个查询
- **索引优化**: 为频繁查询的pattern创建辅助索引

### 7.3 前端性能优化
- **虚拟滚动**: 大数据表格使用虚拟滚动
- **懒加载**: 路由和组件按需加载
- **防抖节流**: 搜索和刷新操作添加防抖
- **Web Worker**: 复杂计算放入Web Worker

## 8. 安全设计

### 8.1 认证与授权
```typescript
// 简单的JWT认证中间件
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 8.2 数据安全
- **敏感数据脱敏**: API Key、密码等敏感信息脱敏显示
- **加密传输**: 使用HTTPS加密传输
- **输入验证**: 严格验证用户输入，防止注入攻击
- **速率限制**: API调用添加速率限制

## 9. 监控与告警

### 9.1 监控指标
- **服务健康度**: API响应时间、错误率
- **资源使用**: CPU、内存、Redis连接数
- **业务指标**: API Key使用率、费用超限告警

### 9.2 日志系统
```typescript
// 使用winston进行日志管理
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## 10. 测试策略

### 10.1 单元测试
```typescript
// 使用Jest进行单元测试
describe('RedisService', () => {
  it('should calculate RPM correctly', async () => {
    const service = new RedisService();
    const rpm = await service.calculateRPM('test-key-id');
    expect(rpm).toBeGreaterThanOrEqual(0);
  });
});
```

### 10.2 集成测试
- API端点测试
- WebSocket连接测试
- Redis连接测试

### 10.3 E2E测试
- 使用Cypress进行端到端测试
- 覆盖核心用户流程

## 11. 开发规范

### 11.1 代码规范
- **ESLint配置**: 统一代码风格
- **Prettier**: 代码格式化
- **TypeScript严格模式**: 提高代码质量
- **Git提交规范**: 使用conventional commits

### 11.2 分支策略
- `main`: 生产环境分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

## 12. 扩展性设计

### 12.1 插件化架构
- 支持自定义数据源插件
- 支持自定义图表组件
- 支持自定义导出格式

### 12.2 微服务化准备
- 服务间通过API通信
- 数据库访问层独立
- 支持水平扩展

## 13. 开发计划

### Phase 1: 基础功能（第1-2周）
- [ ] 项目初始化和环境搭建
- [ ] Redis连接和基础数据访问
- [ ] API Key统计表格
- [ ] 账号统计看板

### Phase 2: 实时功能（第3周）
- [ ] WebSocket集成
- [ ] 实时数据更新
- [ ] 系统指标监控

### Phase 3: 高级功能（第4周）
- [ ] 数据导出功能
- [ ] 历史趋势分析
- [ ] 告警系统

### Phase 4: 优化部署（第5周）
- [ ] 性能优化
- [ ] Docker容器化
- [ ] 生产环境部署

## 14. 风险评估

### 14.1 技术风险
- **Redis连接稳定性**: 需要实现重连机制
- **数据量大**: 需要分页和缓存优化
- **实时性要求**: WebSocket连接管理

### 14.2 缓解措施
- 实现熔断和降级机制
- 添加数据缓存层
- 使用消息队列处理高并发

---

本文档将作为项目开发的技术指导，后续开发人员应严格遵循本文档的设计规范和架构要求。