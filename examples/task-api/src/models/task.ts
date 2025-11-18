/**
 * Task Model and In-Memory Database
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * In-memory database (for demo purposes)
 */
class TaskDatabase {
  private tasks: Map<string, Task> = new Map();
  private idCounter = 1;

  create(dto: CreateTaskDto): Task {
    const id = String(this.idCounter++);
    const task: Task = {
      id,
      title: dto.title,
      description: dto.description || '',
      completed: false,
      priority: dto.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(id, task);
    return task;
  }

  findAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  update(id: string, dto: UpdateTaskDto): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...dto,
      updatedAt: new Date()
    };

    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  count(): number {
    return this.tasks.size;
  }

  clear(): void {
    this.tasks.clear();
    this.idCounter = 1;
  }
}

export const db = new TaskDatabase();
