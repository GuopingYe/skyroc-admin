import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/service/request', () => ({
  request: vi.fn()
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchLogin calls request with correct payload', async () => {
    const { request } = await import('@/service/request');
    const mockRequest = vi.mocked(request);
    mockRequest.mockResolvedValueOnce({
      code: '0000',
      data: { token: 'abc123', refreshToken: 'xyz789' }
    } as any);

    const { fetchLogin } = await import('@/service/api/auth');
    await fetchLogin({ userName: 'testuser', password: 'password123' });

    expect(mockRequest).toHaveBeenCalledWith({
      url: expect.stringContaining('login'),
      method: 'post',
      data: { userName: 'testuser', password: 'password123' }
    });
  });

  it('fetchRefreshToken calls request with refresh token', async () => {
    const { request } = await import('@/service/request');
    const mockRequest = vi.mocked(request);
    mockRequest.mockResolvedValueOnce({
      code: '0000',
      data: { token: 'new-token', refreshToken: 'new-refresh' }
    } as any);

    const { fetchRefreshToken } = await import('@/service/api/auth');
    await fetchRefreshToken('refresh-token-123');

    expect(mockRequest).toHaveBeenCalled();
  });

  it('fetchGetUserInfo calls request', async () => {
    const { request } = await import('@/service/request');
    const mockRequest = vi.mocked(request);
    mockRequest.mockResolvedValueOnce({
      code: '0000',
      data: { userName: 'testuser', userId: '1' }
    } as any);

    const { fetchGetUserInfo } = await import('@/service/api/auth');
    await fetchGetUserInfo();

    expect(mockRequest).toHaveBeenCalledWith({
      url: expect.stringContaining('getUserInfo')
    });
  });
});
