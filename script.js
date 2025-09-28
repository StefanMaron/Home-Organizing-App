class HomeOrganizerApp {
    constructor() {
        this.people = [];
        this.tasks = [];
        this.currentView = 'dashboard';
        this.currentMonth = new Date();
        this.editingElement = null;
        this.editingTaskId = null;
        this.editingPersonId = null;
        this.firebaseService = window.firebaseService;
        this.useFirebase = true;
        this.realtimeListener = null;
        
        this.init();
    }

    async init() {
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        try {
            // Initialize Firebase first
            if (this.useFirebase) {
                await this.firebaseService.init();
                await this.firebaseService.signInAnonymously();
                this.updateConnectionStatus('connected', 'Online');
            }
            
            await this.loadData();
            this.setupEventListeners();
            this.renderDashboard();
            this.updateCalendar();
            this.renderPeopleView();
            this.startAutoSave();
            
            // Set up real-time listener for collaborative features
            if (this.useFirebase && this.firebaseService.user) {
                this.setupRealtimeListener();
            }
        } catch (error) {
            console.error('Firebase initialization failed, falling back to localStorage:', error);
            this.useFirebase = false;
            this.updateConnectionStatus('offline', 'Offline');
            this.loadData();
            this.setupEventListeners();
            this.renderDashboard();
            this.updateCalendar();
            this.renderPeopleView();
            this.startAutoSave();
        }
    }

    updateConnectionStatus(status, text) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.className = `connection-status ${status}`;
            statusElement.querySelector('span').textContent = text;
            
            const icon = statusElement.querySelector('i');
            switch (status) {
                case 'connected':
                    icon.className = 'fas fa-cloud';
                    break;
                case 'offline':
                    icon.className = 'fas fa-cloud-slash';
                    break;
                case 'connecting':
                default:
                    icon.className = 'fas fa-sync fa-spin';
                    break;
            }
        }
    }

    onUserAuthenticated() {
        // Called when Firebase auth state changes
        this.loadData();
        this.setupRealtimeListener();
    }

    setupRealtimeListener() {
        if (this.realtimeListener) {
            this.realtimeListener(); // Unsubscribe previous listener
        }
        
        this.realtimeListener = this.firebaseService.onUserDataChange((data) => {
            // Only update if data is newer than our local data
            const hasChanges = JSON.stringify(this.people) !== JSON.stringify(data.people) || 
                              JSON.stringify(this.tasks) !== JSON.stringify(data.tasks);
            
            if (hasChanges) {
                this.people = data.people;
                this.tasks = data.tasks;
                this.renderDashboard();
                this.updateCalendar();
                this.renderPeopleView();
                console.log('Data updated from real-time sync');
            }
        });
    }

    // Data Management
    async loadData() {
        try {
            // Try Firebase first if available
            if (this.useFirebase && this.firebaseService.user) {
                const firebaseData = await this.firebaseService.loadUserData();
                
                if (firebaseData && (firebaseData.people.length > 0 || firebaseData.tasks.length > 0)) {
                    this.people = firebaseData.people;
                    this.tasks = firebaseData.tasks;
                    console.log('Data loaded from Firebase');
                    return;
                }
            }
            
            // Fallback to localStorage
            const savedPeople = localStorage.getItem('homeOrganizer_people');
            const savedTasks = localStorage.getItem('homeOrganizer_tasks');
            
            this.people = savedPeople ? JSON.parse(savedPeople) : this.getDefaultPeople();
            this.tasks = savedTasks ? JSON.parse(savedTasks) : [];
            
            // Save default data if none exists
            if (!savedPeople || !savedTasks) {
                await this.saveData();
            }
            
            console.log('Data loaded from localStorage');
        } catch (error) {
            console.error('Error loading data:', error);
            // Emergency fallback
            this.people = this.getDefaultPeople();
            this.tasks = [];
        }
    }

    getDefaultPeople() {
        return [
            { id: '1', name: 'John', color: '#007bff' },
            { id: '2', name: 'Sarah', color: '#28a745' },
            { id: '3', name: 'Mike', color: '#dc3545' }
        ];
    }

    async saveData() {
        try {
            // Save to Firebase if available
            if (this.useFirebase && this.firebaseService.user) {
                await Promise.all([
                    this.firebaseService.savePeople(this.people),
                    this.firebaseService.saveTasks(this.tasks)
                ]);
            }
            
            // Always save to localStorage as backup
            localStorage.setItem('homeOrganizer_people', JSON.stringify(this.people));
            localStorage.setItem('homeOrganizer_tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving data:', error);
            // Ensure localStorage backup even if Firebase fails
            localStorage.setItem('homeOrganizer_people', JSON.stringify(this.people));
            localStorage.setItem('homeOrganizer_tasks', JSON.stringify(this.tasks));
        }
    }

    startAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveData();
        }, 30000);
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('dashboard-btn').addEventListener('click', () => this.switchView('dashboard'));
        document.getElementById('calendar-btn').addEventListener('click', () => this.switchView('calendar'));
        document.getElementById('people-btn').addEventListener('click', () => this.switchView('people'));

        // Add buttons
        document.getElementById('add-task-btn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('add-person-btn').addEventListener('click', () => this.openPersonModal());

        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));

        // Modal handlers
        this.setupModalHandlers();

        // Form handlers
        this.setupFormHandlers();

        // Global click handler for closing inline editing
        document.addEventListener('click', (e) => {
            if (this.editingElement && !this.editingElement.contains(e.target)) {
                this.finishInlineEdit();
            }
        });

        // Prevent drag and drop on non-draggable elements
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    setupModalHandlers() {
        // Close modals
        document.querySelectorAll('.modal-close, #cancel-task, #cancel-person').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });
    }

    setupFormHandlers() {
        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Person form
        document.getElementById('person-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePerson();
        });
    }

    // View Management
    switchView(view) {
        this.currentView = view;
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}-btn`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        
        // Refresh view content
        switch (view) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'calendar':
                this.updateCalendar();
                break;
            case 'people':
                this.renderPeopleView();
                break;
        }
    }

    // Dashboard Rendering
    renderDashboard() {
        const container = document.getElementById('people-columns');
        container.innerHTML = '';

        this.people.forEach(person => {
            const personTasks = this.tasks.filter(task => task.assignee === person.id);
            const column = this.createPersonColumn(person, personTasks);
            container.appendChild(column);
        });

        // Add unassigned column
        const unassignedTasks = this.tasks.filter(task => !task.assignee);
        if (unassignedTasks.length > 0 || this.people.length === 0) {
            const unassignedColumn = this.createPersonColumn(
                { id: null, name: 'Unassigned', color: '#6c757d' },
                unassignedTasks
            );
            container.appendChild(unassignedColumn);
        }
    }

    createPersonColumn(person, tasks) {
        const column = document.createElement('div');
        column.className = 'person-column';
        column.style.setProperty('--person-color', person.color);
        column.dataset.personId = person.id;

        column.innerHTML = `
            <div class="person-header">
                <div class="person-name editable" data-field="name">${person.name}</div>
                <div class="person-actions">
                    ${person.id ? `<button onclick="app.editPerson('${person.id}')" title="Edit Person"><i class="fas fa-edit"></i></button>` : ''}
                    ${person.id ? `<button onclick="app.deletePerson('${person.id}')" title="Delete Person"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="task-list" data-person-id="${person.id}"></div>
        `;

        const taskList = column.querySelector('.task-list');
        tasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            taskList.appendChild(taskCard);
        });

        // Add drag and drop handlers
        this.setupDragAndDrop(taskList);

        // Add inline editing for person name
        if (person.id) {
            const nameElement = column.querySelector('.person-name');
            nameElement.addEventListener('click', () => this.startInlineEdit(nameElement, 'person', person.id, 'name'));
        }

        return column;
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${this.isOverdue(task) ? 'overdue' : ''}`;
        card.dataset.taskId = task.id;
        card.draggable = true;
        card.style.setProperty('--person-color', this.getPersonColor(task.assignee));

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const dueDateStr = dueDate ? dueDate.toLocaleDateString() : '';

        card.innerHTML = `
            <div class="task-header">
                <div class="task-name editable" data-field="name">${task.name}</div>
                <div class="task-actions">
                    <button onclick="app.toggleTaskComplete('${task.id}')" title="${task.completed ? 'Mark Incomplete' : 'Mark Complete'}">
                        <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                    </button>
                    <button onclick="app.editTask('${task.id}')" title="Edit Task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.deleteTask('${task.id}')" title="Delete Task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="task-meta">
                ${dueDateStr ? `<div class="task-due-date editable ${this.isOverdue(task) ? 'overdue' : ''}" data-field="dueDate">${dueDateStr}</div>` : ''}
                ${task.cadence !== 'none' ? `<div class="task-cadence editable" data-field="cadence">${task.cadence}</div>` : ''}
            </div>
            ${task.description ? `<div class="task-description editable" data-field="description">${task.description}</div>` : ''}
            <div class="subtasks"></div>
        `;

        // Add drag handlers
        card.addEventListener('dragstart', (e) => this.handleDragStart(e));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        // Add inline editing handlers
        card.querySelectorAll('.editable').forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = element.dataset.field;
                this.startInlineEdit(element, 'task', task.id, field);
            });
        });

        // Render subtasks
        this.renderSubtasks(card.querySelector('.subtasks'), task);

        return card;
    }

    renderSubtasks(container, task) {
        container.innerHTML = '';
        
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach((subtask, index) => {
                const subtaskElement = document.createElement('div');
                subtaskElement.className = 'subtask';
                subtaskElement.innerHTML = `
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                           onchange="app.toggleSubtaskComplete('${task.id}', ${index})">
                    <input type="text" class="subtask-name" value="${subtask.name}" 
                           onchange="app.updateSubtaskName('${task.id}', ${index}, this.value)"
                           onblur="app.saveData()">
                    <button onclick="app.deleteSubtask('${task.id}', ${index})" title="Delete Subtask">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(subtaskElement);
            });
        }

        // Add subtask button
        const addButton = document.createElement('button');
        addButton.className = 'add-subtask-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Subtask';
        addButton.onclick = () => this.addSubtask(task.id);
        container.appendChild(addButton);
    }

    // Drag and Drop
    setupDragAndDrop(taskList) {
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            taskList.classList.add('drag-over');
        });

        taskList.addEventListener('dragleave', (e) => {
            if (!taskList.contains(e.relatedTarget)) {
                taskList.classList.remove('drag-over');
            }
        });

        taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            taskList.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain');
            const newAssignee = taskList.dataset.personId;
            
            this.reassignTask(taskId, newAssignee);
        });
    }

    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    reassignTask(taskId, newAssignee) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.assignee = newAssignee === 'null' ? null : newAssignee;
            this.saveData();
            this.renderDashboard();
        }
    }

    // Inline Editing
    startInlineEdit(element, type, id, field) {
        if (this.editingElement) {
            this.finishInlineEdit();
        }

        this.editingElement = element;
        this.editingType = type;
        this.editingId = id;
        this.editingField = field;

        const currentValue = element.textContent;
        
        if (field === 'dueDate') {
            // Special handling for date fields
            const input = document.createElement('input');
            input.type = 'date';
            input.value = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
            input.className = 'editable editing';
            
            element.parentNode.replaceChild(input, element);
            this.editingElement = input;
            input.focus();
            
            input.addEventListener('blur', () => this.finishInlineEdit());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.finishInlineEdit();
                if (e.key === 'Escape') this.cancelInlineEdit();
            });
        } else if (field === 'cadence') {
            // Special handling for cadence field
            const select = document.createElement('select');
            select.className = 'editable editing';
            select.innerHTML = `
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
            `;
            select.value = currentValue.toLowerCase();
            
            element.parentNode.replaceChild(select, element);
            this.editingElement = select;
            select.focus();
            
            select.addEventListener('blur', () => this.finishInlineEdit());
            select.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.finishInlineEdit();
                if (e.key === 'Escape') this.cancelInlineEdit();
            });
        } else {
            // Standard text editing
            element.contentEditable = true;
            element.classList.add('editing');
            element.focus();
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            element.addEventListener('blur', () => this.finishInlineEdit());
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.finishInlineEdit();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelInlineEdit();
                }
            });
        }
    }

    finishInlineEdit() {
        if (!this.editingElement) return;

        let newValue;
        if (this.editingElement.tagName === 'INPUT') {
            newValue = this.editingElement.value;
        } else if (this.editingElement.tagName === 'SELECT') {
            newValue = this.editingElement.value;
        } else {
            newValue = this.editingElement.textContent;
        }

        // Update the data
        if (this.editingType === 'task') {
            const task = this.tasks.find(t => t.id === this.editingId);
            if (task && newValue.trim()) {
                if (this.editingField === 'dueDate') {
                    task.dueDate = newValue;
                } else {
                    task[this.editingField] = newValue;
                }
                this.saveData();
                this.renderDashboard();
            }
        } else if (this.editingType === 'person') {
            const person = this.people.find(p => p.id === this.editingId);
            if (person && newValue.trim()) {
                person[this.editingField] = newValue;
                this.saveData();
                this.renderDashboard();
                this.renderPeopleView();
            }
        }

        this.editingElement = null;
        this.editingType = null;
        this.editingId = null;
        this.editingField = null;
    }

    cancelInlineEdit() {
        if (this.editingElement) {
            if (this.editingElement.tagName === 'INPUT' || this.editingElement.tagName === 'SELECT') {
                // Restore original element
                this.renderDashboard();
            } else {
                this.editingElement.contentEditable = false;
                this.editingElement.classList.remove('editing');
            }
        }
        
        this.editingElement = null;
        this.editingType = null;
        this.editingId = null;
        this.editingField = null;
    }

    // Task Management
    openTaskModal(taskId = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const title = document.getElementById('modal-title');
        
        // Populate assignee options
        const assigneeSelect = document.getElementById('task-assignee');
        assigneeSelect.innerHTML = '<option value="">Select Person</option>';
        this.people.forEach(person => {
            assigneeSelect.innerHTML += `<option value="${person.id}">${person.name}</option>`;
        });

        if (taskId) {
            // Edit mode
            const task = this.tasks.find(t => t.id === taskId);
            title.textContent = 'Edit Task';
            
            document.getElementById('task-name').value = task.name;
            document.getElementById('task-assignee').value = task.assignee || '';
            document.getElementById('task-due-date').value = task.dueDate || '';
            document.getElementById('task-cadence').value = task.cadence || 'none';
            document.getElementById('task-description').value = task.description || '';
            
            form.dataset.taskId = taskId;
        } else {
            // Add mode
            title.textContent = 'Add Task';
            form.reset();
            delete form.dataset.taskId;
        }

        modal.classList.add('active');
    }

    saveTask() {
        const form = document.getElementById('task-form');
        const formData = new FormData(form);
        const taskId = form.dataset.taskId;

        const taskData = {
            name: formData.get('name'),
            assignee: formData.get('assignee') || null,
            dueDate: formData.get('dueDate') || null,
            cadence: formData.get('cadence') || 'none',
            description: formData.get('description') || '',
            completed: false,
            subtasks: []
        };

        if (taskId) {
            // Update existing task
            const task = this.tasks.find(t => t.id === taskId);
            Object.assign(task, taskData);
        } else {
            // Create new task
            taskData.id = this.generateId();
            taskData.createdAt = new Date().toISOString();
            this.tasks.push(taskData);
        }

        this.saveData();
        this.closeModals();
        this.renderDashboard();
        this.updateCalendar();
    }

    editTask(taskId) {
        this.openTaskModal(taskId);
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.renderDashboard();
            this.updateCalendar();
        }
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            
            // Handle recurring tasks
            if (task.completed && task.cadence !== 'none') {
                this.createRecurringTask(task);
            }
            
            this.saveData();
            this.renderDashboard();
            this.updateCalendar();
        }
    }

    createRecurringTask(originalTask) {
        const newTask = { ...originalTask };
        newTask.id = this.generateId();
        newTask.completed = false;
        newTask.completedAt = null;
        newTask.createdAt = new Date().toISOString();
        
        // Calculate next due date
        if (newTask.dueDate) {
            const currentDue = new Date(newTask.dueDate);
            let nextDue = new Date(currentDue);
            
            switch (newTask.cadence) {
                case 'daily':
                    nextDue.setDate(nextDue.getDate() + 1);
                    break;
                case 'weekly':
                    nextDue.setDate(nextDue.getDate() + 7);
                    break;
                case 'monthly':
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    break;
            }
            
            newTask.dueDate = nextDue.toISOString().split('T')[0];
        }
        
        this.tasks.push(newTask);
    }

    // Subtask Management
    addSubtask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.subtasks) task.subtasks = [];
            task.subtasks.push({
                name: 'New Subtask',
                completed: false
            });
            this.saveData();
            this.renderDashboard();
        }
    }

    toggleSubtaskComplete(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[subtaskIndex]) {
            task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
            this.saveData();
        }
    }

    updateSubtaskName(taskId, subtaskIndex, newName) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[subtaskIndex]) {
            task.subtasks[subtaskIndex].name = newName;
            this.saveData();
        }
    }

    deleteSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            task.subtasks.splice(subtaskIndex, 1);
            this.saveData();
            this.renderDashboard();
        }
    }

    // Person Management
    openPersonModal(personId = null) {
        const modal = document.getElementById('person-modal');
        const form = document.getElementById('person-form');
        const title = document.getElementById('person-modal-title');

        if (personId) {
            // Edit mode
            const person = this.people.find(p => p.id === personId);
            title.textContent = 'Edit Person';
            
            document.getElementById('person-name').value = person.name;
            document.getElementById('person-color').value = person.color;
            
            form.dataset.personId = personId;
        } else {
            // Add mode
            title.textContent = 'Add Person';
            form.reset();
            delete form.dataset.personId;
        }

        modal.classList.add('active');
    }

    savePerson() {
        const form = document.getElementById('person-form');
        const formData = new FormData(form);
        const personId = form.dataset.personId;

        const personData = {
            name: formData.get('name'),
            color: formData.get('color')
        };

        if (personId) {
            // Update existing person
            const person = this.people.find(p => p.id === personId);
            Object.assign(person, personData);
        } else {
            // Create new person
            personData.id = this.generateId();
            this.people.push(personData);
        }

        this.saveData();
        this.closeModals();
        this.renderDashboard();
        this.renderPeopleView();
    }

    editPerson(personId) {
        this.openPersonModal(personId);
    }

    deletePerson(personId) {
        if (confirm('Are you sure you want to delete this person? Their tasks will become unassigned.')) {
            // Unassign tasks
            this.tasks.forEach(task => {
                if (task.assignee === personId) {
                    task.assignee = null;
                }
            });
            
            // Remove person
            this.people = this.people.filter(p => p.id !== personId);
            
            this.saveData();
            this.renderDashboard();
            this.renderPeopleView();
        }
    }

    // People View
    renderPeopleView() {
        const container = document.getElementById('people-list');
        container.innerHTML = '';

        this.people.forEach(person => {
            const personTasks = this.tasks.filter(t => t.assignee === person.id);
            const completedTasks = personTasks.filter(t => t.completed).length;
            const overdueTasks = personTasks.filter(t => this.isOverdue(t)).length;

            const card = document.createElement('div');
            card.className = 'person-card';
            card.style.setProperty('--person-color', person.color);

            card.innerHTML = `
                <div class="person-card-header">
                    <div class="person-card-name">${person.name}</div>
                    <div class="person-actions">
                        <button onclick="app.editPerson('${person.id}')" class="btn btn-small">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="app.deletePerson('${person.id}')" class="btn btn-small btn-danger">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="person-stats">
                    <div class="stat">
                        <div class="stat-number">${personTasks.length}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${completedTasks}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${personTasks.length - completedTasks}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${overdueTasks}</div>
                        <div class="stat-label">Overdue</div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    // Calendar View
    updateCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthLabel = document.getElementById('current-month');
        
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        monthLabel.textContent = new Intl.DateTimeFormat('en-US', { 
            month: 'long', 
            year: 'numeric' 
        }).format(this.currentMonth);

        // Clear existing content
        grid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            header.style.cssText = `
                background: #f8f9fa;
                padding: 1rem;
                text-align: center;
                font-weight: 600;
                color: #495057;
            `;
            grid.appendChild(header);
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate calendar days
        const today = new Date();
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayElement = this.createCalendarDay(currentDate, month, today);
            grid.appendChild(dayElement);
        }
    }

    createCalendarDay(date, currentMonth, today) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = date.toDateString() === today.toDateString();
        
        if (!isCurrentMonth) day.classList.add('other-month');
        if (isToday) day.classList.add('today');

        const dateStr = date.toISOString().split('T')[0];
        const dayTasks = this.tasks.filter(task => task.dueDate === dateStr);

        day.innerHTML = `
            <div class="day-number">${date.getDate()}</div>
            <div class="day-tasks"></div>
        `;

        const tasksContainer = day.querySelector('.day-tasks');
        dayTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `calendar-task ${this.isOverdue(task) ? 'overdue' : ''}`;
            taskElement.style.setProperty('--person-color', this.getPersonColor(task.assignee));
            taskElement.textContent = task.name;
            taskElement.title = `${task.name}${task.assignee ? ` (${this.getPersonName(task.assignee)})` : ''}`;
            taskElement.onclick = () => this.editTask(task.id);
            tasksContainer.appendChild(taskElement);
        });

        return day;
    }

    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.updateCalendar();
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    isOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate) < new Date();
    }

    getPersonColor(personId) {
        if (!personId) return '#6c757d';
        const person = this.people.find(p => p.id === personId);
        return person ? person.color : '#6c757d';
    }

    getPersonName(personId) {
        if (!personId) return 'Unassigned';
        const person = this.people.find(p => p.id === personId);
        return person ? person.name : 'Unknown';
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HomeOrganizerApp();
});

// Expose app globally for onclick handlers
window.app = app;