import { rbacRequest } from '../request/rbac';
import { REFERENCE_DATA_URLS } from '../urls';

export function fetchReferenceCategories() {
  return rbacRequest<Api.ReferenceData.CategorySummary[]>({
    method: 'get',
    url: REFERENCE_DATA_URLS.CATEGORIES
  });
}

export function fetchReferenceItems(
  category: string,
  params?: { is_active?: boolean; is_deleted?: boolean }
) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem[]>({
    method: 'get',
    params,
    url: REFERENCE_DATA_URLS.ITEMS(category)
  });
}

export function fetchReferenceItem(category: string, code: string) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    method: 'get',
    url: REFERENCE_DATA_URLS.ITEM_BY_CODE(category, code)
  });
}

export function fetchCreateReferenceItem(
  category: string,
  data: Api.ReferenceData.CreateRequest
) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    data,
    method: 'post',
    url: REFERENCE_DATA_URLS.ITEMS(category)
  });
}

export function fetchUpdateReferenceItem(
  category: string,
  code: string,
  data: Api.ReferenceData.UpdateRequest
) {
  return rbacRequest<Api.ReferenceData.ReferenceDataItem>({
    data,
    method: 'put',
    url: REFERENCE_DATA_URLS.ITEM_BY_CODE(category, code)
  });
}

export function fetchDeactivateReferenceItem(category: string, code: string) {
  return rbacRequest<void>({
    method: 'post',
    url: REFERENCE_DATA_URLS.DEACTIVATE(category, code)
  });
}

export function fetchRestoreReferenceItem(category: string, code: string) {
  return rbacRequest<void>({
    method: 'post',
    url: REFERENCE_DATA_URLS.RESTORE(category, code)
  });
}
