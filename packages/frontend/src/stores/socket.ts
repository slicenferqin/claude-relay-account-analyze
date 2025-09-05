import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { ApiKeyStatistics } from '../types/apikey';
import { AccountStatistics } from '../types/account';
import { SystemMetrics } from '../types/system';
import { ElMessage } from 'element-plus';

export const useSocketStore = defineStore('socket', () => {
  // 状态
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  const subscribers = ref<Set<string>>(new Set());

  // 事件回调
  const apiKeyUpdateCallbacks = ref<Set<(data: ApiKeyStatistics) => void>>(new Set());
  const accountUpdateCallbacks = ref<Set<(data: AccountStatistics) => void>>(new Set());
  const systemMetricsUpdateCallbacks = ref<Set<(data: SystemMetrics) => void>>(new Set());

  // 连接WebSocket
  const connect = () => {
    if (socket.value?.connected) {
      return;
    }

    const socketUrl = import.meta.env.DEV 
      ? 'http://localhost:3002'
      : window.location.origin;

    socket.value = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000
    });

    setupEventListeners();
  };

  // 设置事件监听器
  const setupEventListeners = () => {
    if (!socket.value) return;

    socket.value.on('connect', () => {
      isConnected.value = true;
      connectionError.value = null;
      console.log('WebSocket connected');
    });

    socket.value.on('disconnect', (reason) => {
      isConnected.value = false;
      console.log('WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // 服务器主动断开连接，需要重新连接
        setTimeout(() => {
          socket.value?.connect();
        }, 5000);
      }
    });

    socket.value.on('connect_error', (error) => {
      connectionError.value = error.message;
      console.error('WebSocket connection error:', error);
    });

    socket.value.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // API Key更新事件
    socket.value.on('apikey:update', (data: ApiKeyStatistics) => {
      apiKeyUpdateCallbacks.value.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in apikey update callback:', error);
        }
      });
    });

    // 账户更新事件
    socket.value.on('account:update', (data: AccountStatistics) => {
      accountUpdateCallbacks.value.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in account update callback:', error);
        }
      });
    });

    // 系统指标更新事件
    socket.value.on('metrics:update', (data: SystemMetrics) => {
      systemMetricsUpdateCallbacks.value.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in metrics update callback:', error);
        }
      });
    });

    // 告警事件
    socket.value.on('alert', (data: any) => {
      const { type, title, message } = data;
      
      switch (type) {
        case 'error':
          ElMessage.error({ title, message, duration: 5000 });
          break;
        case 'warning':
          ElMessage.warning({ title, message, duration: 4000 });
          break;
        case 'success':
          ElMessage.success({ title, message, duration: 3000 });
          break;
        case 'info':
        default:
          ElMessage.info({ title, message, duration: 3000 });
          break;
      }
    });

    // 连接成功消息
    socket.value.on('connected', (data) => {
      console.log('Connected to dashboard service:', data.message);
    });
  };

  // 断开连接
  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
    isConnected.value = false;
    subscribers.value.clear();
  };

  // 订阅API Key更新
  const subscribeToApiKey = (keyId: string) => {
    if (!socket.value?.connected) {
      console.warn('Socket not connected, cannot subscribe to API key');
      return;
    }

    const subscriptionKey = `apikey:${keyId}`;
    if (subscribers.value.has(subscriptionKey)) {
      return;
    }

    socket.value.emit('subscribe:apikey', { keyId });
    subscribers.value.add(subscriptionKey);
  };

  // 订阅账户更新
  const subscribeToAccount = (accountId: string) => {
    if (!socket.value?.connected) {
      console.warn('Socket not connected, cannot subscribe to account');
      return;
    }

    const subscriptionKey = `account:${accountId}`;
    if (subscribers.value.has(subscriptionKey)) {
      return;
    }

    socket.value.emit('subscribe:account', { accountId });
    subscribers.value.add(subscriptionKey);
  };

  // 订阅分组更新
  const subscribeToGroup = (groupId: string) => {
    if (!socket.value?.connected) {
      console.warn('Socket not connected, cannot subscribe to group');
      return;
    }

    const subscriptionKey = `group:${groupId}`;
    if (subscribers.value.has(subscriptionKey)) {
      return;
    }

    socket.value.emit('subscribe:group', { groupId });
    subscribers.value.add(subscriptionKey);
  };

  // 订阅系统指标
  const subscribeToSystemMetrics = () => {
    if (!socket.value?.connected) {
      console.warn('Socket not connected, cannot subscribe to system metrics');
      return;
    }

    const subscriptionKey = 'system:metrics';
    if (subscribers.value.has(subscriptionKey)) {
      return;
    }

    socket.value.emit('subscribe:system', {});
    subscribers.value.add(subscriptionKey);
  };

  // 取消订阅
  const unsubscribe = (type: string, id: string) => {
    if (!socket.value?.connected) {
      return;
    }

    const subscriptionKey = `${type}:${id}`;
    if (!subscribers.value.has(subscriptionKey)) {
      return;
    }

    socket.value.emit('unsubscribe', { type, id });
    subscribers.value.delete(subscriptionKey);
  };

  // 注册事件回调
  const onApiKeyUpdate = (callback: (data: ApiKeyStatistics) => void) => {
    apiKeyUpdateCallbacks.value.add(callback);
    
    // 返回取消注册函数
    return () => {
      apiKeyUpdateCallbacks.value.delete(callback);
    };
  };

  const onAccountUpdate = (callback: (data: AccountStatistics) => void) => {
    accountUpdateCallbacks.value.add(callback);
    
    return () => {
      accountUpdateCallbacks.value.delete(callback);
    };
  };

  const onSystemMetricsUpdate = (callback: (data: SystemMetrics) => void) => {
    systemMetricsUpdateCallbacks.value.add(callback);
    
    return () => {
      systemMetricsUpdateCallbacks.value.delete(callback);
    };
  };

  // 重连
  const reconnect = () => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  };

  return {
    // 状态
    isConnected,
    connectionError,
    subscribers,

    // 方法
    connect,
    disconnect,
    reconnect,
    subscribeToApiKey,
    subscribeToAccount,
    subscribeToGroup,
    subscribeToSystemMetrics,
    unsubscribe,
    onApiKeyUpdate,
    onAccountUpdate,
    onSystemMetricsUpdate
  };
});