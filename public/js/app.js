// Kanban App Main Logic
const { useState, useEffect, useRef } = React;

// Utils
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate() {
    return new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'success', container = document.getElementById('toast')) {
    if (!container) return;
    container.textContent = message;
    container.className = `toast ${type}`;
    container.removeAttribute('hidden');
    requestAnimationFrame(() => {
        container.classList.remove('hide');
        setTimeout(() => {
            container.classList.add('hide');
            setTimeout(() => container.setAttribute('hidden', ''), 300);
        }, 3000);
    });
}

function saveTasks(tasks) {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
}

function loadTasks() {
    try {
        const saved = localStorage.getItem('kanban-tasks');
        if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TASKS;
}

const DEFAULT_TASKS = [
    { id: generateId(), title: 'Design landing page', description: 'Hero section, features grid, and CTA', column: 'todo', priority: 'high', createdAt: formatDate() },
    { id: generateId(), title: 'Set up Stripe checkout', description: 'Wire up checkout session endpoint', column: 'todo', priority: 'medium', createdAt: formatDate() },
    { id: generateId(), title: 'Build task board', description: 'Add, edit, delete, and drag tasks', column: 'inprogress', priority: 'high', createdAt: formatDate() },
    { id: generateId(), title: 'Write README', description: 'Project overview and setup steps', column: 'done', priority: 'low', createdAt: formatDate() },
];

function filterTasksByColumn(tasks, columnId) {
    return tasks.filter(task => task.column === columnId);
}

function getPriorityClass(priority) {
    return `task-priority ${priority}`;
}

function Task({ task, onUpdate, onDelete, onEdit }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const ref = useRef(null);

    const handleDragStart = (e) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        if (ref.current) {
            ref.current.classList.add('dragging');
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        if (ref.current) {
            ref.current.classList.remove('dragging');
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirm(`Delete task "${task.title}"?`)) {
            setIsDeleting(true);
            setTimeout(() => onDelete(task.id), 200);
        }
    };

    const handleEdit = () => onEdit(task);

    return (
        <div
            ref={ref}
            className={`task ${isDragging ? 'dragging' : ''}`}
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleEdit}
            style={{ opacity: isDeleting ? 0 : 1, transition: 'opacity 0.2s ease' }}
        >
            <div className="task-header">
                <div className="task-title">{task.title}</div>
                <button
                    className="task-delete"
                    onClick={handleDelete}
                    title="Delete task"
                >
                    ✕
                </button>
            </div>

            {task.description && (
                <div className="task-desc">{task.description}</div>
            )}

            <div className="task-footer">
                <div className={getPriorityClass(task.priority)}>
                    <span>
                        {task.priority === 'low' ? '◌' :
                         task.priority === 'medium' ? '●' :
                         '◆'}
                    </span>
                    <span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>
                    {task.createdAt}
                </div>
            </div>
        </div>
    );
}

function TaskForm({ onSave, onCancel, initialData = null, isEditing = false }) {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        column: initialData?.column || 'todo',
        priority: initialData?.priority || 'medium'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast('Task title is required', 'error');
            return;
        }

        onSave({
            ...initialData,
            ...formData,
            title: formData.title.trim(),
            id: initialData?.id || generateId(),
            createdAt: formatDate()
        });
    };

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    return (
        <form className="form" onSubmit={handleSubmit}>
            <div className="field">
                <span>Task title</span>
                <input
                    type="text"
                    value={formData.title}
                    onChange={handleChange('title')}
                    placeholder="e.g. Design landing page"
                    required
                    maxLength="120"
                />
            </div>

            <div className="field">
                <span>Description</span>
                <textarea
                    value={formData.description}
                    onChange={handleChange('description')}
                    rows="3"
                    placeholder="Add details..."
                ></textarea>
            </div>

            <div className="field">
                <span>Column</span>
                <select value={formData.column} onChange={handleChange('column')}>
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                </select>
            </div>

            <div className="field">
                <span>Priority</span>
                <select value={formData.priority} onChange={handleChange('priority')}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <div className="modal-foot">
                <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn-primary">
                    {isEditing ? 'Update Task' : 'Save Task'}
                </button>
            </div>
        </form>
    );
}

