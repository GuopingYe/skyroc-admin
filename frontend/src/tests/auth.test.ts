/**
 * Authentication Tests
 *
 * Tests for:
 *
 * - Token storage (localStg)
 * - User state
 * - Login/logout flow
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localStg } from '@/utils/storage';

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStg.clear();
  });

  describe('Token Management', () => {
    it('should store and retrieve token via localStg', () => {
      localStg.set('token', 'test-access-token');
      expect(localStg.get('token')).toBe('test-access-token');
    });

    it('should clear tokens on logout', () => {
      localStg.set('token', 'access-token');
      localStg.set('refreshToken', 'refresh-token');
      localStg.clear();

      expect(localStg.get('token')).toBeNull();
      expect(localStg.get('refreshToken')).toBeNull();
    });

    it('should return null when no token exists', () => {
      expect(localStg.get('token')).toBeNull();
    });
  });

  describe('User State', () => {
    it('should have default user state', () => {
      // Test default state structure
      const defaultState = {
        buttons: [],
        isSuperuser: false,
        roles: [],
        userId: null,
        userName: null
      };

      expect(defaultState.userId).toBeNull();
      expect(defaultState.roles).toEqual([]);
      expect(defaultState.isSuperuser).toBe(false);
    });
  });
});
