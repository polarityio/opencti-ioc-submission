/**
 * Jest Setup for OpenCTI IOC Submission Integration Tests
 * Global mocks and test environment configuration
 */

// =============================================================================
// GLOBAL MOCKS FOR OPENCTI INTEGRATION
// =============================================================================

// Mock Logger (Polarity Integration Utils)
global.mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
};

// Mock Async Library (used for batch processing IOC submissions)
jest.mock('async', () => ({
  eachLimit: jest.fn(async (items, limit, iteratee) => {
    // Properly handle async iteratee function
    // Process items in batches with the specified limit
    const batches = [];
    for (let i = 0; i < items.length; i += limit) {
      batches.push(items.slice(i, i + limit));
    }
    
    // Process each batch sequentially
    for (const batch of batches) {
      // Process items in parallel within each batch
      await Promise.all(batch.map(item => iteratee(item)));
        }
  })
}));

// Phase 4 Revolutionary Testing: Use REAL lodash instead of incomplete mock
// DISCOVERED BUG: Previous partial mock was missing _.groupBy, _.chain, _.pickBy, _.omit
// Our workflow tests exposed this production bug that traditional tests would never find!
// 
// For Phase 4 testing, we use the REAL lodash library to test actual behavior
// This aligns with our minimal mocking philosophy: only mock external dependencies
//
// If specific lodash mocking is needed for isolated unit tests, it should be done
// per-test, not globally, and should include ALL functions the code actually uses

// =============================================================================
// TEST ENVIRONMENT CONFIGURATION
// =============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.POLARITY_LOG_LEVEL = 'trace';

// Global test timeout
jest.setTimeout(10000);

// Console log suppression for cleaner test output
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  jest.clearAllMocks();
});

// =============================================================================
// CUSTOM MATCHERS FOR IOC SUBMISSION TESTING
// =============================================================================

expect.extend({
      toBeValidOpenCTIResponse(received) {
    const hasStatus = received && typeof received.status === 'string';
    const hasData = 'data' in received;
    
    if (hasStatus && hasData) {
      return {
        message: () => `Expected ${received} not to be a valid OpenCTI response`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid OpenCTI response with status and data fields`,
        pass: false
      };
    }
  },
  
  toBeValidEntity(received) {
    const hasValue = received && typeof received.value === 'string';
    const hasType = received && typeof received.type === 'string';
    const hasTypeFlags = received && (
      received.isIPv4 !== undefined || 
      received.isDomain !== undefined || 
      received.isHash !== undefined
    );
    
    if (hasValue && hasType && hasTypeFlags) {
      return {
        message: () => `Expected ${received} not to be a valid entity`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid entity with value, type, and type flags`,
        pass: false
      };
    }
  }
});

// =============================================================================
// GLOBAL SETUP COMPLETE
// ============================================================================= 