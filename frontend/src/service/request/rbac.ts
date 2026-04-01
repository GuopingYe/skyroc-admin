import { createRequest } from '@sa/axios';

import { globalConfig } from '@/config';

import { backEndFail, handleError } from './error';
import { getAuthorization } from './shared';
import type { RequestInstanceState } from './type';

function isWrappedBackendResponse(data: unknown): data is App.Service.Response {
  return Boolean(data && typeof data === 'object' && 'code' in data);
}

/**
 * RBAC endpoints currently return raw success payloads and wrapped error payloads. This request instance accepts both
 * so the UI can consume the real backend.
 */
export const rbacRequest = createRequest<App.Service.Response, RequestInstanceState>(
  {
    baseURL: globalConfig.serviceBaseURL,
    timeout: 30 * 1000
  },
  {
    isBackendSuccess(response) {
      if (!isWrappedBackendResponse(response.data)) {
        return true;
      }
      return String(response.data.code) === import.meta.env.VITE_SERVICE_SUCCESS_CODE;
    },
    async onBackendFail(response, instance) {
      await backEndFail(response, instance, rbacRequest);
    },
    onError(error) {
      handleError(error, rbacRequest);
    },
    async onRequest(config) {
      const Authorization = getAuthorization();
      Object.assign(config.headers, { Authorization });
      return config;
    },
    transformBackendResponse(response) {
      if (!isWrappedBackendResponse(response.data)) {
        return response.data;
      }
      return response.data.data;
    }
  }
);
