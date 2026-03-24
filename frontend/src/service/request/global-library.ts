import { createRequest } from '@sa/axios';

import { globalConfig } from '@/config';

import { getAuthorization } from './shared';

/**
 * Global Library API 请求实例
 *
 * 后端 Global Library API 直接返回 JSON 数据，不包装在 { code, data } 结构中 因此需要单独的请求实例来处理这种格式
 * 注意：认证错误等仍可能返回 { code, msg, data } 结构，需要特殊处理
 */
export const glRequest = createRequest<unknown>(
  {
    baseURL: globalConfig.serviceBaseURL
  },
  {
    // 检查是否为后端错误响应（如认证失败）
    isBackendSuccess(response) {
      const data = response.data;
      // 如果返回的是 { code, msg, data } 结构且 code 不是成功码，则认为是失败
      if (data && typeof data === 'object' && 'code' in data) {
        return String(data.code) === import.meta.env.VITE_SERVICE_SUCCESS_CODE;
      }
      // 其他情况（直接返回数据）认为是成功
      return true;
    },
    async onBackendFail(response) {
      // 显示后端错误消息
      const data = response.data;
      if (data && typeof data === 'object' && 'msg' in data) {
        window.$message?.error(data.msg as string);
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
      // 如果是错误响应格式，返回 null 让调用方处理
      const data = response.data;
      if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
        return data.data;
      }
      // 直接返回响应数据
      return response.data;
    }
  }
);
