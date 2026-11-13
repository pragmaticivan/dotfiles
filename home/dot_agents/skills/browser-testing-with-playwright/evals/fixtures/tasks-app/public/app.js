const list = document.getElementById('tasks');

function renderTask(task) {
  const li = document.createElement('li');
  li.dataset.taskId = task.id;
  if (task.done) li.classList.add('done');
  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;
  const button = document.createElement('button');
  button.textContent = 'Mark complete';
  button.addEventListener('click', () => markComplete(button));
  li.append(title, button);
  return li;
}

async function markComplete(button) {
  const id = button.closest('li').dataset.id;
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ done: true }),
  });
  const task = await res.json();
  list.querySelector(`li[data-task-id="${task.id}"]`).classList.add('done');
}

async function load() {
  const res = await fetch('/api/tasks');
  const tasks = await res.json();
  list.replaceChildren(...tasks.map(renderTask));
}

load();
