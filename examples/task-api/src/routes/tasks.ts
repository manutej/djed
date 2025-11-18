/**
 * Task Routes
 *
 * Demonstrates logging in route handlers
 */

import { Router, Request, Response } from 'express';
import { db, CreateTaskDto, UpdateTaskDto } from '../models/task';
import { apiLogger, dbLogger } from '../logger';

export const taskRouter = Router();

/**
 * GET /tasks - List all tasks
 */
taskRouter.get('/', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;

  apiLogger.debug('Fetching all tasks', { requestId });

  const tasks = db.findAll();

  dbLogger.info('Tasks retrieved', {
    requestId,
    count: tasks.length
  });

  res.json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

/**
 * GET /tasks/:id - Get task by ID
 */
taskRouter.get('/:id', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  apiLogger.debug('Fetching task', { requestId, taskId: id });

  const task = db.findById(id);

  if (!task) {
    apiLogger.warn('Task not found', { requestId, taskId: id });

    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  dbLogger.info('Task retrieved', { requestId, taskId: id });

  res.json({
    success: true,
    data: task
  });
});

/**
 * POST /tasks - Create new task
 */
taskRouter.post('/', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const dto: CreateTaskDto = req.body;

  // Validation
  if (!dto.title || dto.title.trim().length === 0) {
    apiLogger.warn('Task creation failed - validation error', {
      requestId,
      reason: 'Missing title'
    });

    return res.status(400).json({
      success: false,
      error: 'Title is required'
    });
  }

  apiLogger.info('Creating task', {
    requestId,
    title: dto.title,
    priority: dto.priority || 'medium'
  });

  try {
    const task = db.create(dto);

    dbLogger.info('Task created', {
      requestId,
      taskId: task.id,
      title: task.title
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    apiLogger.error('Task creation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

/**
 * PATCH /tasks/:id - Update task
 */
taskRouter.patch('/:id', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;
  const dto: UpdateTaskDto = req.body;

  apiLogger.info('Updating task', {
    requestId,
    taskId: id,
    updates: Object.keys(dto)
  });

  const task = db.update(id, dto);

  if (!task) {
    apiLogger.warn('Task update failed - not found', {
      requestId,
      taskId: id
    });

    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  dbLogger.info('Task updated', {
    requestId,
    taskId: id,
    updates: Object.keys(dto)
  });

  res.json({
    success: true,
    data: task
  });
});

/**
 * DELETE /tasks/:id - Delete task
 */
taskRouter.delete('/:id', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { id } = req.params;

  apiLogger.info('Deleting task', { requestId, taskId: id });

  const deleted = db.delete(id);

  if (!deleted) {
    apiLogger.warn('Task deletion failed - not found', {
      requestId,
      taskId: id
    });

    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  dbLogger.info('Task deleted', { requestId, taskId: id });

  res.json({
    success: true,
    message: 'Task deleted'
  });
});

/**
 * POST /tasks/bulk - Bulk create tasks (demo of high-volume logging)
 */
taskRouter.post('/bulk', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const tasks: CreateTaskDto[] = req.body.tasks || [];

  if (!Array.isArray(tasks) || tasks.length === 0) {
    apiLogger.warn('Bulk creation failed - validation error', {
      requestId,
      reason: 'No tasks provided'
    });

    return res.status(400).json({
      success: false,
      error: 'Tasks array is required'
    });
  }

  apiLogger.info('Bulk creating tasks', {
    requestId,
    count: tasks.length
  });

  const created = tasks.map((dto) => db.create(dto));

  dbLogger.info('Bulk tasks created', {
    requestId,
    count: created.length,
    ids: created.map((t) => t.id)
  });

  res.status(201).json({
    success: true,
    count: created.length,
    data: created
  });
});
