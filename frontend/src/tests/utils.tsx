/* eslint-disable react-refresh/only-export-components */
/**
 * Test Utilities
 *
 * Provides:
 *
 * - Custom render with providers
 * - Mock data factories
 * - Test helpers
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import React from 'react';

// Create a new query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

/** Custom render with all necessary providers */
interface WrapperProps {
  children: React.ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Render component with providers */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// ============================================================
// Mock Data Factories
// ============================================================

export const mockUser = {
  buttons: ['can_view'],
  displayName: 'Test User',
  email: 'test@example.com',
  isSuperuser: false,
  roles: ['user'],
  userId: '1',
  userName: 'testuser'
};

export const mockScopeNode = {
  children: [],
  id: 1,
  lifecycle_status: 'ONGOING',
  name: 'Test TA',
  node_type: 'TA',
  parent_id: null
};

export const mockPipelineTree = [
  {
    children: [
      {
        children: [],
        id: 2,
        lifecycle_status: 'ONGOING',
        name: 'Compound A',
        node_type: 'COMPOUND'
      }
    ],
    id: 1,
    lifecycle_status: 'ONGOING',
    name: 'Therapeutic Area 1',
    node_type: 'TA'
  }
];

export const mockStudyConfig = {
  adam_ig_version: '1.4',
  meddra_version: '26.0',
  sdtm_ig_version: '3.4',
  study_id: 'STUDY001',
  study_phase: 'Phase III'
};
