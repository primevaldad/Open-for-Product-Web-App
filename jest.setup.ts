
// In jest.setup.js
import '@testing-library/jest-dom';

// Mock ResizeObserver for Jest tests
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    // do nothing
  }
  unobserve(target) {
    // do nothing
  }
  disconnect() {
    // do nothing
  }
};
