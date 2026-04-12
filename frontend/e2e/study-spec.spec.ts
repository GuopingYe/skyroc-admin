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

test.describe('Study Specification', () => {
  test('can initialize spec and view sources', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();

      // Create hierarchy
      const taResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'TA', title: `E2E Spec TA ${timestamp}` }
      });
      const taData = (await expectJson(taResp)).data;

      const compoundResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taData.id, title: `E2E Spec Compound ${timestamp}` }
      });
      const compoundData = (await expectJson(compoundResp)).data;

      const studyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E Spec Study ${timestamp}`,
          title: `E2E-SPEC-STUDY-${timestamp}`
        }
      });
      const studyData = (await expectJson(studyResp)).data;

      // Verify study spec sources endpoint works
      const sourcesResp = await api.get(`/api/v1/study-specs/sources?scope_node_id=${studyData.id}`);
      const sourcesData = (await expectJson(sourcesResp)).data;
      expect(sourcesData).toHaveProperty('cdisc_domains');
      expect(sourcesData).toHaveProperty('ta_domains');
      expect(sourcesData).toHaveProperty('product_domains');

      // Verify via UI
      await ensureAutoLogin(page);
      await page.goto('/mdr/pipeline-management');

      // Navigate to study
      const treeSearch = page.getByTestId('pipeline-tree-search');
      await treeSearch.fill(`E2E Spec TA`);
      await page.getByText(`E2E Spec TA ${timestamp}`, { exact: true }).click();

      // Verify study row is visible
      const studyRow = page.locator('tbody tr').filter({ hasText: `E2E-SPEC-STUDY-${timestamp}` }).first();
      await expect(studyRow).toBeVisible({ timeout: 15_000 });
    } finally {
      await api.dispose();
    }
  });

  test('can copy spec between studies', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();

      // Create source study with spec
      const taResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'TA', title: `E2E Copy TA ${timestamp}` }
      });
      const taData = (await expectJson(taResp)).data;

      const compoundResp = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taData.id, title: `E2E Copy Compound ${timestamp}` }
      });
      const compoundData = (await expectJson(compoundResp)).data;

      const sourceStudyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E Source Study ${timestamp}`,
          title: `E2E-SOURCE-STUDY-${timestamp}`
        }
      });
      const sourceStudyData = (await expectJson(sourceStudyResp)).data;

      // Create target study
      const targetStudyResp = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundData.id,
          phase: 'Phase I',
          protocol_title: `E2E Target Study ${timestamp}`,
          title: `E2E-TARGET-STUDY-${timestamp}`
        }
      });
      const targetStudyData = (await expectJson(targetStudyResp)).data;

      // Get spec sources for source study
      const sourcesResp = await api.get(`/api/v1/study-specs/sources?scope_node_id=${sourceStudyData.id}`);
      const sourcesData = (await expectJson(sourcesResp)).data;

      // If there are available sources, test copy
      if (sourcesData.cdisc_domains && sourcesData.cdisc_domains.length > 0) {
        // Copy spec from source to target
        const copyResp = await api.post('/api/v1/study-specs/copy', {
          data: {
            source_spec_id: sourcesData.cdisc_domains[0].id,
            target_scope_node_id: targetStudyData.id,
            name: `Copied SDTM Spec ${timestamp}`
          }
        });
        const copyData = (await expectJson(copyResp)).data;
        expect(copyData.dataset_count).toBeGreaterThanOrEqual(0);
      }
    } finally {
      await api.dispose();
    }
  });
});
