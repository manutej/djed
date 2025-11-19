/**
 * Integration Tests
 *
 * Tests the complete server setup including:
 * - Health check endpoints
 * - API endpoints
 * - Error handling
 * - Middleware
 *
 * Uses supertest for HTTP testing and vitest for assertions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { Logger } from '@djed/logger';
import { loadConfigOrThrow } from '../src/config';
import { createServer, Server } from '../src/server';

describe('MCP Server Integration Tests', () => {
  let server: Server;
  let app: Express;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

    // Load config and create server
    const config = loadConfigOrThrow();
    const logger = new Logger('test-server', { silent: true });
    server = createServer(config, logger);
    app = server.app;

    // Start server
    await server.start()();
  });

  afterAll(async () => {
    // Stop server
    await server.stop()();
  });

  describe('Health Check Endpoints', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return detailed health status', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('checks');
      expect(Array.isArray(response.body.checks)).toBe(true);
    });

    it('should return 200 for liveness probe', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
    });

    it('should return 200 for readiness probe', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toMatch(/ready|not_ready/);
    });
  });

  describe('API Endpoints', () => {
    describe('GET /api/version', () => {
      it('should return version information', async () => {
        const response = await request(app).get('/api/version');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('version');
        expect(response.body.data).toHaveProperty('environment');
      });
    });

    describe('GET /api/items', () => {
      it('should list all items', async () => {
        const response = await request(app).get('/api/items');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/items', () => {
      it('should create a new item', async () => {
        const newItem = {
          name: 'Test Item',
          description: 'This is a test item',
        };

        const response = await request(app)
          .post('/api/items')
          .send(newItem)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe(newItem.name);
        expect(response.body.data.description).toBe(newItem.description);
      });

      it('should reject item without name', async () => {
        const invalidItem = {
          description: 'Item without name',
        };

        const response = await request(app)
          .post('/api/items')
          .send(invalidItem)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/items/:id', () => {
      it('should get item by id', async () => {
        // First create an item
        const createResponse = await request(app)
          .post('/api/items')
          .send({ name: 'Get Test', description: 'Test' })
          .set('Content-Type', 'application/json');

        const itemId = createResponse.body.data.id;

        // Then get it
        const response = await request(app).get(`/api/items/${itemId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(itemId);
      });

      it('should return 404 for non-existent item', async () => {
        const response = await request(app).get('/api/items/999999');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/items/:id', () => {
      it('should update an item', async () => {
        // First create an item
        const createResponse = await request(app)
          .post('/api/items')
          .send({ name: 'Update Test', description: 'Original' })
          .set('Content-Type', 'application/json');

        const itemId = createResponse.body.data.id;

        // Then update it
        const updates = {
          name: 'Updated Name',
          description: 'Updated Description',
        };

        const response = await request(app)
          .put(`/api/items/${itemId}`)
          .send(updates)
          .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updates.name);
        expect(response.body.data.description).toBe(updates.description);
      });
    });

    describe('DELETE /api/items/:id', () => {
      it('should delete an item', async () => {
        // First create an item
        const createResponse = await request(app)
          .post('/api/items')
          .send({ name: 'Delete Test', description: 'To be deleted' })
          .set('Content-Type', 'application/json');

        const itemId = createResponse.body.data.id;

        // Then delete it
        const response = await request(app).delete(`/api/items/${itemId}`);

        expect(response.status).toBe(204);

        // Verify it's gone
        const getResponse = await request(app).get(`/api/items/${itemId}`);
        expect(getResponse.status).toBe(404);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('path');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS preflight', async () => {
      const response = await request(app).options('/api/items');

      expect(response.status).toBe(204);
    });
  });
});
