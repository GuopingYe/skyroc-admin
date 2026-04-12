import { describe, it, expect } from 'vitest';

import { authSlice, resetAuth, setToken } from '@/features/auth/authStore';

const reducer = authSlice.reducer;

describe('Auth Redux Slice', () => {
  it('should return initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.token).toBeNull();
  });

  it('should handle setToken', () => {
    const state = reducer(undefined, setToken('abc123'));
    expect(state.token).toBe('abc123');
  });

  it('should handle resetAuth', () => {
    const stateWithToken = reducer(undefined, setToken('abc123'));
    const resetState = reducer(stateWithToken, resetAuth());
    expect(resetState.token).toBeNull();
  });
});
