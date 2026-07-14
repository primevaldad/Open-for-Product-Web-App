// jest.setup.ts
// Run automatically before your Jest tests (set in jest.config.js under `setupFilesAfterEnv`)

// --- 1. Mock Next.js-specific globals if needed ---
import '@testing-library/jest-dom';

// --- 2. Mock ResizeObserver ---
class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(_target: Element): void {
    // You can trigger the callback manually in tests if needed
    // this.callback([], this as unknown as ResizeObserver);
  }

  unobserve(_target: Element): void {}

  disconnect(): void {}
}

// Assign mock to global
(globalThis as any).ResizeObserver = MockResizeObserver;

// --- 3. (Optional) Mock IntersectionObserver if your app uses it ---
class MockIntersectionObserver {
  constructor(
    private callback: IntersectionObserverCallback,
    private _options?: IntersectionObserverInit
  ) {}

  observe(_target: Element): void {
    // optional: trigger callback in tests
  }

  unobserve(_target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

(globalThis as any).IntersectionObserver = MockIntersectionObserver;

// --- 4. (Optional) Mock matchMedia ---
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
