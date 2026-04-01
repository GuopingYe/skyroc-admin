/**
 * Test Setup
 *
 * Configures:
 *
 * - @testing-library/jest-dom matchers
 * - Global mocks (localStorage, fetch, etc.)
 * - MSW handlers for API mocking
 */
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage with actual storage behavior
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  })
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn()
  })),
  writable: true
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn()
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();
