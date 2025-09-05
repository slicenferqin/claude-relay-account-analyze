import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

import { redisClient } from './config/redis';
import { logger } from './utils/logger';
import { RealtimeService } from './services/RealtimeService';
import apiRoutes from './routes/api';

// 加载环境变量
dotenv.config();

export class App {
  private app: Application;
  private server: any;
  private realtimeService?: RealtimeService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // 安全中间件 - 禁用HSTS以避免HTTPS重定向
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "http:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: false // 禁用HSTS避免强制HTTPS
    }));

    // CORS配置 - 简化配置，支持同端口服务
    this.app.use(cors({
      origin: true, // 允许所有来源，因为前端和后端在同一端口
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // 压缩响应
    this.app.use(compression());

    // 解析JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志记录
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      });

      next();
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // API路由 - 现在所有API都在/api路径下
    this.app.use(apiRoutes);

    // 静态文件服务 - 服务前端构建的文件
    const staticPath = path.join(__dirname, '../public');
    this.app.use(express.static(staticPath));

    // SPA路由处理 - 所有非API请求都返回index.html
    this.app.get('*', (req: Request, res: Response) => {
      // 如果是API路由，返回404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          success: false,
          error: 'API endpoint not found',
          path: req.originalUrl,
          timestamp: new Date().toISOString()
        });
      }
      
      // 其他路由返回前端应用
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 全局错误处理中间件
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        body: req.body
      });

      // 不要在生产环境中暴露错误详情
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('SIGTERM');
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('SIGTERM');
    });

    // 处理进程信号
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    try {
      // 连接Redis
      await redisClient.connect();
      logger.info('Redis connected successfully');

      // 启动实时服务
      this.realtimeService = new RealtimeService(this.server);
      logger.info('Realtime service initialized');

      // 启动HTTP服务器
      const port = process.env.PORT || 3000;
      
      this.server.listen(port, () => {
        logger.info(`Server started on port ${port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Dashboard available at: http://localhost:${port}`);
        logger.info(`API available at: http://localhost:${port}/api`);
      });

      // 服务器启动后的健康检查
      setTimeout(async () => {
        try {
          const redisHealth = await redisClient.healthCheck();
          if (redisHealth.status === 'healthy') {
            logger.info('All services are healthy and ready');
          } else {
            logger.warn('Some services are not healthy:', redisHealth);
          }
        } catch (error) {
          logger.error('Health check failed:', error);
        }
      }, 5000);

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 优雅关闭
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // 停止接收新连接
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // 关闭实时服务
      if (this.realtimeService) {
        await this.realtimeService.close();
        logger.info('Realtime service closed');
      }

      // 关闭Redis连接
      await redisClient.disconnect();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * 获取Express应用实例
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * 获取HTTP服务器实例
   */
  public getServer(): any {
    return this.server;
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  const app = new App();
  app.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default App;