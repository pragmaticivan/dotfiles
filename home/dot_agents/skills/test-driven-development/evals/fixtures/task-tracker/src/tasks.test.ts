import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearTasks, createTask, getTask, startTask, completeTask } from './tasks.ts';

beforeEach(() => clearTasks());

test('createTask starts pending with no completion time', () => {
  const task = createTask('Buy groceries');
  assert.equal(task.title, 'Buy groceries');
  assert.equal(task.status, 'pending');
  assert.equal(task.completedAt, null);
});

test('startTask moves a task to in_progress', () => {
  const task = createTask('Write report');
  assert.equal(startTask(task.id).status, 'in_progress');
});

test('completeTask marks the task done', () => {
  const task = createTask('Ship release');
  completeTask(task.id);
  assert.equal(getTask(task.id)?.status, 'done');
});
