let draggedTask = null;
let currentEditTask = null;

// Initialize the application
function initApp() {
  loadTasks();
  updateAllStats();
  setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
  // Enter key to add task
  document.getElementById('taskInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      addTask();
    }
  });
}

// Save tasks to localStorage
function saveTasks() {
  const tasks = {
    q1: getTasksFromQuadrant('q1'),
    q2: getTasksFromQuadrant('q2'),
    q3: getTasksFromQuadrant('q3'),
    q4: getTasksFromQuadrant('q4'),
    completed: getCompletedTasks()
  };
  localStorage.setItem("eisenhowerTasks", JSON.stringify(tasks));
  updateAllStats();
}

// Get tasks from a specific quadrant
function getTasksFromQuadrant(quadrantId) {
  const tasks = [];
  const list = document.querySelector(`#${quadrantId} .taskList`);
  const items = list.querySelectorAll('li:not(.empty-state)');

  items.forEach(item => {
    const id = item.getAttribute('data-id');
    const text = item.querySelector('.task-text').textContent;
    const deadline = item.querySelector('.deadline span').textContent;
    const completed = item.classList.contains('completed');
    tasks.push({ id, text, deadline, completed });
  });

  return tasks;
}

// Get completed tasks
function getCompletedTasks() {
  const tasks = [];
  const items = document.querySelectorAll('#completedList li');

  items.forEach(item => {
    const id = item.getAttribute('data-id');
    const text = item.querySelector('.task-text').textContent;
    const deadline = item.querySelector('.deadline span').textContent;
    const originalQuadrant = item.getAttribute('data-original-quadrant');
    tasks.push({ id, text, deadline, completed: true, originalQuadrant });
  });

  return tasks;
}

// Load tasks from localStorage
function loadTasks() {
  const saved = localStorage.getItem("eisenhowerTasks");
  const tasks = saved ? JSON.parse(saved) : {
    q1: [], q2: [], q3: [], q4: [], completed: []
  };

  // Clear all quadrants and completed list
  ['q1', 'q2', 'q3', 'q4'].forEach(quadrant => {
    const list = document.querySelector(`#${quadrant} .taskList`);
    const emptyState = list.querySelector('.empty-state');
    list.innerHTML = '';
    if (emptyState) {
      list.appendChild(emptyState);
    }
  });

  document.getElementById('completedList').innerHTML = '';

  // Load active tasks into their respective quadrants
  for (const [quadrant, quadrantTasks] of Object.entries(tasks)) {
    if (quadrant !== 'completed') {
      quadrantTasks.forEach(task => {
        if (!task.completed) {
          addTaskToDOM(task.text, task.deadline, quadrant, task.id, task.completed);
        }
      });
    }
  }

  // Load completed tasks
  if (tasks.completed) {
    tasks.completed.forEach(task => {
      addCompletedTaskToDOM(task.text, task.deadline, task.id, task.originalQuadrant);
    });
  }
}

// Add new task
function addTask() {
  const taskInput = document.getElementById("taskInput");
  const deadlineInput = document.getElementById("deadlineInput");
  const quadrantSelect = document.getElementById("quadrantSelect");

  const text = taskInput.value.trim();
  const deadline = deadlineInput.value;
  const quadrant = quadrantSelect.value;

  if (!text) {
    showError("Please enter a task description");
    taskInput.classList.add('shake');
    setTimeout(() => taskInput.classList.remove('shake'), 500);
    return;
  }

  if (!deadline) {
    showError("Please select a deadline");
    deadlineInput.classList.add('shake');
    setTimeout(() => deadlineInput.classList.remove('shake'), 500);
    return;
  }

  const taskId = 'task-' + Date.now();
  addTaskToDOM(text, deadline, quadrant, taskId, false);
  saveTasks();

  // Clear inputs
  taskInput.value = "";
  deadlineInput.value = "";
  taskInput.focus();
}

// Handle Enter key press
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    addTask();
  }
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transition = 'opacity 0.5s ease';
    setTimeout(() => errorDiv.remove(), 500);
  }, 3000);
}

