import { type APIRequestContext, expect, request, test } from '@playwright/test';

const backendBaseUrl = 'http://127.0.0.1:8080';
const adminCredentials = { password: 'admin123', userName: 'admin' };

async function createAdminApiContext(): Promise<APIRequestContext> {
  const unauthenticated = await request.newContext({ baseURL: backendBaseUrl });
  const loginResponse = await unauthenticated.post('/api/v1/auth/login', { data: adminCredentials });
  expect(loginResponse.ok()).toBeTruthy();

  const loginPayload = await loginResponse.json();
  const token = loginPayload.data.token as string;
  await unauthenticated.dispose();

  return request.newContext({
    baseURL: backendBaseUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` }
  });
}

async function expectJson(
  response: Awaited<ReturnType<APIRequestContext['get'] | APIRequestContext['post'] | APIRequestContext['put']>>
) {
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  if (payload && typeof payload === 'object' && 'code' in payload) {
    expect(payload.code).toBe('0000');
  }
  return payload;
}

async function ensureAutoLogin(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'admin' })).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
}

test.describe.configure({ mode: 'serial' });

test.describe('Programming Tracker', () => {
  test('can create task and transition status', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();

      // Create hierarchy: TA -> Compound -> Study -> Analysis
      const taResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'TA', title: `E2E Tracker TA ${timestamp}` }
      });
      const taData = (await expectJson(taResp)).data;

      const compoundResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taData.id, title: `E2E Tracker Compound ${timestamp}` }
      });
      const compoundData = (await expectJson(compoundResp)).data;

      const studyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E Tracker Study ${timestamp}`,
          title: `E2E-TRACKER-STUDY-${timestamp}`
        }
      });
      const studyData = (await expectJson(studyResp)).data;

      const analysisResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'ANALYSIS', parent_id: studyData.id, title: `E2E Tracker Analysis ${timestamp}` }
      });
      const analysisData = (await expectJson(analysisResp)).data;

      // Create task via API
      const taskResp = await api.post('/api/v1/mdr/tracker/task', {
        data: {
          analysis_id: analysisData.id,
          deliverable_type: 'SDTM',
          deliverable_name: 'dm',
          task_name: `E2E Task ${timestamp}`,
          priority: 'High',
          created_by: 'admin'
        }
      });
      const taskData = (await expectJson(taskResp)).data;
      const taskId = taskData.id;

      // Verify task exists via API
      const taskDetailResp = await api.get(`/api/v1/mdr/tracker/task/${taskId}`);
      const taskDetail = (await expectJson(taskDetailResp)).data;
      expect(taskDetail.task_name).toBe(`E2E Task ${timestamp}`);

      // Transition status via API
      const transitionResp = await api.post(`/api/v1/mdr/tracker/task/${taskId}/transition`, {
        data: { action: 'start_programming', user_id: 'admin' }
      });
      const transitionData = (await expectJson(transitionResp)).data;
      expect(transitionData.prod_status).toBe('Programming');

      // Verify via UI - navigate to tracker
      await ensureAutoLogin(page);
      await page.goto('/mdr/programming-tracker');
      await page.waitForTimeout(1000);

      // Verify table is visible
      await expect(page.locator('.ant-table')).toBeVisible({ timeout: 15_000 });
    } finally {
      await api.dispose();
    }
  });

  test('can create and respond to QC issue', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();

      // Create hierarchy
      const taResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'TA', title: `E2E Issue TA ${timestamp}` }
      });
      const taData = (await expectJson(taResp)).data;

      const compoundResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taData.id, title: `E2E Issue Compound ${timestamp}` }
      });
      const compoundData = (await expectJson(compoundResp)).data;

      const studyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E Issue Study ${timestamp}`,
          title: `E2E-ISSUE-STUDY-${timestamp}`
        }
      });
      const studyData = (await expectJson(studyResp)).data;

      const analysisResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'ANALYSIS', parent_id: studyData.id, title: `E2E Issue Analysis ${timestamp}` }
      });
      const analysisData = (await expectJson(analysisResp)).data;

      // Create task
      const taskResp = await api.post('/api/v1/mdr/tracker/task', {
        data: {
          analysis_id: analysisData.id,
          deliverable_type: 'SDTM',
          deliverable_name: 'ae',
          task_name: `E2E Issue Task ${timestamp}`,
          priority: 'High',
          created_by: 'admin'
        }
      });
      const taskData = (await expectJson(taskResp)).data;
      const taskId = taskData.id;

      // Create issue
      const issueResp = await api.post(`/api/v1/mdr/tracker/task/${taskId}/issues`, {
        data: {
          qc_cycle: 'Dry Run 1',
          finding_description: `E2E Issue: Variable label missing ${timestamp}`,
          finding_category: 'Structure',
          severity: 'Major',
          raised_by: 'admin'
        }
      });
      const issueData = (await expectJson(issueResp)).data;
      const issueId = issueData.id;

      // Respond to issue
      const respondResp = await api.put(`/api/v1/mdr/tracker/issue/${issueId}/response`, {
        data: {
          developer_response: `Fixed - added label ${timestamp}`,
          responded_by: 'admin'
        }
      });
      const respondData = (await expectJson(respondResp)).data;
      expect(respondData.developer_response).toBe(`Fixed - added label ${timestamp}`);

      // Verify issues list
      const issuesResp = await api.get(`/api/v1/mdr/tracker/task/${taskId}/issues`);
      const issuesData = (await expectJson(issuesResp)).data;
      expect(issuesData.total).toBeGreaterThanOrEqual(1);
    } finally {
      await api.dispose();
    }
  });
});
