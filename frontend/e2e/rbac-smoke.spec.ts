import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';

const backendBaseUrl = 'http://127.0.0.1:8080';
const adminCredentials = { password: 'admin123', userName: 'admin' };

async function createAdminApiContext(): Promise<APIRequestContext> {
  const unauthenticated = await request.newContext({ baseURL: backendBaseUrl });
  const loginResponse = await unauthenticated.post('/api/v1/auth/login', {
    data: adminCredentials
  });
  expect(loginResponse.ok()).toBeTruthy();

  const loginPayload = await loginResponse.json();
  const token = loginPayload.data.token as string;
  await unauthenticated.dispose();

  return request.newContext({
    baseURL: backendBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

async function expectJson(response: Awaited<ReturnType<APIRequestContext['get']>> | Awaited<ReturnType<APIRequestContext['post']>> | Awaited<ReturnType<APIRequestContext['put']>> | Awaited<ReturnType<APIRequestContext['patch']>>) {
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload && 'msg' in payload) {
    expect(payload.code).toBe('0000');
  }
  return payload;
}

async function ensureAutoLogin(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'admin' })).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
}

test.describe.configure({ mode: 'serial' });

test.describe('RBAC smoke', () => {
  test('role permission page can save changes and restore them', async ({ page }) => {
    const api = await createAdminApiContext();
    let viewerRoleId: number | null = null;
    let originalPermissionIds: number[] = [];
    try {
      const rolesResponse = await api.get('/api/v1/rbac/roles');
      const roles = (await expectJson(rolesResponse)) as Api.RBAC.Role[];
      const viewerRole = roles.find(role => role.code === 'VIEWER');
      expect(viewerRole).toBeTruthy();
      viewerRoleId = viewerRole!.id;

      const permissionsResponse = await api.get('/api/v1/rbac/permissions');
      const permissions = (await expectJson(permissionsResponse)) as Api.RBAC.Permission[];
      const trackerPermission = permissions.find(permission => permission.code === 'page:tracker:view');
      expect(trackerPermission).toBeTruthy();

      originalPermissionIds = viewerRole!.permissions.map(permission => permission.id);
      const toggledPermissionIds = originalPermissionIds.includes(trackerPermission!.id)
        ? originalPermissionIds.filter(id => id !== trackerPermission!.id)
        : [...originalPermissionIds, trackerPermission!.id];

      await ensureAutoLogin(page);
      await page.goto('/system/role-permission');
      await page.getByTestId('role-item-VIEWER').click();

      const trackerCheckbox = page.getByRole('checkbox', { name: /View Tracker/ });
      const initiallyChecked = await trackerCheckbox.isChecked();
      await trackerCheckbox.click();

      const saveResponsePromise = page.waitForResponse(response =>
        response.url().includes(`/api/v1/rbac/roles/${viewerRole!.id}/permissions`) && response.request().method() === 'PUT'
      );
      await page.getByTestId('role-permission-save').click();
      await saveResponsePromise;

      const updatedRolesResponse = await api.get('/api/v1/rbac/roles');
      const updatedRoles = (await expectJson(updatedRolesResponse)) as Api.RBAC.Role[];
      const updatedViewerRole = updatedRoles.find(role => role.code === 'VIEWER');
      expect(updatedViewerRole?.permissions.some(permission => permission.id === trackerPermission!.id)).toBe(!initiallyChecked);
    } finally {
      if (viewerRoleId != null && originalPermissionIds.length > 0) {
        await expectJson(
          await api.put(`/api/v1/rbac/roles/${viewerRoleId}/permissions`, {
            data: { permission_ids: originalPermissionIds }
          })
        );
      }
      await api.dispose();
    }
  });

  test('user management can create, edit, and deactivate a user', async ({ page }) => {
    const timestamp = Date.now();
    const username = `pw-user-${timestamp}`;
    const createdDisplayName = `PW User ${timestamp}`;
    const updatedDisplayName = `PW User ${timestamp} Updated`;
    const updatedDepartment = `QA-${timestamp}`;
    const updatedEmail = `pw-user-${timestamp}@example.com`;

    await ensureAutoLogin(page);
    await page.goto('/system/user-management');

    await page.getByRole('button', { name: /新增用户|Create User/ }).click();

    const createDialog = page.getByRole('dialog', { name: 'Create User' });
    await createDialog.getByLabel('Username').fill(username);
    await createDialog.getByLabel('Email').fill(`pw-create-${timestamp}@example.com`);
    await createDialog.getByLabel('Display Name').fill(createdDisplayName);
    await createDialog.getByLabel('Department').fill(`DEV-${timestamp}`);
    await createDialog.getByLabel('Password').fill('password123');

    const createResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/rbac/users') && response.request().method() === 'POST'
    );
    await createDialog.getByRole('button', { name: /确\s*定|OK/ }).click();
    await createResponsePromise;

    const searchInput = page.getByRole('searchbox');
    await searchInput.fill(createdDisplayName);
    await searchInput.press('Enter');

    const userRow = page.locator('tbody tr').filter({ hasText: createdDisplayName }).first();
    await expect(userRow).toBeVisible({ timeout: 15_000 });

    await userRow.getByRole('button', { name: /编辑|Edit/ }).click();
    const editDialog = page.getByRole('dialog', { name: /编辑用户|Edit User/ });
    const editInputs = editDialog.locator('input');
    await editInputs.nth(0).fill(updatedDisplayName);
    await editInputs.nth(1).fill(updatedEmail);
    await editInputs.nth(2).fill(updatedDepartment);

    const editResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/rbac/users/') && response.request().method() === 'PUT'
    );
    await editDialog.getByRole('button', { name: /保\s*存|Save/ }).click();
    await editResponsePromise;

    await expect(userRow).toContainText(updatedDisplayName, { timeout: 15_000 });
    await expect(userRow).toContainText(updatedDepartment);

    const statusResponsePromise = page.waitForResponse(response =>
      response.url().includes('/status') && response.request().method() === 'PATCH'
    );
    await userRow.getByRole('button', { name: /删除|Delete/ }).click();
    await page.getByRole('button', { name: /确\s*定|OK/ }).click();
    await statusResponsePromise;

    await expect(userRow).toContainText(/Inactive|未激活/, { timeout: 15_000 });
  });

  test('pipeline management assign-team drawer can assign a user to a study', async ({ page }) => {
    const api = await createAdminApiContext();
    try {
      const timestamp = Date.now();
      const targetUsername = `pw-assign-${timestamp}`;
      const targetDisplayName = `PW Assign ${timestamp}`;
      const taName = `PW TA ${timestamp}`;
      const compoundName = `PW Compound ${timestamp}`;
      const studyName = `PW-STUDY-${timestamp}`;

      const createUserResponse = await api.post('/api/v1/rbac/users', {
        data: {
          username: targetUsername,
          email: `${targetUsername}@example.com`,
          display_name: targetDisplayName,
          department: 'Automation',
          password: 'password123'
        }
      });
      const createdUser = (await expectJson(createUserResponse)) as Api.RBAC.UserDetail;

      const rolesResponse = await api.get('/api/v1/rbac/roles');
      const roles = (await expectJson(rolesResponse)) as Api.RBAC.Role[];
      const viewerRole = roles.find(role => role.code === 'VIEWER');
      expect(viewerRole).toBeTruthy();

      const taResponse = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'TA', title: taName }
      });
      const taNode = (await expectJson(taResponse)).data;

      const compoundResponse = await api.post('/api/v1/pipeline/nodes', {
        data: { node_type: 'COMPOUND', parent_id: taNode.id, title: compoundName }
      });
      const compoundNode = (await expectJson(compoundResponse)).data;

      const studyResponse = await api.post('/api/v1/pipeline/nodes', {
        data: {
          node_type: 'STUDY',
          parent_id: compoundNode.id,
          phase: 'Phase I',
          protocol_title: studyName,
          title: studyName
        }
      });
      const studyNode = (await expectJson(studyResponse)).data;

      await ensureAutoLogin(page);
      await page.goto('/mdr/pipeline-management');

      const treeSearch = page.getByTestId('pipeline-tree-search');
      await treeSearch.fill(taName);
      await page.getByText(taName, { exact: true }).click();

      const compoundRow = page.locator('tbody tr').filter({ hasText: compoundName }).first();
      await expect(compoundRow).toBeVisible({ timeout: 15_000 });
      await compoundRow.getByRole('button', { name: /View|查看/ }).click();

      const studyRow = page.locator('tbody tr').filter({ hasText: studyName }).first();
      await expect(studyRow).toBeVisible({ timeout: 15_000 });
      await studyRow.getByTestId(`assign-team-button-${studyNode.id}`).click();

      await page.getByTestId('assign-team-user-select').click();
      await page.getByText(`${targetDisplayName} (${targetUsername})`, { exact: true }).last().click();

      await page.getByTestId('assign-team-role-select').click();
      await page.getByText(viewerRole!.name, { exact: true }).last().click();

      const assignResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/v1/rbac/assign-team') && response.request().method() === 'POST'
      );
      await page.getByTestId('assign-team-submit').click();
      await assignResponsePromise;

      const assignedTeamRow = page.getByRole('listitem').filter({ hasText: targetDisplayName }).first();
      await expect(assignedTeamRow).toBeVisible({ timeout: 15_000 });
      await expect(assignedTeamRow).toContainText(viewerRole!.name);
    } finally {
      await api.dispose();
    }
  });
});
