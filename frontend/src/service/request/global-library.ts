import { createRequest } from '@sa/axios';

/**
 * Global Library API 请求实例
 *
 * 后端 Global Library API 直接返回 JSON 数据，不包装在 { code, data } 结构中 因此需要单独的请求实例来处理这种格式
 */
export const glRequest = createRequest<unknown>(
  {
    baseURL: import.meta.env.VITE_SERVICE_BASE_URL
  },
  {
    // 后端直接返回数据，始终认为成功
    isBackendSuccess: () => true,
    onError(error) {
      window.$message?.error(error.message);
    },
    transformBackendResponse(response) {
      // 直接返回响应数据
      return response.data;
    }
  }
);