// Render task in DOM
function addTaskToDOM(text, deadline, quadrant, taskId, completed = false) {
  const list = document.querySelector(`#${quadrant} .taskList`);
  const emptyState = list.querySelector('.empty-state');

  if (emptyState) {
    emptyState.remove();
  }

  const li = document.createElement("li");
  li.className = "fade-in";
  if (completed) {
    li.classList.add('completed');
  }
  li.setAttribute('data-id', taskId);
  li.draggable = true;
  li.ondragstart = drag;
  li.ondragend = dragEnd;

  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  const taskText = document.createElement("div");
  taskText.className = "task-text";
  taskText.textContent = text;

  const taskMeta = document.createElement("div");
  taskMeta.className = "task-meta";

  const deadlineDiv = document.createElement("div");
  deadlineDiv.className = "deadline";
  deadlineDiv.innerHTML = `<i class="fas fa-calendar"></i> <span>${deadline}</span>`;

  const countdown = document.createElement("div");
  countdown.className = "countdown";
  updateCountdown(countdown, deadline);

  taskMeta.appendChild(deadlineDiv);
  taskMeta.appendChild(countdown);

  taskContent.appendChild(taskText);
  taskContent.appendChild(taskMeta);

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  const completeBtn = document.createElement("button");
  completeBtn.className = "action-btn complete-btn";
  completeBtn.innerHTML = completed ? '<i class="fas fa-undo"></i>' : '<i class="fas fa-check"></i>';
  completeBtn.title = completed ? "Mark as incomplete" : "Mark as complete";
  completeBtn.onclick = (e) => {
    e.stopPropagation();
    toggleTaskComplete(li, quadrant);
  };

  const editBtn = document.createElement("button");
  editBtn.className = "action-btn edit-btn";
  editBtn.innerHTML = '<i class="fas fa-edit"></i>';
  editBtn.title = "Edit task";
  editBtn.onclick = (e) => {
    e.stopPropagation();
    editTask(li, quadrant);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "action-btn delete-btn";
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.title = "Delete task";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteTask(li, quadrant);
  };

  taskActions.appendChild(completeBtn);
  taskActions.appendChild(editBtn);
  taskActions.appendChild(deleteBtn);

  li.appendChild(taskContent);
  li.appendChild(taskActions);

  list.appendChild(li);
}

// Add completed task to DOM
function addCompletedTaskToDOM(text, deadline, taskId, originalQuadrant) {
  const list = document.getElementById('completedList');

  const li = document.createElement("li");
  li.className = "fade-in completed";
  li.setAttribute('data-id', taskId);
  li.setAttribute('data-original-quadrant', originalQuadrant);

  const taskContent = document.createElement("div");
  taskContent.className = "task-content";

  const taskText = document.createElement("div");
  taskText.className = "task-text";
  taskText.textContent = text;

  const taskMeta = document.createElement("div");
  taskMeta.className = "task-meta";

  const deadlineDiv = document.createElement("div");
  deadlineDiv.className = "deadline";
  deadlineDiv.innerHTML = `<i class="fas fa-calendar"></i> <span>${deadline}</span>`;

  const quadrantInfo = document.createElement("div");
  quadrantInfo.className = "quadrant-info";
  quadrantInfo.innerHTML = `<i class="fas fa-layer-group"></i> ${getQuadrantName(originalQuadrant)}`;

  taskMeta.appendChild(deadlineDiv);
  taskMeta.appendChild(quadrantInfo);

  taskContent.appendChild(taskText);
  taskContent.appendChild(taskMeta);

  const taskActions = document.createElement("div");
  taskActions.className = "task-actions";

  const undoBtn = document.createElement("button");
  undoBtn.className = "action-btn complete-btn";
  undoBtn.innerHTML = '<i class="fas fa-undo"></i>';
  undoBtn.title = "Mark as incomplete";
  undoBtn.onclick = (e) => {
    e.stopPropagation();
    restoreTask(li, originalQuadrant);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "action-btn delete-btn";
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.title = "Delete task permanently";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteTask(li, 'completed');
  };

  taskActions.appendChild(undoBtn);
  taskActions.appendChild(deleteBtn);

  li.appendChild(taskContent);
  li.appendChild(taskActions);

  list.appendChild(li);
}

// Get quadrant name from ID
function getQuadrantName(quadrantId) {
  const names = {
    q1: 'Urgent & Important',
    q2: 'Urgent & Not Important',
    q3: 'Not Urgent & Important',
    q4: 'Not Urgent & Not Important'
  };
  return names[quadrantId] || quadrantId;
}

