import { request } from '../request';
import { MDR_URLS } from '../urls';

/**
 * Create tracker task
 *
 * @param data Task creation parameters
 */
export function createTrackerTask(data: Api.MDR.TrackerTaskCreateParams) {
  return request<string>({
    data,
    method: 'post',
    url: MDR_URLS.TRACKER_TASK_CREATE
  });
}

/**
 * Update tracker task
 *
 * @param data Task update parameters
 */
export function updateTrackerTask(data: Api.MDR.TrackerTaskUpdateParams) {
  const { id, ...params } = data;
  return request<boolean>({
    data: params,
    method: 'put',
    url: MDR_URLS.TRACKER_TASK_UPDATE.replace(':id', id)
  });
}

/**
 * Delete tracker task
 *
 * @param taskId Task ID
 */
export function deleteTrackerTask(taskId: string) {
  return request<boolean>({
    method: 'delete',
    url: MDR_URLS.TRACKER_TASK_DELETE.replace(':id', taskId)
  });
}

/**
 * Get tracker task list
 *
 * @param analysisId Analysis ID
 * @param category Task category
 */
export function getTrackerTaskList(analysisId: string, category: Api.MDR.TaskCategory) {
  return request<Api.MDR.TrackerTask[]>({
    params: { analysisId, category },
    url: MDR_URLS.TRACKER_TASK_LIST
  });
}

/**
 * Create spec variable
 *
 * @param data Variable creation parameters
 */
export function createSpecVariable(data: Api.MDR.SpecVariableCreateParams) {
  return request<string>({
    data,
    method: 'post',
    url: MDR_URLS.SPEC_VARIABLE_CREATE
  });
}

/**
 * Update spec variable
 *
 * @param data Variable update parameters
 */
export function updateSpecVariable(data: Api.MDR.SpecVariableUpdateParams) {
  const { id, ...params } = data;
  return request<boolean>({
    data: params,
    method: 'put',
    url: MDR_URLS.SPEC_VARIABLE_UPDATE.replace(':id', id)
  });
}

/**
 * Delete spec variable
 *
 * @param variableId Variable ID
 */
export function deleteSpecVariable(variableId: string) {
  return request<boolean>({
    method: 'delete',
    url: MDR_URLS.SPEC_VARIABLE_DELETE.replace(':id', variableId)
  });
}

/**
 * Get spec variable list
 *
 * @param datasetKey Dataset key
 * @param standard Standard type
 */
export function getSpecVariableList(datasetKey: string, standard: Api.MDR.StandardType) {
  return request<Api.MDR.SpecVariable[]>({
    params: { datasetKey, standard },
    url: MDR_URLS.SPEC_VARIABLE_LIST
  });
}