function KanbanColumn({ id, title, tasks, onTaskDrop, onAddTask, onEditTask, onDeleteTask }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const tasksRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            onTaskDrop(taskId, id);
        }
    };

    const handleAddTask = () => {
        onAddTask(id);
    };

    const filteredTasks = tasks;

    return (
        <div
            className={`column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="column-header">
                <div className="column-title">
                    <span>
                        {title === 'todo' ? '◌' :
                         title === 'inprogress' ? '⏳' :
                         '✓'}
                    </span>
                    <span>{title.charAt(0).toUpperCase() + title.slice(1)}</span>
                </div>
                <div className="column-count">
                    {filteredTasks.length}
                </div>
            </div>

            <div className="tasks" ref={tasksRef}>
                {filteredTasks.length === 0 && (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.875rem',
                        fontStyle: 'italic'
                    }}>
                        No tasks yet
                    </div>
                )}

                {filteredTasks.map(task => (
                    <Task
                        key={task.id}
                        task={task}
                        onUpdate={onEditTask}
                        onDelete={onDeleteTask}
                        onEdit={onEditTask}
                    />
                ))}
            </div>

            <button className="add-task-btn" onClick={handleAddTask}>
                <span>+</span> Add Task
            </button>
        </div>
    );
}

function App() {
    const [tasks, setTasks] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [modalColumn, setModalColumn] = useState('todo');
    const stripe = Stripe('<%= process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder" %>');

    useEffect(() => {
        setTasks(loadTasks());
    }, []);

    useEffect(() => {
        saveTasks(tasks);
    }, [tasks]);

    useEffect(() => {
        if (showModal) {
            document.getElementById('modal-backdrop').removeAttribute('hidden');
            document.getElementById('task-form').classList.remove('hide');
        } else {
            document.getElementById('modal-backdrop').setAttribute('hidden', '');
            setTimeout(() => {
                document.getElementById('task-form').classList.add('hide');
            }, 150);
        }
    }, [showModal]);

    useEffect(() => {
        if (editingTask) {
            document.getElementById('task-id').value = editingTask.id || '';
            document.getElementById('task-title').value = editingTask.title;
            document.getElementById('task-desc').value = editingTask.description || '';
            document.getElementById('task-column').value = editingTask.column;
            document.getElementById('task-priority').value = editingTask.priority;
            document.getElementById('modal-title').textContent = 'Edit Task';
        } else {
            document.getElementById('task-id').value = '';
            document.getElementById('task-title').value = '';
            document.getElementById('task-desc').value = '';
            document.getElementById('task-column').value = modalColumn;
            document.getElementById('task-priority').value = 'medium';
            document.getElementById('modal-title').textContent = 'New Task';
        }
    }, [editingTask, modalColumn]);

    const openModalForColumn = (columnId) => {
        setModalColumn(columnId);
        setEditingTask(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
    };

    const handleAddTask = (columnId) => {
        openModalForColumn(columnId);
    };

    const handleSaveTask = (savedTask) => {
        if (editingTask) {
            setTasks(tasks.map(t => t.id === editingTask.id ? savedTask : editingTask));
            closeModal();
            showToast(`Task "${savedTask.title}" updated`);
        } else {
            setTasks([...tasks, savedTask]);
            closeModal();
            showToast(`Task "${savedTask.title}" added`);
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setShowModal(true);
    };

    const handleDeleteTask = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        setTasks(tasks.filter(t => t.id !== taskId));
        showToast(`Task "${task?.title || 'Task'}" deleted`, 'success');
    };

    const handleTaskDrop = (taskId, newColumn) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.column !== newColumn) {
            const updatedTask = { ...task, column: newColumn };
            setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
            const columnName = newColumn === 'todo' ? 'To Do' :
                              newColumn === 'inprogress' ? 'In Progress' :
                              newColumn === 'done' ? 'Done' : newColumn;
            showToast(`Task "${task.title}" moved to ${columnName}`, 'success');
        }
    };

    const handleCheckoutClick = async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="btn-premium-content"><span>⏳</span> Redirecting…</span>';
        btn.disabled = true;

        try {
            const res = await fetch('/create-checkout-session', { method: 'POST' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            await stripe.redirectToCheckout({ sessionId: data.id });
        } catch (err) {
            showToast('Could not start checkout. Please try again.', 'error');
            btn.innerHTML = original;
            btn.disabled = false;
        }
    };

    const todoTasks = filterTasksByColumn(tasks, 'todo');
    const inProgressTasks = filterTasksByColumn(tasks, 'inprogress');
    const doneTasks = filterTasksByColumn(tasks, 'done');

    return (
        <>
            <header className="topbar">
                <div className="search">
                    <span className="search-icon">⌕</span>
                    <input type="text" placeholder="Search tasks..." />
                </div>
                <div className="topbar-actions">
                    <button className="btn-icon" title="Notifications">🔔</button>
                    <div className="avatar">AQ</div>
                </div>
            </header>

            <div className="board-header">
                <div>
                    <h1 className="board-title">Product Board</h1>
                    <p className="board-sub">Plan, track, and ship your work.</p>
                </div>
                <button id="checkout-button" className="btn-premium" onClick={handleCheckoutClick}>
                    <span className="btn-premium-glow"></span>
                    <span className="btn-premium-content">
                        <span>✦</span> Upgrade to Premium
                    </span>
                </button>
            </div>

            <div className="board">
                <KanbanColumn
                    id="todo"
                    title="To Do"
                    tasks={todoTasks}
                    onTaskDrop={handleTaskDrop}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                />

                <KanbanColumn
                    id="inprogress"
                    title="In Progress"
                    tasks={inProgressTasks}
                    onTaskDrop={handleTaskDrop}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                />

                <KanbanColumn
                    id="done"
                    title="Done"
                    tasks={doneTasks}
                    onTaskDrop={handleTaskDrop}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                />
            </div>

            <div className="modal-backdrop" id="modal-backdrop" hidden onClick={closeModal}>
                <div className="modal" onClick={e => e.stopPropagation()} hidden>
                    <div className="modal-head">
                        <h3 id="modal-title">New Task</h3>
                        <button className="btn-icon" id="modal-close" onClick={closeModal}>✕</button>
                    </div>
                    <TaskForm
                        onSave={handleSaveTask}
                        onCancel={closeModal}
                        initialData={editingTask}
                        isEditing={!!editingTask}
                    />
                </div>
            </div>

            <div className="toast" id="toast" hidden></div>
        >
    );
}

// Initialize app when DOM is ready
if (typeof document !== 'undefined') {
    const board = document.getElementById('board');
    if (board) {
        ReactDOM.render(<App />, board);
    }
}