// Toggle task completion
function toggleTaskComplete(taskElement, quadrant) {
  if (taskElement.classList.contains('completed')) {
    // Mark as incomplete
    taskElement.classList.remove('completed');
    const completeBtn = taskElement.querySelector('.complete-btn');
    completeBtn.innerHTML = '<i class="fas fa-check"></i>';
    completeBtn.title = "Mark as complete";
    saveTasks();
  } else {
    // Mark as complete - move to completed list
    const taskId = taskElement.getAttribute('data-id');
    const text = taskElement.querySelector('.task-text').textContent;
    const deadline = taskElement.querySelector('.deadline span').textContent;

    taskElement.remove();
    addCompletedTaskToDOM(text, deadline, taskId, quadrant);

    // Check if quadrant is now empty
    const list = document.querySelector(`#${quadrant} .taskList`);
    if (list.children.length === 0) {
      const emptyState = document.createElement('li');
      emptyState.className = 'empty-state';
      emptyState.textContent = getEmptyStateMessage(quadrant);
      list.appendChild(emptyState);
    }

    saveTasks();
  }
}

// Restore task from completed to original quadrant
function restoreTask(taskElement, originalQuadrant) {
  const taskId = taskElement.getAttribute('data-id');
  const text = taskElement.querySelector('.task-text').textContent;
  const deadline = taskElement.querySelector('.deadline span').textContent;

  taskElement.remove();
  addTaskToDOM(text, deadline, originalQuadrant, taskId, false);
  saveTasks();
}

// Edit task
function editTask(taskElement, quadrant) {
  // Close any existing edit form
  const existingForm = document.querySelector('.edit-form.active');
  if (existingForm) {
    existingForm.remove();
  }

  const taskId = taskElement.getAttribute('data-id');
  const currentText = taskElement.querySelector('.task-text').textContent;
  const currentDeadline = taskElement.querySelector('.deadline span').textContent;

  const editForm = document.createElement('div');
  editForm.className = 'edit-form active';
  editForm.innerHTML = `
        <div class="form-group">
          <label for="editTaskText">Task Description</label>
          <textarea id="editTaskText" rows="3">${currentText}</textarea>
        </div>
        <div class="form-group">
          <label for="editTaskDeadline">Deadline</label>
          <input type="date" id="editTaskDeadline" value="${currentDeadline}">
        </div>
        <div class="form-actions">
          <button class="secondary" onclick="cancelEdit()">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="success" onclick="saveEdit()">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      `;

  taskElement.parentNode.insertBefore(editForm, taskElement);
  currentEditTask = { element: taskElement, quadrant, taskId };

  // Focus on text area
  setTimeout(() => {
    document.getElementById('editTaskText').focus();
  }, 100);
}

// Save edited task
function saveEdit() {
  if (!currentEditTask) return;

  const newText = document.getElementById('editTaskText').value.trim();
  const newDeadline = document.getElementById('editTaskDeadline').value;

  if (!newText) {
    showError("Task description cannot be empty");
    return;
  }

  if (!newDeadline) {
    showError("Please select a deadline");
    return;
  }

  // Update the task element
  const taskElement = currentEditTask.element;
  taskElement.querySelector('.task-text').textContent = newText;
  taskElement.querySelector('.deadline span').textContent = newDeadline;

  const countdown = taskElement.querySelector('.countdown');
  updateCountdown(countdown, newDeadline);

  // Update completion status based on deadline
  const today = new Date().toISOString().split('T')[0];
  taskElement.classList.remove('overdue', 'due-today');
  if (newDeadline < today) {
    taskElement.classList.add('overdue');
  } else if (newDeadline === today) {
    taskElement.classList.add('due-today');
  }

  // Remove edit form
  document.querySelector('.edit-form').remove();
  currentEditTask = null;

  saveTasks();
}

// Cancel edit
function cancelEdit() {
  const editForm = document.querySelector('.edit-form');
  if (editForm) {
    editForm.remove();
  }
  currentEditTask = null;
}

// Delete task
function deleteTask(taskElement, quadrant) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  taskElement.style.opacity = '0';
  taskElement.style.transform = 'translateX(100%)';
  taskElement.style.transition = 'all 0.3s ease';

  setTimeout(() => {
    taskElement.remove();
    if (quadrant !== 'completed') {
      const list = document.querySelector(`#${quadrant} .taskList`);
      if (list.children.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = getEmptyStateMessage(quadrant);
        list.appendChild(emptyState);
      }
    }
    saveTasks();
  }, 300);
}

// Get appropriate empty state message
function getEmptyStateMessage(quadrant) {
  const messages = {
    q1: 'Drag important and urgent tasks here',
    q2: 'Drag urgent but not important tasks here',
    q3: 'Drag important but not urgent tasks here',
    q4: 'Drag tasks that can wait here'
  };
  return messages[quadrant];
}

