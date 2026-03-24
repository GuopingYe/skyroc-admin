import { createRequest } from '@sa/axios';

import { globalConfig } from '@/config';

import { getAuthorization } from './shared';

/** 检查是否为包装的 API 响应格式 { code, msg, data } */
function isWrappedResponse(data: unknown): data is { code: string; msg?: string; data?: unknown } {
  return data !== null && typeof data === 'object' && 'code' in data;
}

/**
 * Global Library API 请求实例
 *
 * 后端 Global Library API 直接返回 JSON 数据，不包装在 { code, data } 结构中
 * 注意：认证错误等仍可能返回 { code, msg, data } 结构，需要特殊处理
 */
export const glRequest = createRequest<unknown>(
  {
    baseURL: globalConfig.serviceBaseURL
  },
  {
    isBackendSuccess(response) {
      const { data } = response;
      if (isWrappedResponse(data)) {
        return String(data.code) === import.meta.env.VITE_SERVICE_SUCCESS_CODE;
      }
      return true;
    },
    async onBackendFail(response) {
      const { data } = response;
      if (isWrappedResponse(data) && 'msg' in data && data.msg) {
        window.$message?.error(data.msg);
      }
    },
    onError(error) {
      window.$message?.error(error.message);
    },
    async onRequest(config) {
      const Authorization = getAuthorization();
      Object.assign(config.headers, { Authorization });
      return config;
    },
    transformBackendResponse(response) {
      const { data } = response;
      if (isWrappedResponse(data) && 'data' in data) {
        return data.data;
      }
      return data;
    }
  }
);
