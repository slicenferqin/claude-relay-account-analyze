import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ElMessage } from 'element-plus';

// API客户端配置
const config = {
  baseURL: import.meta.env.DEV ? 'http://localhost:3000' : '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// 创建axios实例
const apiClient: AxiosInstance = axios.create(config);

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    console.error('API request failed:', error);

    // 处理不同的错误状态码
    if (error.response) {
      const { status, data } = error.response;
      let message = 'Unknown error occurred';

      switch (status) {
        case 400:
          message = (data as any)?.error || 'Bad request';
          break;
        case 401:
          message = 'Unauthorized access';
          // 可以在这里处理登录跳转
          break;
        case 403:
          message = 'Access forbidden';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 429:
          message = 'Too many requests, please try again later';
          break;
        case 500:
          message = 'Internal server error';
          break;
        case 502:
          message = 'Bad gateway';
          break;
        case 503:
          message = 'Service unavailable';
          break;
        default:
          message = (data as any)?.error || `Request failed with status ${status}`;
      }

      // 显示错误消息
      ElMessage.error({
        message,
        duration: 5000,
      });
    } else if (error.request) {
      // 网络错误
      ElMessage.error({
        message: 'Network error, please check your connection',
        duration: 5000,
      });
    } else {
      // 其他错误
      ElMessage.error({
        message: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
    }

    return Promise.reject(error);
  }
);

export { apiClient };

// 导出常用的API方法
export const api = {
  get: <T = any>(url: string, params?: any): Promise<AxiosResponse<T>> => {
    return apiClient.get(url, { params });
  },
  
  post: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    return apiClient.post(url, data);
  },
  
  put: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    return apiClient.put(url, data);
  },
  
  delete: <T = any>(url: string): Promise<AxiosResponse<T>> => {
    return apiClient.delete(url);
  }
};