// Update countdown display
function updateCountdown(element, deadline) {
  const today = new Date();
  const target = new Date(deadline);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  element.innerHTML = '';

  let icon = 'fas fa-clock';
  let text = '';
  let className = 'normal';

  if (diffDays < 0) {
    icon = 'fas fa-exclamation-triangle';
    text = 'Overdue!';
    className = 'overdue';
  } else if (diffDays === 0) {
    icon = 'fas fa-bell';
    text = 'Due Today!';
    className = 'due-today';
  } else {
    icon = 'fas fa-calendar-check';
    text = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
  }

  element.className = `countdown ${className}`;
  element.innerHTML = `<i class="${icon}"></i> ${text}`;
}

// Update all statistics
function updateAllStats() {
  updateTaskCounts();
  updateCompletedCount();
  updateDueTodayCount();
  updateOverdueCount();
}

// Update task counts for each quadrant
function updateTaskCounts() {
  ['q1', 'q2', 'q3', 'q4'].forEach(quadrant => {
    const list = document.querySelector(`#${quadrant} .taskList`);
    const count = list.querySelectorAll('li:not(.empty-state)').length;
    document.getElementById(`${quadrant}-count`).textContent = count;
  });
}

// Update completed tasks count
function updateCompletedCount() {
  const completedCount = document.querySelectorAll('#completedList li').length;
  document.getElementById('completed-count').textContent = completedCount;
}

// Update due today count
function updateDueTodayCount() {
  const today = new Date().toISOString().split('T')[0];
  let dueTodayCount = 0;
  document.querySelectorAll('.taskList li:not(.empty-state)').forEach(li => {
    const deadline = li.querySelector('.deadline span').textContent;
    if (deadline === today) {
      dueTodayCount++;
    }
  });
  document.getElementById('due-today-count').textContent = dueTodayCount;
}

// Update overdue count
function updateOverdueCount() {
  const today = new Date().toISOString().split('T')[0];
  let overdueCount = 0;

  document.querySelectorAll('.taskList li:not(.empty-state)').forEach(li => {
    const deadline = li.querySelector('.deadline span').textContent;
    if (deadline < today) {
      overdueCount++;
    }
  });

  document.getElementById('overdue-count').textContent = overdueCount;
}

// Toggle completed tasks visibility
function toggleCompletedTasks() {
  const completedList = document.getElementById('completedList');
  const toggleBtn = document.querySelector('.toggle-completed i');

  completedList.classList.toggle('show');
  if (completedList.classList.contains('show')) {
    toggleBtn.className = 'fas fa-chevron-up';
  } else {
    toggleBtn.className = 'fas fa-chevron-down';
  }
}

// Drag functions
function drag(event) {
  draggedTask = event.target;
  draggedTask.classList.add('dragging');
  event.dataTransfer.setData('text/plain', draggedTask.getAttribute('data-id'));
}

function dragEnd() {
  if (draggedTask) {
    draggedTask.classList.remove('dragging');
  }
}

function allowDrop(event) {
  event.preventDefault();
}

function drop(event) {
  event.preventDefault();
  const targetQuadrant = event.currentTarget.id;
  const taskId = event.dataTransfer.getData('text/plain');

  if (draggedTask) {
    const oldQuadrant = draggedTask.closest(".quadrant").id;
    draggedTask.classList.remove('dragging');

    // Remove from old quadrant
    const oldList = document.querySelector(`#${oldQuadrant} .taskList`);
    draggedTask.remove();

    // Add to new quadrant
    const newList = document.querySelector(`#${targetQuadrant} .taskList`);
    const emptyState = newList.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
    newList.appendChild(draggedTask);

    saveTasks();
  }

  removeHighlight(event);
}

// Highlight quadrant while dragging
function highlight(event) {
  event.currentTarget.classList.add("drag-over");
}

function removeHighlight(event) {
  event.currentTarget.classList.remove("drag-over");
}

// Auto-update countdowns every minute
setInterval(() => {
  document.querySelectorAll('.countdown').forEach(countdown => {
    const taskElement = countdown.closest('li');
    const deadlineElement = taskElement.querySelector('.deadline span');
    if (deadlineElement) {
      updateCountdown(countdown, deadlineElement.textContent);
    }
  });
  updateDueTodayCount();
  updateOverdueCount();
}, 60 * 1000);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  initApp();
});