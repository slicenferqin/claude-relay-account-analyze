import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { RedisDataService } from '../services/RedisDataService';
import { AccountService } from '../services/AccountService';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { SocketEvents } from '@account-dashboard/shared';

export class RealtimeService {
  private io: Server;
  private redisDataService: RedisDataService;
  private accountService: AccountService;
  private systemMetricsInterval?: NodeJS.Timeout;
  private subscribers: Map<string, Map<string, Set<string>>> = new Map(); // 订阅关系管理

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.redisDataService = new RedisDataService();
    this.accountService = new AccountService();
    
    this.setupSocketHandlers();
    this.startSystemMetricsPolling();
    this.subscribeToRedisChanges();
  }

  /**
   * 设置Socket连接处理器
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // 发送连接成功消息
      socket.emit('connected', {
        message: 'Connected to dashboard real-time service',
        timestamp: new Date().toISOString()
      });

      // API Key订阅
      socket.on('subscribe:apikey', async (data: { keyId: string }) => {
        try {
          socket.join(`apikey:${data.keyId}`);
          this.addSubscriber('apikey', data.keyId, socket.id);
          
          // 立即发送初始数据
          await this.sendInitialApiKeyData(socket, data.keyId);
          
          logger.info(`Client ${socket.id} subscribed to API key: ${data.keyId}`);
        } catch (error) {
          logger.error(`Error subscribing to API key ${data.keyId}:`, error);
          socket.emit('error', {
            message: 'Failed to subscribe to API key updates',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // 账户订阅
      socket.on('subscribe:account', async (data: { accountId: string }) => {
        try {
          socket.join(`account:${data.accountId}`);
          this.addSubscriber('account', data.accountId, socket.id);
          
          // 立即发送初始数据
          await this.sendInitialAccountData(socket, data.accountId);
          
          logger.info(`Client ${socket.id} subscribed to account: ${data.accountId}`);
        } catch (error) {
          logger.error(`Error subscribing to account ${data.accountId}:`, error);
          socket.emit('error', {
            message: 'Failed to subscribe to account updates',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // 分组订阅
      socket.on('subscribe:group', async (data: { groupId: string }) => {
        try {
          socket.join(`group:${data.groupId}`);
          this.addSubscriber('group', data.groupId, socket.id);
          
          // 立即发送初始数据
          await this.sendInitialGroupData(socket, data.groupId);
          
          logger.info(`Client ${socket.id} subscribed to group: ${data.groupId}`);
        } catch (error) {
          logger.error(`Error subscribing to group ${data.groupId}:`, error);
          socket.emit('error', {
            message: 'Failed to subscribe to group updates',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // 系统指标订阅
      socket.on('subscribe:system', () => {
        try {
          socket.join('system:metrics');
          logger.info(`Client ${socket.id} subscribed to system metrics`);
        } catch (error) {
          logger.error(`Error subscribing to system metrics:`, error);
        }
      });

      // 取消订阅
      socket.on('unsubscribe', (data: { type: string; id: string }) => {
        try {
          const room = `${data.type}:${data.id}`;
          socket.leave(room);
          this.removeSubscriber(data.type, data.id, socket.id);
          
          logger.info(`Client ${socket.id} unsubscribed from ${room}`);
        } catch (error) {
          logger.error(`Error unsubscribing from ${data.type}:${data.id}:`, error);
        }
      });

      // 客户端断开连接
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.cleanupSocketSubscriptions(socket.id);
      });

      // 处理连接错误
      socket.on('error', (error) => {
        logger.error(`Socket error for client ${socket.id}:`, error);
      });
    });

    // 处理服务器错误
    this.io.on('error', (error) => {
      logger.error('Socket.IO server error:', error);
    });
  }

  /**
   * 发送初始API Key数据
   */
  private async sendInitialApiKeyData(socket: Socket, keyId: string): Promise<void> {
    try {
      const statistics = await this.redisDataService.getApiKeyStatistics(keyId);
      if (statistics) {
        socket.emit('apikey:update', statistics);
      }
    } catch (error) {
      logger.error(`Error sending initial API key data for ${keyId}:`, error);
    }
  }

  /**
   * 发送初始账户数据
   */
  private async sendInitialAccountData(socket: Socket, accountId: string): Promise<void> {
    try {
      const statistics = await this.accountService.getAccountStatistics(accountId);
      if (statistics) {
        socket.emit('account:update', statistics);
      }
    } catch (error) {
      logger.error(`Error sending initial account data for ${accountId}:`, error);
    }
  }

  /**
   * 发送初始分组数据
   */
  private async sendInitialGroupData(socket: Socket, groupId: string): Promise<void> {
    try {
      // 这里可以实现分组统计数据获取
      logger.info(`Sending initial group data for ${groupId}`);
    } catch (error) {
      logger.error(`Error sending initial group data for ${groupId}:`, error);
    }
  }

  /**
   * 开始系统指标轮询
   */
  private startSystemMetricsPolling(): void {
    // 每10秒更新一次系统指标
    this.systemMetricsInterval = setInterval(async () => {
      try {
        const metrics = await this.redisDataService.getSystemMetrics();
        this.io.to('system:metrics').emit('metrics:update', metrics);
      } catch (error) {
        logger.error('Error polling system metrics:', error);
      }
    }, 10000);

    logger.info('System metrics polling started');
  }

  /**
   * 订阅Redis数据变化（通过轮询模拟）
   */
  private subscribeToRedisChanges(): void {
    // 由于Redis的keyspace notifications可能不可用，我们使用轮询方式
    // 每30秒检查一次数据变化
    setInterval(async () => {
      await this.pollDataChanges();
    }, 30000);

    logger.info('Redis change polling started');
  }

  /**
   * 轮询数据变化
   */
  private async pollDataChanges(): Promise<void> {
    try {
      // 更新所有订阅的API Keys
      for (const [type, subscriptions] of this.subscribers) {
        if (type === 'apikey') {
          for (const keyId of subscriptions.keys()) {
            await this.updateApiKeyData(keyId);
          }
        } else if (type === 'account') {
          for (const accountId of subscriptions.keys()) {
            await this.updateAccountData(accountId);
          }
        }
      }
    } catch (error) {
      logger.error('Error polling data changes:', error);
    }
  }

  /**
   * 更新API Key数据
   */
  private async updateApiKeyData(keyId: string): Promise<void> {
    try {
      const statistics = await this.redisDataService.getApiKeyStatistics(keyId);
      if (statistics) {
        this.io.to(`apikey:${keyId}`).emit('apikey:update', statistics);
      }
    } catch (error) {
      logger.error(`Error updating API key data for ${keyId}:`, error);
    }
  }

  /**
   * 更新账户数据
   */
  private async updateAccountData(accountId: string): Promise<void> {
    try {
      const statistics = await this.accountService.getAccountStatistics(accountId);
      if (statistics) {
        this.io.to(`account:${accountId}`).emit('account:update', statistics);
      }
    } catch (error) {
      logger.error(`Error updating account data for ${accountId}:`, error);
    }
  }

  /**
   * 添加订阅者
   */
  private addSubscriber(type: string, id: string, socketId: string): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Map());
    }
    
    const typeSubscriptions = this.subscribers.get(type)!;
    if (!typeSubscriptions.has(id)) {
      typeSubscriptions.set(id, new Set());
    }
    
    typeSubscriptions.get(id)!.add(socketId);
  }

  /**
   * 移除订阅者
   */
  private removeSubscriber(type: string, id: string, socketId: string): void {
    const typeSubscriptions = this.subscribers.get(type);
    if (typeSubscriptions && typeSubscriptions.has(id)) {
      typeSubscriptions.get(id)!.delete(socketId);
      
      // 如果没有订阅者了，删除该订阅
      if (typeSubscriptions.get(id)!.size === 0) {
        typeSubscriptions.delete(id);
      }
    }
  }

  /**
   * 清理Socket的所有订阅
   */
  private cleanupSocketSubscriptions(socketId: string): void {
    for (const [type, typeSubscriptions] of this.subscribers) {
      for (const [id, subscribers] of typeSubscriptions) {
        subscribers.delete(socketId);
        
        if (subscribers.size === 0) {
          typeSubscriptions.delete(id);
        }
      }
    }
  }

  /**
   * 发送告警消息
   */
  public sendAlert(type: 'warning' | 'error' | 'info' | 'success', title: string, message: string, data?: any): void {
    this.io.emit('alert', {
      type,
      title,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 获取连接统计信息
   */
  public getConnectionStats(): { totalConnections: number; subscriberCount: Record<string, number> } {
    const subscriberCount: Record<string, number> = {};
    
    for (const [type, typeSubscriptions] of this.subscribers) {
      subscriberCount[type] = typeSubscriptions.size;
    }

    return {
      totalConnections: this.io.sockets.sockets.size,
      subscriberCount
    };
  }

  /**
   * 关闭实时服务
   */
  public async close(): Promise<void> {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    
    this.io.close();
    logger.info('Realtime service closed');
  }
}