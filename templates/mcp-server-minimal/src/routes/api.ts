/**
 * API Routes
 *
 * Example API routes demonstrating:
 * - RESTful resource handling
 * - Functional error handling with Either
 * - Input validation using @djed/validation
 * - Structured responses
 *
 * This is a minimal example showing the patterns.
 * Extend with your own business logic.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import { Logger } from '@djed/logger';
import { AppConfig } from '../config';

/**
 * Example resource type
 * Replace with your own domain models
 */
interface Item {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * In-memory storage for demo purposes
 * Replace with actual database operations using @djed/database
 */
let itemStore: Item[] = [
  {
    id: '1',
    name: 'Example Item',
    description: 'This is an example item',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * API Error type
 */
interface ApiError {
  readonly type: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
  readonly message: string;
  readonly details?: unknown;
}

/**
 * Create an API error
 */
const apiError = (
  type: ApiError['type'],
  message: string,
  details?: unknown
): ApiError => ({
  type,
  message,
  details,
});

/**
 * Find item by ID
 * Returns Either<ApiError, Item>
 */
function findItemById(id: string): E.Either<ApiError, Item> {
  return pipe(
    itemStore,
    A.findFirst((item) => item.id === id),
    E.fromOption(() => apiError('NOT_FOUND', `Item with id ${id} not found`))
  );
}

/**
 * Create a new item
 * Returns Either<ApiError, Item>
 */
function createItem(
  name: string,
  description: string
): E.Either<ApiError, Item> {
  // Validate input
  if (!name || name.trim().length === 0) {
    return E.left(apiError('VALIDATION_ERROR', 'Name is required'));
  }

  // Create new item
  const newItem: Item = {
    id: String(Date.now()), // Simple ID generation for demo
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to store
  itemStore.push(newItem);

  return E.right(newItem);
}

/**
 * Update an existing item
 * Returns Either<ApiError, Item>
 */
function updateItem(
  id: string,
  updates: { name?: string; description?: string }
): E.Either<ApiError, Item> {
  return pipe(
    findItemById(id),
    E.map((item) => {
      const updatedItem: Item = {
        ...item,
        name: updates.name?.trim() || item.name,
        description: updates.description?.trim() ?? item.description,
        updatedAt: new Date().toISOString(),
      };

      // Update in store
      itemStore = itemStore.map((i) => (i.id === id ? updatedItem : i));

      return updatedItem;
    })
  );
}

/**
 * Delete an item
 * Returns Either<ApiError, void>
 */
function deleteItem(id: string): E.Either<ApiError, void> {
  return pipe(
    findItemById(id),
    E.map(() => {
      itemStore = itemStore.filter((i) => i.id !== id);
    })
  );
}

/**
 * Create API router
 *
 * Endpoints:
 * - GET /api/items - List all items
 * - GET /api/items/:id - Get item by ID
 * - POST /api/items - Create new item
 * - PUT /api/items/:id - Update item
 * - DELETE /api/items/:id - Delete item
 */
export function apiRouter(config: AppConfig, logger: Logger): Router {
  const router = Router();

  /**
   * GET /api/items
   * List all items
   */
  router.get('/items', (req: Request, res: Response) => {
    logger.debug('Listing all items', { count: itemStore.length });

    res.json({
      success: true,
      data: itemStore,
      count: itemStore.length,
    });
  });

  /**
   * GET /api/items/:id
   * Get item by ID
   */
  router.get('/items/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    logger.debug('Getting item by ID', { id });

    pipe(
      findItemById(id),
      E.fold(
        // Error case
        (error) => {
          logger.warn('Item not found', { id, error });
          res.status(404).json({
            success: false,
            error: error.message,
          });
        },
        // Success case
        (item) => {
          res.json({
            success: true,
            data: item,
          });
        }
      )
    );
  });

  /**
   * POST /api/items
   * Create new item
   */
  router.post('/items', (req: Request, res: Response) => {
    const { name, description } = req.body;

    logger.debug('Creating new item', { name });

    pipe(
      createItem(name, description),
      E.fold(
        // Error case
        (error) => {
          logger.warn('Failed to create item', { error });
          const statusCode = error.type === 'VALIDATION_ERROR' ? 400 : 500;
          res.status(statusCode).json({
            success: false,
            error: error.message,
          });
        },
        // Success case
        (item) => {
          logger.info('Item created', { id: item.id, name: item.name });
          res.status(201).json({
            success: true,
            data: item,
          });
        }
      )
    );
  });

  /**
   * PUT /api/items/:id
   * Update item
   */
  router.put('/items/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    logger.debug('Updating item', { id, name });

    pipe(
      updateItem(id, { name, description }),
      E.fold(
        // Error case
        (error) => {
          logger.warn('Failed to update item', { id, error });
          const statusCode = error.type === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({
            success: false,
            error: error.message,
          });
        },
        // Success case
        (item) => {
          logger.info('Item updated', { id: item.id });
          res.json({
            success: true,
            data: item,
          });
        }
      )
    );
  });

  /**
   * DELETE /api/items/:id
   * Delete item
   */
  router.delete('/items/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    logger.debug('Deleting item', { id });

    pipe(
      deleteItem(id),
      E.fold(
        // Error case
        (error) => {
          logger.warn('Failed to delete item', { id, error });
          res.status(404).json({
            success: false,
            error: error.message,
          });
        },
        // Success case
        () => {
          logger.info('Item deleted', { id });
          res.status(204).send();
        }
      )
    );
  });

  /**
   * GET /api/version
   * Get API version info
   */
  router.get('/version', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        name: 'mcp-server-minimal',
        version: '1.0.0',
        environment: config.server.node_env,
        node: process.version,
      },
    });
  });

  return router;
}
