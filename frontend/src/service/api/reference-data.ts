import { referenceDataRequest } from '../request/reference-data';
import { REFERENCE_DATA_URLS } from '../urls';

/** 获取所有参考数据分类 */
export function fetchReferenceCategories() {
  return referenceDataRequest<Api.ReferenceData.CategorySummary[]>({
    method: 'get',
    url: REFERENCE_DATA_URLS.CATEGORIES
  });
}

/** 获取指定分类的参考数据条目 */
export function fetchReferenceItems(
  category: string,
  params?: { is_active?: boolean; is_deleted?: boolean }
) {
  return referenceDataRequest<Api.ReferenceData.ReferenceDataItem[]>({
    method: 'get',
    params,
    url: REFERENCE_DATA_URLS.ITEMS(category)
  });
}

/** 获取单个参考数据条目 */
export function fetchReferenceItem(category: string, code: string) {
  return referenceDataRequest<Api.ReferenceData.ReferenceDataItem>({
    method: 'get',
    url: REFERENCE_DATA_URLS.ITEM_BY_CODE(category, code)
  });
}

/** 创建参考数据条目 */
export function fetchCreateReferenceItem(
  category: string,
  data: Api.ReferenceData.CreateRequest
) {
  return referenceDataRequest<Api.ReferenceData.ReferenceDataItem>({
    data,
    method: 'post',
    url: REFERENCE_DATA_URLS.ITEMS(category)
  });
}

/** 更新参考数据条目 */
export function fetchUpdateReferenceItem(
  category: string,
  code: string,
  data: Api.ReferenceData.UpdateRequest
) {
  return referenceDataRequest<Api.ReferenceData.ReferenceDataItem>({
    data,
    method: 'put',
    url: REFERENCE_DATA_URLS.ITEM_BY_CODE(category, code)
  });
}

/** 停用参考数据条目（软删除） */
export function fetchDeactivateReferenceItem(category: string, code: string) {
  return referenceDataRequest<void>({
    method: 'post',
    url: REFERENCE_DATA_URLS.DEACTIVATE(category, code)
  });
}

/** 恢复已停用的参考数据条目 */
export function fetchRestoreReferenceItem(category: string, code: string) {
  return referenceDataRequest<void>({
    method: 'post',
    url: REFERENCE_DATA_URLS.RESTORE(category, code)
  });
}
