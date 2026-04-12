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

test.describe('Pipeline Management', () => {
  test('can create TA, compound, study, and update config', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();
      const taName = `E2E TA ${timestamp}`;

      // Create TA via API
      const taResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'TA', title: taName }
      });
      const taData = (await expectJson(taResp)).data;

      // Create compound
      const compoundResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taData.id, title: `E2E Compound ${timestamp}` }
      });
      const compoundData = (await expectJson(compoundResp)).data;

      // Create study
      const studyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E Study ${timestamp}`,
          title: `E2E-STUDY-${timestamp}`
        }
      });
      const studyData = (await expectJson(studyResp)).data;

      // Verify via UI
      await ensureAutoLogin(page);
      await page.goto('/mdr/pipeline-management');

      // Verify tree shows the TA
      const treeSearch = page.getByTestId('pipeline-tree-search');
      await treeSearch.fill(taName);
      await page.getByText(taName, { exact: true }).click();

      // Verify compound row is visible
      const compoundRow = page.locator('tbody tr').filter({ hasText: `E2E Compound` }).first();
      await expect(compoundRow).toBeVisible({ timeout: 15_000 });

      // Navigate to study
      await compoundRow.getByRole('button', { name: /View|查看/ }).click();
      const studyRow = page.locator('tbody tr').filter({ hasText: `E2E-STUDY-${timestamp}` }).first();
      await expect(studyRow).toBeVisible({ timeout: 15_000 });

      // Update study config via API
      const configResp = await api.put(`/api/v1/pipeline/studies/${studyData.id}/config`, {
        data: { phase: 'Phase II', protocol_title: `E2E Study ${timestamp} Updated` }
      });
      await expectJson(configResp);
    } finally {
      await api.dispose();
    }
  });

  test('can create and manage milestones', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();
      const taName = `E2E MS TA ${timestamp}`;

      // Create hierarchy
      const taResp = await api.post('/api/v1/pipeline/nodes', { data: { node_type: 'TA', title: taName } });
      const taData = (await expectJson(taResp)).data;

      const compoundResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taData.id, title: `E2E MS Compound ${timestamp}` }
      });
      const compoundData = (await expectJson(compoundResp)).data;

      const studyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E MS Study ${timestamp}`,
          title: `E2E-MS-STUDY-${timestamp}`
        }
      });
      const studyData = (await expectJson(studyResp)).data;

      // Create milestone via API
      const msResp = await api.post('/api/v1/pipeline/milestones', {
        data: {
          name: 'Database Lock',
          study_id: studyData.id,
          level: 'Study',
          planned_date: '2024-12-31',
          status: 'Planned'
        }
      });
      const msData = (await expectJson(msResp)).data;

      // Verify milestone exists
      const msListResp = await api.get(`/api/v1/pipeline/milestones?study_id=${studyData.id}`);
      const msList = (await expectJson(msListResp)).data;
      expect(msList.length).toBeGreaterThanOrEqual(1);

      // Update milestone
      const updateResp = await api.put(`/api/v1/pipeline/milestones/${msData.id}`, {
        data: { status: 'Completed' }
      });
      const updatedMs = (await expectJson(updateResp)).data;
      expect(updatedMs.status).toBe('Completed');
    } finally {
      await api.dispose();
    }
  });

  test('can archive and unarchive a node', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();
      const taName = `E2E Archive TA ${timestamp}`;

      const taResp = await api.post('/api/v1/pipeline/nodes', { data: { node_type: 'TA', title: taName } });
      const taData = (await expectJson(taResp)).data;

      // Archive via API
      const archiveResp = await api.put(`/api/v1/pipeline/nodes/${taData.id}/archive`, {
        data: { status: 'Archived' }
      });
      const archivedData = (await expectJson(archiveResp)).data;
      expect(archivedData.status).toBe('Archived');

      // Unarchive
      const unarchiveResp = await api.put(`/api/v1/pipeline/nodes/${taData.id}/archive`, {
        data: { status: 'Active' }
      });
      const unarchivedData = (await expectJson(unarchiveResp)).data;
      expect(unarchivedData.status).toBe('Active');
    } finally {
      await api.dispose();
    }
  });
});
