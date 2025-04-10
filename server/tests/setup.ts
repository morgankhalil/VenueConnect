
import { jest } from '@jest/globals';

// Mock environment variables
process.env.BANDSINTOWN_API_KEY = 'test-key';
process.env.VENUE_WEBHOOK_SECRET = 'test-secret';

// Mock database
jest.mock('../db', () => ({
  db: {
    insert: jest.fn().mockResolvedValue([{}]),
    select: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([{}]),
    delete: jest.fn().mockResolvedValue([{}])
  }
}));

// Setup before tests
beforeAll(() => {
  // Add any global test setup here
});

// Cleanup after tests
afterAll(() => {
  jest.clearAllMocks();
});
