// 本地工具函数，临时替换shared包
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateTime = (date: Date): string => {
  return date.toISOString().replace('T', ' ').slice(0, 19);
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) { // 小于1分钟
    return '刚刚';
  } else if (diffMs < 3600000) { // 小于1小时
    return `${Math.floor(diffMs / 60000)}分钟前`;
  } else if (diffMs < 86400000) { // 小于1天
    return `${Math.floor(diffMs / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};