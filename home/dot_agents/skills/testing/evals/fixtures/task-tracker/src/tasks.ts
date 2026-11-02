export type TaskStatus = 'pending' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
}

const tasks = new Map<number, Task>();
let nextId = 1;

export function createTask(title: string): Task {
  const task: Task = {
    id: nextId++,
    title,
    status: 'pending',
    createdAt: new Date(),
    completedAt: null,
  };
  tasks.set(task.id, task);
  return task;
}

export function getTask(id: number): Task | undefined {
  return tasks.get(id);
}

export function startTask(id: number): Task {
  return updateStatus(id, 'in_progress');
}

export function completeTask(id: number): Task {
  return updateStatus(id, 'done');
}

export function reopenTask(id: number): Task {
  const task = updateStatus(id, 'pending');
  task.completedAt = null;
  return task;
}

function updateStatus(id: number, status: TaskStatus): Task {
  const task = tasks.get(id);
  if (!task) throw new Error(`task ${id} not found`);
  const updated: Task = { ...task, status };
  tasks.set(id, updated);
  return updated;
}

export function clearTasks(): void {
  tasks.clear();
  nextId = 1;
}
