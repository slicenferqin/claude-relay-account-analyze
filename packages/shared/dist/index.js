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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePercentage = exports.formatCurrency = exports.formatNumber = exports.formatTime = exports.formatDateTime = exports.formatDate = void 0;
// 导出所有类型
__exportStar(require("./types/apikey"), exports);
__exportStar(require("./types/account"), exports);
__exportStar(require("./types/group"), exports);
__exportStar(require("./types/system"), exports);
// 工具函数
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};
exports.formatDate = formatDate;
const formatDateTime = (date) => {
    return date.toISOString().replace('T', ' ').slice(0, 19);
};
exports.formatDateTime = formatDateTime;
const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60000) { // 小于1分钟
        return '刚刚';
    }
    else if (diffMs < 3600000) { // 小于1小时
        return `${Math.floor(diffMs / 60000)}分钟前`;
    }
    else if (diffMs < 86400000) { // 小于1天
        return `${Math.floor(diffMs / 3600000)}小时前`;
    }
    else {
        return date.toLocaleDateString('zh-CN');
    }
};
exports.formatTime = formatTime;
const formatNumber = (num) => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};
exports.formatNumber = formatNumber;
const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
};
exports.formatCurrency = formatCurrency;
const calculatePercentage = (value, total) => {
    if (total === 0)
        return 0;
    return Math.round((value / total) * 100);
};
exports.calculatePercentage = calculatePercentage;
