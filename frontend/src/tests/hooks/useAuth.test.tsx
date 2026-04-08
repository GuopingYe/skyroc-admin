import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { localStg } from '@/utils/storage';

vi.mock('@/service/api', () => ({
  fetchGetUserInfo: vi.fn(),
  fetchLogin: vi.fn(),
  fetchRefreshToken: vi.fn()
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useLogin Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mutation object', async () => {
    const { useLogin } = await import('@/service/hooks/useAuth');
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLogin(), { wrapper });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBeDefined();
  });
});

describe('useUserInfo Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStg.clear();
  });

  it('should not fetch when no token', async () => {
    const { fetchGetUserInfo } = await import('@/service/api');
    const { useUserInfo } = await import('@/service/hooks/useAuth');
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserInfo(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(vi.mocked(fetchGetUserInfo)).not.toHaveBeenCalled();
  });

  it('should fetch when token exists', async () => {
    const { fetchGetUserInfo } = await import('@/service/api');
    vi.mocked(fetchGetUserInfo).mockResolvedValue({
      code: '0000',
      data: { userName: 'testuser', userId: '1', buttons: [], roles: [] }
    } as any);

    localStg.set('token', 'test-token');

    const { useUserInfo } = await import('@/service/hooks/useAuth');
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserInfo(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.userName).toBe('testuser');
  });
});
