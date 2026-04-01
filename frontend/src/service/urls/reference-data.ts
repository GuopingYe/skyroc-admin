/** Reference Data Module URLs */

export const REFERENCE_DATA_URLS = {
  CATEGORIES: '/api/v1/reference-data',
  ITEMS: (category: string) => `/api/v1/reference-data/${category}`,
  ITEM_BY_CODE: (category: string, code: string) => `/api/v1/reference-data/${category}/${code}`,
  DEACTIVATE: (category: string, code: string) => `/api/v1/reference-data/${category}/${code}/deactivate`,
  RESTORE: (category: string, code: string) => `/api/v1/reference-data/${category}/${code}/restore`
} as const;
