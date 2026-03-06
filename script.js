// State
let subjects = JSON.parse(localStorage.getItem('studyPlanner_subjects')) || [];
let tasks = JSON.parse(localStorage.getItem('studyPlanner_tasks')) || [];

// DOM Elements
const addSubjectForm = document.getElementById('add-subject-form');
const subjectNameInput = document.getElementById('subject-name');
const taskSubjectSelect = document.getElementById('task-subject');
const addTaskForm = document.getElementById('add-task-form');
const taskNameInput = document.getElementById('task-name');
const taskDueDateInput = document.getElementById('task-due-date');
const tasksContainer = document.getElementById('tasks-container');
const emptyState = document.getElementById('empty-state');
const progressText = document.getElementById('progress-text');
const progressPercentage = document.getElementById('progress-percentage');
const progressBar = document.getElementById('progress-bar');

// Initialization
function init() {
    // Set min date for task due date to today
    const today = new Date().toISOString().split('T')[0];
    taskDueDateInput.min = today;

    updateSubjectSelect();
    renderTasks();
    updateGlobalProgress();
}

// Event Listeners
addSubjectForm.addEventListener('submit', handleAddSubject);
addTaskForm.addEventListener('submit', handleAddTask);

// Handlers
function handleAddSubject(e) {
    e.preventDefault();
    
    const subjectName = subjectNameInput.value.trim();
    if (!subjectName) return;

    if (subjects.some(s => s.name.toLowerCase() === subjectName.toLowerCase())) {
        alert('This subject already exists.');
        return;
    }

    const newSubject = {
        id: Date.now().toString(),
        name: subjectName
    };

    subjects.push(newSubject);
    saveData();
    
    subjectNameInput.value = '';
    updateSubjectSelect();
    renderTasks();
}

function handleAddTask(e) {
    e.preventDefault();
    
    const subjectId = taskSubjectSelect.value;
    const name = taskNameInput.value.trim();
    const dueDate = taskDueDateInput.value;

    if (!subjectId || !name || !dueDate) return;

    const newTask = {
        id: Date.now().toString(),
        subjectId,
        name,
        dueDate,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveData();

    taskNameInput.value = '';
    taskDueDateInput.value = '';
    
    renderTasks();
    updateGlobalProgress();
}

// Exposed to window for inline onclick attributes
window.toggleTaskStatus = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
        updateGlobalProgress();
    }
}

window.deleteTask = function(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveData();
    renderTasks();
    updateGlobalProgress();
}

window.deleteSubject = function(subjectId) {
    if (confirm('Delete this subject and all its tasks?')) {
        subjects = subjects.filter(s => s.id !== subjectId);
        tasks = tasks.filter(t => t.subjectId !== subjectId);
        saveData();
        updateSubjectSelect();
        renderTasks();
        updateGlobalProgress();
    }
}

// Render Functions
function updateSubjectSelect() {
    const defaultOption = '<option value="" disabled selected>Select Subject...</option>';
    if (subjects.length === 0) {
        taskSubjectSelect.innerHTML = defaultOption;
        return;
    }

    const options = subjects.map(subject => 
        `<option value="${subject.id}">${subject.name}</option>`
    ).join('');
    
    taskSubjectSelect.innerHTML = defaultOption + options;
}

function renderTasks() {
    if (subjects.length === 0) {
        tasksContainer.innerHTML = '';
        tasksContainer.appendChild(emptyState);
        emptyState.classList.add('visible');
        return;
    }

    emptyState.classList.remove('visible');
    
    let html = '';
    
    subjects.forEach(subject => {
        const subjectTasks = tasks.filter(t => t.subjectId === subject.id);
        const completedCount = subjectTasks.filter(t => t.completed).length;
        const totalCount = subjectTasks.length;
        
        let subjectProgress = 0;
        if (totalCount > 0) {
            subjectProgress = Math.round((completedCount / totalCount) * 100);
        }

        html += `
            <div class="subject-card">
                <div class="subject-header">
                    <div>
                        <h3>${subject.name}</h3>
                        <div class="subject-meta">${completedCount}/${totalCount} tasks completed</div>
                    </div>
                    <button class="btn-icon" onclick="deleteSubject('${subject.id}')" title="Delete Subject">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="subject-progress-container">
                    <div class="subject-progress-bar" style="width: ${subjectProgress}%"></div>
                </div>

                <ul class="task-list">
        `;

        // Sort tasks: incomplete first, then by due date
        subjectTasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        if (subjectTasks.length === 0) {
            html += `<li class="empty-tasks">No tasks recorded</li>`;
        } else {
            subjectTasks.forEach(task => {
                const dateInfo = getDateStatus(task.dueDate);
                
                html += `
                    <li class="task-item ${task.completed ? 'completed' : ''}">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" class="minimal-checkbox" 
                                ${task.completed ? 'checked' : ''} 
                                onchange="toggleTaskStatus('${task.id}')">
                        </div>
                        <div class="task-content">
                            <span class="task-title">${task.name}</span>
                            <span class="task-date ${task.completed ? '' : dateInfo.className}">
                                ${dateInfo.text}
                            </span>
                        </div>
                        <button class="btn-icon" onclick="deleteTask('${task.id}')" title="Delete Task">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </li>
                `;
            });
        }

        html += `
                </ul>
            </div>
        `;
    });

    // Make sure we don't accidentally wipe out the empty state div if we need it later
    // By keeping it outside the loop, we reconstruct it cleanly.
    tasksContainer.innerHTML = html;
}

function updateGlobalProgress() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    
    progressText.textContent = `${completedTasks}/${totalTasks} Tasks`;
    
    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((completedTasks / totalTasks) * 100);
    }
    
    progressPercentage.textContent = `${percentage}%`;
    progressBar.style.width = `${percentage}%`;
}

// Utility
function getDateStatus(dateString) {
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = dueDate.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric'
    });
    
    if (diffDays < 0) {
        return { text: `Overdue - ${formattedDate}`, className: 'overdue' };
    } else if (diffDays === 0) {
        return { text: 'Today', className: 'today' };
    } else if (diffDays === 1) {
        return { text: 'Tomorrow', className: '' };
    } else {
        return { text: formattedDate, className: '' };
    }
}

function saveData() {
    localStorage.setItem('studyPlanner_subjects', JSON.stringify(subjects));
    localStorage.setItem('studyPlanner_tasks', JSON.stringify(tasks));
}

// Start app
init();
