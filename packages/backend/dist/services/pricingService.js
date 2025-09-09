"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const logger_1 = require("../utils/logger");
class PricingService {
    constructor() {
        this.pricingData = null;
        this.lastUpdated = null;
        this.updateInterval = 24 * 60 * 60 * 1000; // 24小时
        this.fileWatcher = null;
        this.reloadDebounceTimer = null;
        // 硬编码的 1 小时缓存价格（美元/百万 token）
        this.ephemeral1hPricing = {
            // Opus 系列: $30/MTok
            'claude-opus-4-1': 0.00003,
            'claude-opus-4-1-20250805': 0.00003,
            'claude-opus-4': 0.00003,
            'claude-opus-4-20250514': 0.00003,
            'claude-3-opus': 0.00003,
            'claude-3-opus-latest': 0.00003,
            'claude-3-opus-20240229': 0.00003,
            // Sonnet 系列: $6/MTok
            'claude-3-5-sonnet': 0.000006,
            'claude-3-5-sonnet-latest': 0.000006,
            'claude-3-5-sonnet-20241022': 0.000006,
            'claude-3-5-sonnet-20240620': 0.000006,
            'claude-3-sonnet': 0.000006,
            'claude-3-sonnet-20240307': 0.000006,
            'claude-sonnet-3': 0.000006,
            'claude-sonnet-3-5': 0.000006,
            'claude-sonnet-3-7': 0.000006,
            'claude-sonnet-4': 0.000006,
            'claude-sonnet-4-20250514': 0.000006,
            // Haiku 系列: $1.6/MTok
            'claude-3-5-haiku': 0.0000016,
            'claude-3-5-haiku-latest': 0.0000016,
            'claude-3-5-haiku-20241022': 0.0000016,
            'claude-3-haiku': 0.0000016,
            'claude-3-haiku-20240307': 0.0000016,
            'claude-haiku-3': 0.0000016,
            'claude-haiku-3-5': 0.0000016
        };
        // 硬编码的 1M 上下文模型价格（美元/token）
        this.longContextPricing = {
            'claude-sonnet-4-20250514[1m]': {
                input: 0.000006, // $6/MTok
                output: 0.0000225 // $22.50/MTok
            }
        };
        this.dataDir = path.join(process.cwd(), 'data');
        this.pricingFile = path.join(this.dataDir, 'model_pricing.json');
        this.pricingUrl = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
        this.fallbackFile = path.join(process.cwd(), 'resources', 'model-pricing', 'model_prices_and_context_window.json');
    }
    async initialize() {
        try {
            // 确保data目录存在
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
                logger_1.logger.info('📁 Created data directory');
            }
            // 检查是否需要下载或更新价格数据
            await this.checkAndUpdatePricing();
            // 设置定时更新
            setInterval(() => {
                this.checkAndUpdatePricing();
            }, this.updateInterval);
            // 设置文件监听器
            this.setupFileWatcher();
            logger_1.logger.info('💰 Pricing service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to initialize pricing service:', error);
        }
    }
    async checkAndUpdatePricing() {
        try {
            const needsUpdate = this.needsUpdate();
            if (needsUpdate) {
                logger_1.logger.info('🔄 Updating model pricing data...');
                await this.downloadPricingData();
            }
            else {
                await this.loadPricingData();
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to check/update pricing:', error);
            await this.useFallbackPricing();
        }
    }
    needsUpdate() {
        if (!fs.existsSync(this.pricingFile)) {
            logger_1.logger.info('📋 Pricing file not found, will download');
            return true;
        }
        const stats = fs.statSync(this.pricingFile);
        const fileAge = Date.now() - stats.mtime.getTime();
        if (fileAge > this.updateInterval) {
            logger_1.logger.info(`📋 Pricing file is ${Math.round(fileAge / (60 * 60 * 1000))} hours old, will update`);
            return true;
        }
        return false;
    }
    async downloadPricingData() {
        try {
            await this._downloadFromRemote();
        }
        catch (downloadError) {
            logger_1.logger.warn(`⚠️  Failed to download pricing data: ${downloadError.message}`);
            logger_1.logger.info('📋 Using local fallback pricing data...');
            await this.useFallbackPricing();
        }
    }
    _downloadFromRemote() {
        return new Promise((resolve, reject) => {
            const request = https.get(this.pricingUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        fs.writeFileSync(this.pricingFile, JSON.stringify(jsonData, null, 2));
                        this.pricingData = jsonData;
                        this.lastUpdated = new Date();
                        logger_1.logger.info(`💰 Downloaded pricing data for ${Object.keys(jsonData).length} models`);
                        this.setupFileWatcher();
                        resolve();
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse pricing data: ${error.message}`));
                    }
                });
            });
            request.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Download timeout after 30 seconds'));
            });
        });
    }
    async loadPricingData() {
        try {
            if (fs.existsSync(this.pricingFile)) {
                const data = fs.readFileSync(this.pricingFile, 'utf8');
                this.pricingData = JSON.parse(data);
                const stats = fs.statSync(this.pricingFile);
                this.lastUpdated = stats.mtime;
                logger_1.logger.info(`💰 Loaded pricing data for ${this.pricingData ? Object.keys(this.pricingData).length : 0} models from cache`);
            }
            else {
                logger_1.logger.warn('💰 No pricing data file found, will use fallback');
                await this.useFallbackPricing();
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to load pricing data:', error);
            await this.useFallbackPricing();
        }
    }
    async useFallbackPricing() {
        try {
            if (fs.existsSync(this.fallbackFile)) {
                logger_1.logger.info('📋 Copying fallback pricing data to data directory...');
                const fallbackData = fs.readFileSync(this.fallbackFile, 'utf8');
                const jsonData = JSON.parse(fallbackData);
                fs.writeFileSync(this.pricingFile, JSON.stringify(jsonData, null, 2));
                this.pricingData = jsonData;
                this.lastUpdated = new Date();
                this.setupFileWatcher();
                logger_1.logger.warn(`⚠️  Using fallback pricing data for ${Object.keys(jsonData).length} models`);
            }
            else {
                logger_1.logger.error('❌ Fallback pricing file not found at:', this.fallbackFile);
                this.pricingData = {};
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to use fallback pricing data:', error);
            this.pricingData = {};
        }
    }
    getModelPricing(modelName) {
        if (!this.pricingData || !modelName) {
            return null;
        }
        // 尝试直接匹配
        if (this.pricingData[modelName]) {
            logger_1.logger.debug(`💰 Found exact pricing match for ${modelName}`);
            return this.pricingData[modelName];
        }
        // 处理Bedrock区域前缀
        if (modelName.includes('.anthropic.') || modelName.includes('.claude')) {
            const withoutRegion = modelName.replace(/^(us|eu|apac)\./, '');
            if (this.pricingData[withoutRegion]) {
                logger_1.logger.debug(`💰 Found pricing for ${modelName} by removing region prefix: ${withoutRegion}`);
                return this.pricingData[withoutRegion];
            }
        }
        // 模糊匹配
        const normalizedModel = modelName.toLowerCase().replace(/[_-]/g, '');
        for (const [key, value] of Object.entries(this.pricingData)) {
            const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
            if (normalizedKey.includes(normalizedModel) || normalizedModel.includes(normalizedKey)) {
                logger_1.logger.debug(`💰 Found pricing for ${modelName} using fuzzy match: ${key}`);
                return value;
            }
        }
        logger_1.logger.debug(`💰 No pricing found for model: ${modelName}`);
        return null;
    }
    ensureCachePricing(pricing) {
        if (!pricing)
            return pricing;
        if (!pricing.cache_creation_input_token_cost && pricing.input_cost_per_token) {
            pricing.cache_creation_input_token_cost = pricing.input_cost_per_token * 1.25;
        }
        if (!pricing.cache_read_input_token_cost && pricing.input_cost_per_token) {
            pricing.cache_read_input_token_cost = pricing.input_cost_per_token * 0.1;
        }
        return pricing;
    }
    getEphemeral1hPricing(modelName) {
        if (!modelName)
            return 0;
        if (this.ephemeral1hPricing[modelName]) {
            return this.ephemeral1hPricing[modelName];
        }
        const modelLower = modelName.toLowerCase();
        if (modelLower.includes('opus'))
            return 0.00003;
        if (modelLower.includes('sonnet'))
            return 0.000006;
        if (modelLower.includes('haiku'))
            return 0.0000016;
        logger_1.logger.debug(`💰 No 1h cache pricing found for model: ${modelName}`);
        return 0;
    }
    calculateCost(usage, modelName) {
        const isLongContextModel = modelName && modelName.includes('[1m]');
        let isLongContextRequest = false;
        let useLongContextPricing = false;
        if (isLongContextModel) {
            const inputTokens = usage.input_tokens || 0;
            const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
            const cacheReadTokens = usage.cache_read_input_tokens || 0;
            const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
            if (totalInputTokens > 200000) {
                isLongContextRequest = true;
                if (this.longContextPricing[modelName]) {
                    useLongContextPricing = true;
                }
            }
        }
        const pricing = this.getModelPricing(modelName);
        if (!pricing && !useLongContextPricing) {
            return {
                inputCost: 0,
                outputCost: 0,
                cacheCreateCost: 0,
                cacheReadCost: 0,
                ephemeral5mCost: 0,
                ephemeral1hCost: 0,
                totalCost: 0,
                hasPricing: false,
                isLongContextRequest: false,
                pricing: {
                    input: 0,
                    output: 0,
                    cacheCreate: 0,
                    cacheRead: 0,
                    ephemeral1h: 0
                }
            };
        }
        let inputCost = 0;
        let outputCost = 0;
        if (useLongContextPricing) {
            const longContextPrices = this.longContextPricing[modelName] ||
                this.longContextPricing[Object.keys(this.longContextPricing)[0]];
            inputCost = (usage.input_tokens || 0) * longContextPrices.input;
            outputCost = (usage.output_tokens || 0) * longContextPrices.output;
        }
        else {
            inputCost = (usage.input_tokens || 0) * (pricing?.input_cost_per_token || 0);
            outputCost = (usage.output_tokens || 0) * (pricing?.output_cost_per_token || 0);
        }
        const cacheReadCost = (usage.cache_read_input_tokens || 0) * (pricing?.cache_read_input_token_cost || 0);
        let ephemeral5mCost = 0;
        let ephemeral1hCost = 0;
        let cacheCreateCost = 0;
        if (usage.cache_creation && typeof usage.cache_creation === 'object') {
            const ephemeral5mTokens = usage.cache_creation.ephemeral_5m_input_tokens || 0;
            const ephemeral1hTokens = usage.cache_creation.ephemeral_1h_input_tokens || 0;
            ephemeral5mCost = ephemeral5mTokens * (pricing?.cache_creation_input_token_cost || 0);
            ephemeral1hCost = ephemeral1hTokens * this.getEphemeral1hPricing(modelName);
            cacheCreateCost = ephemeral5mCost + ephemeral1hCost;
        }
        else if (usage.cache_creation_input_tokens) {
            cacheCreateCost = (usage.cache_creation_input_tokens || 0) * (pricing?.cache_creation_input_token_cost || 0);
            ephemeral5mCost = cacheCreateCost;
        }
        return {
            inputCost,
            outputCost,
            cacheCreateCost,
            cacheReadCost,
            ephemeral5mCost,
            ephemeral1hCost,
            totalCost: inputCost + outputCost + cacheCreateCost + cacheReadCost,
            hasPricing: true,
            isLongContextRequest,
            pricing: {
                input: useLongContextPricing ?
                    (this.longContextPricing[modelName] || this.longContextPricing[Object.keys(this.longContextPricing)[0]])?.input || 0 :
                    pricing?.input_cost_per_token || 0,
                output: useLongContextPricing ?
                    (this.longContextPricing[modelName] || this.longContextPricing[Object.keys(this.longContextPricing)[0]])?.output || 0 :
                    pricing?.output_cost_per_token || 0,
                cacheCreate: pricing?.cache_creation_input_token_cost || 0,
                cacheRead: pricing?.cache_read_input_token_cost || 0,
                ephemeral1h: this.getEphemeral1hPricing(modelName)
            }
        };
    }
    formatCost(cost) {
        if (cost === 0)
            return '$0.000000';
        if (cost < 0.000001)
            return `$${cost.toExponential(2)}`;
        if (cost < 0.01)
            return `$${cost.toFixed(6)}`;
        if (cost < 1)
            return `$${cost.toFixed(4)}`;
        return `$${cost.toFixed(2)}`;
    }
    getStatus() {
        return {
            initialized: this.pricingData !== null,
            lastUpdated: this.lastUpdated,
            modelCount: this.pricingData ? Object.keys(this.pricingData).length : 0,
            nextUpdate: this.lastUpdated ? new Date(this.lastUpdated.getTime() + this.updateInterval) : null
        };
    }
    setupFileWatcher() {
        try {
            if (this.fileWatcher) {
                this.fileWatcher.close();
                this.fileWatcher = null;
            }
            if (!fs.existsSync(this.pricingFile)) {
                logger_1.logger.debug('💰 Pricing file does not exist yet, skipping file watcher setup');
                return;
            }
            const watchOptions = {
                persistent: true,
                interval: 60000
            };
            let lastMtime = fs.statSync(this.pricingFile).mtimeMs;
            fs.watchFile(this.pricingFile, watchOptions, (curr, _prev) => {
                if (curr.mtimeMs !== lastMtime) {
                    lastMtime = curr.mtimeMs;
                    logger_1.logger.debug(`💰 Detected change in pricing file (mtime: ${new Date(curr.mtime).toISOString()})`);
                    this.handleFileChange();
                }
            });
            this.fileWatcher = {
                close: () => fs.unwatchFile(this.pricingFile)
            };
            logger_1.logger.info('👁️  File watcher set up for model_pricing.json (polling every 60s)');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to setup file watcher:', error);
        }
    }
    handleFileChange() {
        if (this.reloadDebounceTimer) {
            clearTimeout(this.reloadDebounceTimer);
        }
        this.reloadDebounceTimer = setTimeout(async () => {
            logger_1.logger.info('🔄 Reloading pricing data due to file change...');
            await this.reloadPricingData();
        }, 500);
    }
    async reloadPricingData() {
        try {
            if (!fs.existsSync(this.pricingFile)) {
                logger_1.logger.warn('💰 Pricing file was deleted, using fallback');
                await this.useFallbackPricing();
                this.setupFileWatcher();
                return;
            }
            const data = fs.readFileSync(this.pricingFile, 'utf8');
            const jsonData = JSON.parse(data);
            if (typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
                throw new Error('Invalid pricing data structure');
            }
            this.pricingData = jsonData;
            this.lastUpdated = new Date();
            const modelCount = Object.keys(jsonData).length;
            logger_1.logger.info(`💰 Reloaded pricing data for ${modelCount} models from file`);
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to reload pricing data:', error);
            logger_1.logger.warn('💰 Keeping existing pricing data in memory');
        }
    }
    cleanup() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
            logger_1.logger.debug('💰 File watcher closed');
        }
        if (this.reloadDebounceTimer) {
            clearTimeout(this.reloadDebounceTimer);
            this.reloadDebounceTimer = null;
        }
    }
}
exports.pricingService = new PricingService();
exports.default = exports.pricingService;
//# sourceMappingURL=pricingService.js.map