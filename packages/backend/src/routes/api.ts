import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import rateLimit from 'express-rate-limit';

const router = Router();
const dashboardController = new DashboardController();

// 应用速率限制
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 100, // 限制每个IP每分钟最多100个请求
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 60, // 健康检查更频繁一些
  message: {
    success: false,
    error: 'Too many health check requests.',
    timestamp: new Date().toISOString()
  }
});

// 应用速率限制到API路由
router.use('/api', apiLimiter);

// API Key相关路由
router.get('/api/apikeys', dashboardController.getApiKeys.bind(dashboardController));
router.get('/api/apikeys/:id', dashboardController.getApiKey.bind(dashboardController));
router.get('/api/apikeys/:id/usage', dashboardController.getApiKeyUsage.bind(dashboardController));

// 账户相关路由
router.get('/api/accounts', dashboardController.getAccounts.bind(dashboardController));
router.get('/api/accounts/:id', dashboardController.getAccount.bind(dashboardController));
router.get('/api/accounts/:id/cost', dashboardController.getAccountCost.bind(dashboardController));

// 分组相关路由
router.get('/api/groups', dashboardController.getGroups.bind(dashboardController));
router.get('/api/groups/:id/members', dashboardController.getGroupMembers.bind(dashboardController));

// 系统指标路由
router.get('/api/realtime/system-metrics', dashboardController.getSystemMetrics.bind(dashboardController));

// 健康检查路由
router.get('/health', healthLimiter, dashboardController.healthCheck.bind(dashboardController));

export default router;