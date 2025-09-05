"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const redis_1 = require("./config/redis");
const logger_1 = require("./utils/logger");
const RealtimeService_1 = require("./services/RealtimeService");
const api_1 = __importDefault(require("./routes/api"));
// 加载环境变量
dotenv_1.default.config();
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    /**
     * 设置中间件
     */
    setupMiddleware() {
        // 安全中间件
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"],
                },
            },
            crossOriginEmbedderPolicy: false
        }));
        // CORS配置 - 简化配置，支持同端口服务
        this.app.use((0, cors_1.default)({
            origin: true, // 允许所有来源，因为前端和后端在同一端口
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        // 压缩响应
        this.app.use((0, compression_1.default)());
        // 解析JSON
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // 请求日志记录
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                logger_1.logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`, {
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
    setupRoutes() {
        // API路由 - 现在所有API都在/api路径下
        this.app.use(api_1.default);
        // 静态文件服务 - 服务前端构建的文件
        const staticPath = path_1.default.join(__dirname, '../public');
        this.app.use(express_1.default.static(staticPath));
        // SPA路由处理 - 所有非API请求都返回index.html
        this.app.get('*', (req, res) => {
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
            res.sendFile(path_1.default.join(staticPath, 'index.html'));
        });
    }
    /**
     * 设置错误处理
     */
    setupErrorHandling() {
        // 全局错误处理中间件
        this.app.use((error, req, res, next) => {
            logger_1.logger.error('Unhandled error:', {
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
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            this.gracefulShutdown('SIGTERM');
        });
        // 处理未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.gracefulShutdown('SIGTERM');
        });
        // 处理进程信号
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }
    /**
     * 启动服务器
     */
    async start() {
        try {
            // 连接Redis
            await redis_1.redisClient.connect();
            logger_1.logger.info('Redis connected successfully');
            // 启动实时服务
            this.realtimeService = new RealtimeService_1.RealtimeService(this.server);
            logger_1.logger.info('Realtime service initialized');
            // 启动HTTP服务器
            const port = process.env.PORT || 3000;
            this.server.listen(port, () => {
                logger_1.logger.info(`Server started on port ${port}`);
                logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
                logger_1.logger.info(`Dashboard available at: http://localhost:${port}`);
                logger_1.logger.info(`API available at: http://localhost:${port}/api`);
            });
            // 服务器启动后的健康检查
            setTimeout(async () => {
                try {
                    const redisHealth = await redis_1.redisClient.healthCheck();
                    if (redisHealth.status === 'healthy') {
                        logger_1.logger.info('All services are healthy and ready');
                    }
                    else {
                        logger_1.logger.warn('Some services are not healthy:', redisHealth);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Health check failed:', error);
                }
            }, 5000);
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    /**
     * 优雅关闭
     */
    async gracefulShutdown(signal) {
        logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
        try {
            // 停止接收新连接
            this.server.close(() => {
                logger_1.logger.info('HTTP server closed');
            });
            // 关闭实时服务
            if (this.realtimeService) {
                await this.realtimeService.close();
                logger_1.logger.info('Realtime service closed');
            }
            // 关闭Redis连接
            await redis_1.redisClient.disconnect();
            logger_1.logger.info('Redis connection closed');
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    }
    /**
     * 获取Express应用实例
     */
    getApp() {
        return this.app;
    }
    /**
     * 获取HTTP服务器实例
     */
    getServer() {
        return this.server;
    }
}
exports.App = App;
// 如果直接运行此文件，启动服务器
if (require.main === module) {
    const app = new App();
    app.start().catch((error) => {
        logger_1.logger.error('Failed to start application:', error);
        process.exit(1);
    });
}
exports.default = App;
//# sourceMappingURL=index.js.map