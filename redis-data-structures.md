# Redis 数据结构文档

Claude Relay Service 的 Redis 数据存储结构完整分析

## 目录

- [账户管理](#账户管理)
- [账户分组](#账户分组)
- [API Key 管理](#api-key-管理)
- [使用统计](#使用统计)
- [费用跟踪](#费用跟踪)
- [用户管理](#用户管理)
- [系统管理](#系统管理)
- [其他功能模块](#其他功能模块)

## 账户管理

### Claude 账户
**Key 格式:** `claude_account:{accountId}` 或 `claude:account:{accountId}`
**数据类型:** Hash

```javascript
{
  id: string,                    // 账户唯一标识
  name: string,                  // 账户名称
  description: string,           // 账户描述
  email: string,                 // 邮箱 (AES加密)
  password: string,              // 密码 (AES加密)
  claudeAiOauth: string,         // OAuth数据 (AES加密JSON)
  accessToken: string,           // 访问令牌 (AES加密)
  refreshToken: string,          // 刷新令牌 (AES加密)
  expiresAt: string,            // 过期时间
  scopes: string,               // OAuth范围
  proxy: string,                // 代理配置 (JSON格式)
  isActive: string,             // 是否激活 ("true"/"false")
  accountType: string,          // 账户类型 ("shared", "dedicated", "group")
  platform: string,             // 平台标识
  priority: string,             // 优先级
  createdAt: string,            // 创建时间
  lastUsedAt: string,           // 最后使用时间
  lastRefreshAt: string,        // 最后刷新时间
  status: string,               // 状态 ("active", "expired", "error", "created")
  errorMessage: string,         // 错误信息
  schedulable: string,          // 是否可调度 ("true"/"false")
  autoStopOnWarning: string,    // 警告时自动停止 ("true"/"false")
  subscriptionInfo: string      // 订阅信息 (JSON格式)
}
```

### Gemini 账户
**Key 格式:** `gemini_account:{accountId}`
**数据类型:** Hash

结构与 Claude 账户类似，但包含 Google OAuth 特定字段。

### OpenAI 账户
**Key 格式:** `openai:account:{accountId}`
**数据类型:** Hash

### Bedrock 账户
**Key 格式:** `bedrock_account:{accountId}`
**数据类型:** String (JSON 序列化)

### Azure OpenAI 账户
**Key 格式:** `azure_openai:account:{accountId}`
**数据类型:** Hash

### Claude Console 账户
**Key 格式:** `claude_console:{accountId}`
**数据类型:** Hash

## 账户分组

### 分组列表
**Key 格式:** `account_groups`
**数据类型:** Set
**内容:** 所有分组 ID 的集合

### 分组信息
**Key 格式:** `account_group:{groupId}`
**数据类型:** Hash

```javascript
{
  id: string,                   // 分组唯一标识
  name: string,                 // 分组名称
  platform: string,            // 平台 ("claude", "gemini", "openai")
  description: string,          // 分组描述
  createdAt: string,           // 创建时间
  updatedAt: string,           // 更新时间
  memberCount: number          // 成员数量 (动态计算)
}
```

### 分组成员
**Key 格式:** `account_group_members:{groupId}`
**数据类型:** Set
**内容:** 分组内账户 ID 的集合

## API Key 管理

### API Key 详细信息
**Key 格式:** `apikey:{keyId}`
**数据类型:** Hash

```javascript
{
  id: string,                        // API Key 唯一标识
  name: string,                      // 名称
  description: string,               // 描述
  apiKey: string,                    // API Key (哈希后)
  tokenLimit: string,                // Token 限制
  concurrencyLimit: string,          // 并发限制
  rateLimitWindow: string,           // 速率限制窗口
  rateLimitRequests: string,         // 速率限制请求数
  rateLimitCost: string,             // 速率限制费用
  isActive: string,                  // 是否激活
  claudeAccountId: string,           // 关联的Claude账户ID (可以是group:groupId)
  claudeConsoleAccountId: string,    // Claude Console账户ID
  geminiAccountId: string,           // Gemini账户ID
  openaiAccountId: string,           // OpenAI账户ID
  azureOpenaiAccountId: string,      // Azure OpenAI账户ID
  bedrockAccountId: string,          // Bedrock账户ID
  permissions: string,               // 权限 ("all", "claude", "gemini", "openai")
  enableModelRestriction: string,    // 是否启用模型限制
  restrictedModels: string,          // 受限模型 (JSON数组)
  enableClientRestriction: string,   // 是否启用客户端限制
  allowedClients: string,            // 允许的客户端 (JSON数组)
  dailyCostLimit: string,            // 日费用限制
  weeklyOpusCostLimit: string,       // 周Opus费用限制
  tags: string,                      // 标签 (JSON数组)
  createdAt: string,                 // 创建时间
  lastUsedAt: string,                // 最后使用时间
  expiresAt: string,                 // 过期时间
  createdBy: string,                 // 创建者
  userId: string,                    // 用户ID
  userUsername: string               // 用户名
}
```

### API Key 哈希映射
**Key 格式:** `apikey:hash_map`
**数据类型:** Hash
**用途:** 从哈希值快速查找 API Key ID (O(1) 查找优化)

## 使用统计

### API Key 使用统计

#### 总使用量
**Key 格式:** `usage:{keyId}`
**数据类型:** Hash

#### 按时间维度
- **每日:** `usage:daily:{keyId}:{YYYY-MM-DD}`
- **每月:** `usage:monthly:{keyId}:{YYYY-MM}`
- **每小时:** `usage:hourly:{keyId}:{YYYY-MM-DD}:{HH}`

#### 模型维度统计
- **模型每日:** `usage:model:daily:{normalizedModel}:{YYYY-MM-DD}`
- **模型每月:** `usage:model:monthly:{normalizedModel}:{YYYY-MM}`
- **模型每小时:** `usage:model:hourly:{normalizedModel}:{YYYY-MM-DD}:{HH}`

#### Key+模型组合统计
- **Key模型每日:** `usage:{keyId}:model:daily:{normalizedModel}:{YYYY-MM-DD}`
- **Key模型每月:** `usage:{keyId}:model:monthly:{normalizedModel}:{YYYY-MM}`
- **Key模型每小时:** `usage:{keyId}:model:hourly:{normalizedModel}:{YYYY-MM-DD}:{HH}`

### 账户使用统计

#### 账户总使用量
**Key 格式:** `account_usage:{accountId}`
**数据类型:** Hash

#### 按时间维度
- **每日:** `account_usage:daily:{accountId}:{YYYY-MM-DD}`
- **每月:** `account_usage:monthly:{accountId}:{YYYY-MM}`
- **每小时:** `account_usage:hourly:{accountId}:{YYYY-MM-DD}:{HH}`

#### 账户+模型组合统计
- **账户模型每日:** `account_usage:model:daily:{accountId}:{normalizedModel}:{YYYY-MM-DD}`
- **账户模型每月:** `account_usage:model:monthly:{accountId}:{normalizedModel}:{YYYY-MM}`
- **账户模型每小时:** `account_usage:model:hourly:{accountId}:{normalizedModel}:{YYYY-MM-DD}:{HH}`

### 使用量数据结构
```javascript
{
  tokens: number,                    // 核心Token数 (向后兼容)
  inputTokens: number,              // 输入Token数
  outputTokens: number,             // 输出Token数
  cacheCreateTokens: number,        // 缓存创建Token数
  cacheReadTokens: number,          // 缓存读取Token数
  allTokens: number,                // 总Token数 (包含缓存)
  requests: number,                 // 请求数
  ephemeral5mTokens: number,        // 5分钟缓存Token数
  ephemeral1hTokens: number,        // 1小时缓存Token数
  longContextInputTokens: number,   // 长上下文输入Token数 (1M+)
  longContextOutputTokens: number,  // 长上下文输出Token数
  longContextRequests: number,      // 长上下文请求数
  
  // 每小时统计还包含模型特定字段:
  "model:{modelName}:inputTokens": number,
  "model:{modelName}:outputTokens": number
  // ... 每个模型的统计字段
}
```

## 费用跟踪

### API Key 费用
- **每日费用:** `usage:cost:daily:{keyId}:{YYYY-MM-DD}` (String, Float)
- **每月费用:** `usage:cost:monthly:{keyId}:{YYYY-MM}` (String, Float)
- **每小时费用:** `usage:cost:hourly:{keyId}:{YYYY-MM-DD}:{HH}` (String, Float)
- **总费用:** `usage:cost:total:{keyId}` (String, Float)

### Opus 特殊费用跟踪
- **周费用:** `usage:opus:weekly:{keyId}:{YYYY-Wxx}` (String, Float)
- **总Opus费用:** `usage:opus:total:{keyId}` (String, Float)

## 用户管理

### 用户信息
**Key 格式:** `user:{userId}`
**数据类型:** String (JSON 序列化)

```javascript
{
  id: string,
  username: string,
  email: string,
  displayName: string,
  firstName: string,
  lastName: string,
  role: string,
  isActive: boolean,
  createdAt: string,
  updatedAt: string,
  lastLoginAt: string|null,
  apiKeyCount: number,
  totalUsage: {
    requests: number,
    inputTokens: number,
    outputTokens: number,
    totalCost: number
  }
}
```

### 用户名映射
**Key 格式:** `username:{username}`
**数据类型:** String (用户ID)

### 用户会话
**Key 格式:** `user_session:{sessionToken}`
**数据类型:** 根据实现而异

## 系统管理

### 管理员信息
**Key 格式:** `admin:{adminId}`
**数据类型:** Hash

```javascript
{
  id: string,
  username: string,
  passwordHash: string,
  createdAt: string,
  isActive: string
}
```

### 管理员用户名映射
**Key 格式:** `admin_username:{username}`
**数据类型:** String (管理员ID)

### 系统会话
**Key 格式:** `session:{sessionId}`
**数据类型:** Hash

### 实时系统指标
**Key 格式:** `system:metrics:minute:{minuteTimestamp}`
**数据类型:** Hash

```javascript
{
  requests: number,
  totalTokens: number,
  inputTokens: number,
  outputTokens: number,
  cacheCreateTokens: number,
  cacheReadTokens: number
}
```

### 系统信息缓存
**Key 格式:** `system_info`
**数据类型:** 根据实现而异

## 其他功能模块

### OAuth 管理
- **OAuth会话:** `oauth:{sessionId}` (Hash)
- **粘性会话:** `sticky_session:{sessionHash}` (String)

### 并发控制
**Key 格式:** `concurrency:{apiKeyId}`
**数据类型:** String (当前并发数)

### Token 刷新管理
**Key 格式:** `token_refresh:{accountId}:{platform}`
**数据类型:** 根据实现而异

### 账户健康状态
**Key 格式:** `account_health:{accountId}`
**数据类型:** 根据实现而异

### 速率限制
**Key 格式:** `ratelimit:{keyId}:{window}`
**数据类型:** 根据实现而异

### Webhook 配置
**Key 格式:** `webhook:{type}:{identifier}`
**数据类型:** 根据实现而异

### 定价信息
**Key 格式:** `pricing:{model}`
**数据类型:** 根据实现而异

## 关键架构特性

### 账户与分组关系
1. **账户分组存储结构:**
   - 分组元信息: `account_group:{groupId}`
   - 分组成员: `account_group_members:{groupId}` (Set)
   - 所有分组: `account_groups` (Set)

2. **API Key 与分组关联:**
   - API Key 可以通过 `claudeAccountId: "group:{groupId}"` 关联到分组
   - 实现账户分组的智能调度和负载分发

### 多维度统计
- **时间维度:** 分钟/小时/每日/每月
- **实体维度:** API Key/账户/模型
- **组合维度:** Key+模型、账户+模型

### 安全与加密
- **敏感数据加密:** OAuth tokens、refreshToken 使用 AES 加密
- **API Key 哈希:** 存储哈希值而非明文，支持 O(1) 查找

### 缓存优化
- **哈希映射:** `apikey:hash_map` 实现快速查找
- **系统指标缓存:** 实时性能数据缓存
- **粘性会话:** 账户分配优化

这个 Redis 存储结构支持复杂的多平台账户管理、精细的使用统计、灵活的分组策略和高性能的查询优化。