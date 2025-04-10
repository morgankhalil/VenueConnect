
import { jest } from '@jest/globals';
import { db } from '../db';

// Mock database operations
jest.mock('../db', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

// Setup before tests
beforeAll(() => {
  // Add any global test setup here
});

// Cleanup after tests
afterAll(() => {
  // Add any global test cleanup here
});
