import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/service/request', () => ({
  request: vi.fn()
}));

describe('MDR API - Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPipelineTree calls request', async () => {
    const { request } = await import('@/service/request');
    const mockRequest = vi.mocked(request);
    mockRequest.mockResolvedValueOnce([] as any);

    const { getPipelineTree } = await import('@/service/api/mdr');
    await getPipelineTree();

    expect(mockRequest).toHaveBeenCalledWith({
      url: expect.stringContaining('pipeline/tree')
    });
  });

  it('createPipelineNode calls request with POST', async () => {
    const { request } = await import('@/service/request');
    const mockRequest = vi.mocked(request);
    mockRequest.mockResolvedValueOnce({} as any);

    const { createPipelineNode } = await import('@/service/api/mdr');
    await createPipelineNode({
      node_type: 'COMPOUND',
      title: 'Test Compound',
      parent_id: '1'
    });

    expect(mockRequest).toHaveBeenCalledWith({
      data: { node_type: 'COMPOUND', title: 'Test Compound', parent_id: '1' },
      method: 'post',
      url: expect.stringContaining('nodes')
    });
  });

  it('getTrackerTaskList calls request with analysisId', async () => {
    const { request } = await import('@/service/request');
    const mockRequest = vi.mocked(request);
    mockRequest.mockResolvedValueOnce({ items: [], total: 0 } as any);

    const { getTrackerTaskList } = await import('@/service/api/mdr');
    await getTrackerTaskList('123');

    expect(mockRequest).toHaveBeenCalledWith({
      params: { analysisId: '123' },
      url: expect.stringContaining('tracker/tasks')
    });
  });
});
