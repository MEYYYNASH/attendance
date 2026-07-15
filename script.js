/**
 * SETEC Student Attendance Management System
 * Core Javascript Application Logic
 */

// ==========================================================================
// 1. Application State & Storage Keys
// ==========================================================================
const STORAGE_KEYS = {
    STUDENTS: 'setec_ams_students',
    ATTENDANCE: 'setec_ams_attendance',
    THEME: 'setec_ams_theme'
};

let state = {
    students: [],
    attendance: {}, // Structure: { "YYYY-MM-DD": { "StudentID": { status: "P"|"A"|"L"|"E", remarks: "" } } }
    currentDate: '', // Format: YYYY-MM-DD
    activeView: 'dashboard',
    studentsPagination: {
        currentPage: 1,
        pageSize: 10
    }
};

// Default Mock Data (Used if LocalStorage is empty)
const MOCK_STUDENTS = [
    { id: 'STU1001', name: 'Sithy Riyadararith', class: 'SW40', gender: 'Male', contactNo: '+85512333444' },
    { id: 'STU1002', name: 'Sthapor Pichpenhbormey', class: 'SW40', gender: 'Female', contactNo: '+85585555666' },
    { id: 'STU1003', name: 'Sey Chanpiseth', class: 'SW40', gender: 'Male', contactNo: '+85593111222' },
    { id: 'STU1004', name: 'Sthapor Pichpenhvong', class: 'SW40', gender: 'Male', contactNo: '+85577987654' }
];

// Global Chart References
let todayChart = null;
let weeklyChart = null;

// ==========================================================================
// 2. Initialization & Core Setup
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeDate();
    loadLocalStorageData();
    setupNavigation();
    setupThemeToggle();
    setupEventListeners();
    
    // Initial Render
    renderActiveView();
    showToast('Welcome to SETEC Institute!', 'success');
});

// Initialize Date variables
function initializeDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    state.currentDate = `${yyyy}-${mm}-${dd}`;
    
    // Set default value in UI pickers
    const datePicker = document.getElementById('attendance-date');
    if (datePicker) datePicker.value = state.currentDate;
    
    const monthPicker = document.getElementById('report-month-select');
    if (monthPicker) monthPicker.value = `${yyyy}-${mm}`;
}



// Load database from LocalStorage
function loadLocalStorageData() {
    let rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    
    // Automatic Migration: Clear old demo classes/names (Year 3, Year 4, CS, Telecom, Sok Mean, Chan Nary) if they exist
    if (rawStudents && (rawStudents.includes('Year ') || rawStudents.includes('Telecom') || rawStudents.includes('CS') || rawStudents.includes('Sok Mean') || rawStudents.includes('Chan Nary'))) {
        localStorage.removeItem(STORAGE_KEYS.STUDENTS);
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        rawStudents = null;
    }
    
    // Force one-time clear of students list cache to load the updated SW40 Sithy Riyadararith roster
    if (!localStorage.getItem('setec_ams_students_reset_v5')) {
        localStorage.removeItem(STORAGE_KEYS.STUDENTS);
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        localStorage.setItem('setec_ams_students_reset_v5', 'true');
        rawStudents = null;
    }
    
    // Clear attendance database to ensure NO mock history is preloaded (real reports, no auto setup)
    if (!localStorage.getItem('setec_ams_attendance_reset_v5')) {
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        localStorage.setItem('setec_ams_attendance_reset_v5', 'true');
    }
    
    // 1. Load Students
    if (rawStudents) {
        state.students = JSON.parse(rawStudents);
    } else {
        // Populate clean SW40 students on first run
        state.students = [...MOCK_STUDENTS];
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
    }
    
    // 2. Load Attendance
    const rawAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (rawAttendance) {
        state.attendance = JSON.parse(rawAttendance);
    } else {
        // Start completely empty for a real setup with no auto setup of history
        state.attendance = {};
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(state.attendance));
    }
}

// Save database to LocalStorage
function saveStudentsToStorage() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
}

function saveAttendanceToStorage() {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(state.attendance));
}

// Helper to generate 7 days of realistic attendance history
function generateMockAttendanceHistory() {
    const mockHistory = {};
    const statuses = ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'A', 'L', 'E', 'LV']; // Weighted towards Present (P)
    
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Skip Sundays
        if (d.getDay() === 0) continue;
        
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        mockHistory[dateStr] = {};
        MOCK_STUDENTS.forEach(student => {
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            mockHistory[dateStr][student.id] = {
                status: randomStatus,
                remarks: randomStatus === 'L' ? '5 minutes late' : (randomStatus === 'E' ? 'Doctor appointment' : '')
            };
        });
    }
    return mockHistory;
}

// ==========================================================================
// 3. Navigation & Views Switching
// ==========================================================================
function setupNavigation() {
    // Standard multi-page navigation is handled directly by browser href links.
}

// Setup theme switcher
function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    
    // Set initial
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        toggle.checked = false;
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        toggle.checked = true;
    }
    
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
            showToast('Switched to Dark Glassmorphism', 'info');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem(STORAGE_KEYS.THEME, 'light');
            showToast('Switched to Light Mode', 'info');
        }
        // Redraw charts to update colors for light/dark gridlines
        if (state.activeView === 'dashboard') {
            renderDashboardCharts();
        }
    });
}

function renderActiveView() {
    // Detect active view by searching for the active content-view element
    if (document.getElementById('view-dashboard')) {
        state.activeView = 'dashboard';
        renderDashboard();
    } else if (document.getElementById('view-students')) {
        state.activeView = 'students';
        state.studentsPagination.currentPage = 1;
        populateClassFilters();
        renderStudentsList();
    } else if (document.getElementById('view-attendance')) {
        state.activeView = 'attendance';
        populateAttendanceFilters();
        renderAttendanceMarker();
    } else if (document.getElementById('view-reports')) {
        state.activeView = 'reports';
        populateReportFilters();
        renderMonthlyReport();
    }
}

// ==========================================================================
// 4. Dashboard Logic & Charts Rendering
// ==========================================================================
function renderDashboard() {
    const totalStudents = state.students.length;
    document.getElementById('stat-total-students').textContent = totalStudents;
    
    // Attendance stats for today
    const todayRecords = state.attendance[state.currentDate] || {};
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let markedCount = 0;
    
    state.students.forEach(student => {
        if (todayRecords[student.id]) {
            markedCount++;
            const status = todayRecords[student.id].status;
            if (status === 'P') presentCount++;
            else if (status === 'A') absentCount++;
            else if (status === 'L') lateCount++;
            else if (status === 'E') excusedCount++;
        }
    });
    
    document.getElementById('stat-present-today').textContent = presentCount;
    document.getElementById('stat-absent-today').textContent = absentCount;
    document.getElementById('stat-late-today').textContent = lateCount;
    document.getElementById('stat-excused-today').textContent = excusedCount;
    
    // Attendance rate
    let rate = 0;
    if (markedCount > 0) {
        // Present + Late count as present for overall percentage
        rate = Math.round(((presentCount + lateCount) / markedCount) * 100);
    } else {
        // Fallback calculations using last available date if today is empty
        const dates = Object.keys(state.attendance).sort();
        if (dates.length > 0) {
            const lastDate = dates[dates.length - 1];
            const lastRecords = state.attendance[lastDate];
            let lp = 0, ll = 0, lm = 0;
            state.students.forEach(s => {
                if (lastRecords[s.id]) {
                    lm++;
                    if (lastRecords[s.id].status === 'P') lp++;
                    if (lastRecords[s.id].status === 'L') ll++;
                }
            });
            if (lm > 0) rate = Math.round(((lp + ll) / lm) * 100);
        }
    }
    
    document.getElementById('stat-attendance-rate').textContent = `${rate}%`;
    
    // Render Dashboard Overview Table & Charts
    renderClassOverviewTable();
    renderDashboardCharts();
}

function renderClassOverviewTable() {
    const tbody = document.querySelector('#table-class-overview tbody');
    tbody.innerHTML = '';
    
    // Group students by class
    const classGroups = {};
    state.students.forEach(student => {
        if (!classGroups[student.class]) {
            classGroups[student.class] = [];
        }
        classGroups[student.class].push(student);
    });
    
    const todayRecords = state.attendance[state.currentDate] || {};
    
    Object.keys(classGroups).sort().forEach(className => {
        const list = classGroups[className];
        let p = 0, a = 0, l = 0, e = 0;
        
        list.forEach(student => {
            const record = todayRecords[student.id];
            if (record) {
                if (record.status === 'P') p++;
                else if (record.status === 'A') a++;
                else if (record.status === 'L') l++;
                else if (record.status === 'E') e++;
            }
        });
        
        const total = list.length;
        const marked = p + a + l + e;
        const perfPercent = marked > 0 ? Math.round(((p + l) / total) * 100) : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${className}</strong></td>
            <td>${total}</td>
            <td class="text-green">${p}</td>
            <td class="text-red">${a}</td>
            <td class="text-yellow">${l}</td>
            <td class="text-cyan">${e}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="progress-bar-container" style="flex-grow:1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; width: 100px;">
                        <div style="width: ${perfPercent}%; height: 100%; background: ${perfPercent > 80 ? 'var(--status-present)' : (perfPercent > 50 ? 'var(--status-late)' : 'var(--status-absent)')}; border-radius: 4px;"></div>
                    </div>
                    <span style="font-size: 12px; font-weight: 600;">${perfPercent}%</span>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDashboardCharts() {
    const isDark = document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#9aa4b7' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    
    // Destroy previous charts to redraw
    if (todayChart) todayChart.destroy();
    if (weeklyChart) weeklyChart.destroy();
    
    // 1. TODAY'S ATTENDANCE STATUS (Donut Chart)
    const todayRecords = state.attendance[state.currentDate] || {};
    let counts = { P: 0, A: 0, L: 0, E: 0, U: 0 };
    
    state.students.forEach(student => {
        if (todayRecords[student.id]) {
            counts[todayRecords[student.id].status]++;
        } else {
            counts.U++; // Unmarked
        }
    });
    
    const todayCtx = document.getElementById('today-attendance-chart').getContext('2d');
    todayChart = new Chart(todayCtx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'Late', 'Excused', 'Unmarked'],
            datasets: [{
                data: [counts.P, counts.A, counts.L, counts.E, counts.U],
                backgroundColor: [
                    '#00e676', // Green
                    '#ff1744', // Red
                    '#ffea00', // Yellow
                    '#00e5ff', // Cyan
                    'rgba(255, 255, 255, 0.08)' // Muted
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: labelColor, font: { family: 'Outfit', size: 12 } }
                }
            },
            cutout: '70%'
        }
    });
    
    // 2. WEEKLY ATTENDANCE TREND (Line Chart)
    // Gather last 7 recorded dates
    const dates = Object.keys(state.attendance).sort().slice(-7);
    if (dates.length === 0) return;
    
    const chartLabels = dates.map(dateStr => {
        const d = new Date(dateStr);
        return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    const percentageData = dates.map(dateStr => {
        const records = state.attendance[dateStr];
        let p = 0, l = 0, count = 0;
        state.students.forEach(student => {
            if (records[student.id]) {
                count++;
                if (records[student.id].status === 'P') p++;
                if (records[student.id].status === 'L') l++;
            }
        });
        return count > 0 ? Math.round(((p + l) / count) * 100) : 0;
    });
    
    const weeklyCtx = document.getElementById('weekly-trend-chart').getContext('2d');
    weeklyChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Attendance Rate %',
                data: percentageData,
                borderColor: '#00a859',
                backgroundColor: 'rgba(0, 168, 89, 0.1)',
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#00a859'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: labelColor, font: { family: 'Outfit' } }
                },
                y: {
                    min: 50,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: labelColor, font: { family: 'Outfit' } }
                }
            }
        }
    });
}

// ==========================================================================
// 5. Student CRUD Management
// ==========================================================================
function populateClassFilters() {
    const classFilter = document.getElementById('student-class-filter');
    if (!classFilter) return;
    
    // Get unique classes
    const classes = [...new Set(state.students.map(s => s.class))].sort();
    
    // Save selection
    const savedVal = classFilter.value;
    classFilter.innerHTML = '<option value="all">All Groups</option>';
    classes.forEach(c => {
        classFilter.innerHTML += `<option value="${c}">${c}</option>`;
    });
    
    classFilter.value = savedVal;
}

function renderStudentsList() {
    const tbody = document.querySelector('#table-students-list tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Filters & Search
    const searchVal = document.getElementById('student-search-input').value.toLowerCase().trim();
    const classFilterVal = document.getElementById('student-class-filter').value;
    
    let filteredStudents = state.students.filter(student => {
        const matchesSearch = student.id.toLowerCase().includes(searchVal) || 
                              student.name.toLowerCase().includes(searchVal) ||
                              student.class.toLowerCase().includes(searchVal);
        
        const matchesClass = classFilterVal === 'all' || student.class === classFilterVal;
        
        return matchesSearch && matchesClass;
    });
    
    // Sort by Class then ID
    filteredStudents.sort((a, b) => {
        if (a.class !== b.class) return a.class.localeCompare(b.class);
        return a.id.localeCompare(b.id);
    });
    
    // Pagination
    const totalCount = filteredStudents.length;
    const page = state.studentsPagination.currentPage;
    const size = state.studentsPagination.pageSize;
    
    const startIdx = (page - 1) * size;
    const endIdx = Math.min(startIdx + size, totalCount);
    
    const paginatedStudents = filteredStudents.slice(startIdx, endIdx);
    
    // Update pagination info
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
        if (totalCount > 0) {
            infoEl.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalCount} students`;
        } else {
            infoEl.textContent = 'No students found';
        }
    }
    
    // Enable/disable page buttons
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = endIdx >= totalCount;
    
    if (paginatedStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No student records found matching filters.</td></tr>';
        return;
    }
    
    paginatedStudents.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${student.id}</code></td>
            <td><strong>${student.name}</strong></td>
            <td>${student.class}</td>
            <td>${student.gender}</td>
            <td>${student.contactNo || '<span class="text-muted">N/A</span>'}</td>
            <td><span class="badge badge-pulse" style="background: rgba(0, 168, 89, 0.08); color: var(--primary-color);">Active</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary edit-student-btn" data-id="${student.id}" title="Edit Student">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary delete-student-btn" style="color: var(--status-absent); border-color: rgba(255, 23, 68, 0.2);" data-id="${student.id}" title="Delete Student">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add Event Listeners for actions
    document.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openStudentModal(btn.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteStudent(btn.getAttribute('data-id'));
        });
    });
}

function openStudentModal(studentId = null) {
    const modal = document.getElementById('student-modal');
    const form = document.getElementById('student-form');
    const title = document.getElementById('modal-title');
    const idInput = document.getElementById('form-student-id');
    
    form.reset();
    
    if (studentId) {
        // Edit Mode
        const student = state.students.find(s => s.id === studentId);
        if (!student) return;
        
        title.textContent = 'Edit Student Details';
        document.getElementById('form-student-id-original').value = student.id;
        idInput.value = student.id;
        idInput.disabled = true; // Block editing ID primary key
        document.getElementById('form-student-name').value = student.name;
        document.getElementById('form-student-gender').value = student.gender;
        document.getElementById('form-student-class').value = student.class;
        document.getElementById('form-student-phone').value = student.contactNo || '';
    } else {
        // Add Mode
        title.textContent = 'Add New Student';
        document.getElementById('form-student-id-original').value = '';
        idInput.disabled = false;
    }
    
    modal.classList.add('open');
}

function deleteStudent(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    
    if (confirm(`Are you sure you want to delete ${student.name} (${student.id})? This will not clear their saved attendance history but they will be removed from future lists.`)) {
        state.students = state.students.filter(s => s.id !== studentId);
        saveStudentsToStorage();
        renderStudentsList();
        showToast('Student deleted successfully', 'success');
    }
}

// ==========================================================================
// 6. Attendance Marker Logic
// ==========================================================================
function populateAttendanceFilters() {
    const classSelect = document.getElementById('attendance-class-select');
    if (!classSelect) return;
    
    const classes = [...new Set(state.students.map(s => s.class))].sort();
    
    const savedVal = classSelect.value;
    classSelect.innerHTML = '';
    
    if (classes.length > 0) {
        classes.forEach(c => {
            classSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
        if (savedVal && classes.includes(savedVal)) {
            classSelect.value = savedVal;
        } else {
            classSelect.value = classes[0];
        }
    } else {
        classSelect.innerHTML = '<option value="">No Groups Available</option>';
    }
}

function renderAttendanceMarker() {
    const tbody = document.querySelector('#table-attendance-marker tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const selectedClass = document.getElementById('attendance-class-select').value;
    const selectedDate = document.getElementById('attendance-date').value;
    const searchVal = document.getElementById('marker-search-input').value.toLowerCase().trim();
    
    if (!selectedClass) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Please add classes and students first.</td></tr>';
        return;
    }
    
    const classStudents = state.students.filter(s => s.class === selectedClass && 
        (s.name.toLowerCase().includes(searchVal) || s.id.toLowerCase().includes(searchVal))
    );
    
    // Sort by ID
    classStudents.sort((a, b) => a.id.localeCompare(b.id));
    
    if (classStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No students in this class match search query.</td></tr>';
        updateMarkSummaryBanner();
        return;
    }
    
    // Load attendance for date
    const dateRecords = state.attendance[selectedDate] || {};
    
    classStudents.forEach(student => {
        const record = dateRecords[student.id] || { status: '', remarks: '' };
        const activeStatus = record.status;
        const remarks = record.remarks;
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-student-id', student.id);
        if (activeStatus) {
            tr.classList.add(`status-marked-${activeStatus}`);
        }
        tr.innerHTML = `
            <td><code>${student.id}</code></td>
            <td><strong>${student.name}</strong></td>
            <td>${student.class}</td>
            <td>${student.gender}</td>
            <td>
                <div class="status-pill-group">
                    <button class="status-btn ${activeStatus === 'P' ? 'active' : ''}" data-status="P" type="button">P</button>
                    <button class="status-btn ${activeStatus === 'A' ? 'active' : ''}" data-status="A" type="button">A</button>
                    <button class="status-btn ${activeStatus === 'L' ? 'active' : ''}" data-status="L" type="button">L</button>
                    <button class="status-btn ${activeStatus === 'E' ? 'active' : ''}" data-status="E" type="button">E</button>
                </div>
            </td>
            <td>
                <input type="text" class="table-remarks-input" placeholder="e.g. sick leave" value="${remarks}">
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Setup status buttons click listener
    document.querySelectorAll('#table-attendance-marker .status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.closest('.status-pill-group');
            group.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Set status color class on parent tr
            const tr = this.closest('tr');
            const status = this.getAttribute('data-status');
            tr.className = tr.className.replace(/status-marked-\w+/g, '').trim();
            tr.classList.add(`status-marked-${status}`);
            
            updateMarkSummaryBanner();
        });
    });
    
    // Setup remarks input listeners
    document.querySelectorAll('#table-attendance-marker .table-remarks-input').forEach(input => {
        input.addEventListener('change', () => {
            // Auto active state check
        });
    });
    
    updateMarkSummaryBanner();
}

// Calculate marked counts live in the footer banner
function updateMarkSummaryBanner() {
    let p = 0, a = 0, l = 0, e = 0;
    
    document.querySelectorAll('#table-attendance-marker tbody tr').forEach(tr => {
        const activeBtn = tr.querySelector('.status-btn.active');
        if (activeBtn) {
            const status = activeBtn.getAttribute('data-status');
            if (status === 'P') p++;
            else if (status === 'A') a++;
            else if (status === 'L') l++;
            else if (status === 'E') e++;
        }
    });
    
    document.getElementById('mark-summary-present').textContent = p;
    document.getElementById('mark-summary-absent').textContent = a;
    document.getElementById('mark-summary-late').textContent = l;
    document.getElementById('mark-summary-excused').textContent = e;
}

function saveAttendance() {
    const selectedDate = document.getElementById('attendance-date').value;
    if (!selectedDate) {
        showToast('Please select a valid date.', 'error');
        return;
    }
    
    if (!state.attendance[selectedDate]) {
        state.attendance[selectedDate] = {};
    }
    
    let count = 0;
    document.querySelectorAll('#table-attendance-marker tbody tr').forEach(tr => {
        const studentId = tr.getAttribute('data-student-id');
        if (!studentId) return;
        
        const activeBtn = tr.querySelector('.status-btn.active');
        const remarksVal = tr.querySelector('.table-remarks-input').value.trim();
        
        if (activeBtn) {
            const status = activeBtn.getAttribute('data-status');
            state.attendance[selectedDate][studentId] = {
                status: status,
                remarks: remarksVal
            };
            count++;
        }
    });
    
    if (count === 0) {
        showToast('No attendance statuses marked to save.', 'info');
        return;
    }
    
    saveAttendanceToStorage();
    showToast(`Saved attendance for ${count} students successfully!`, 'success');
}

// Quick marks helper
function quickMarkAll(status) {
    document.querySelectorAll('#table-attendance-marker tbody tr').forEach(tr => {
        const group = tr.querySelector('.status-pill-group');
        group.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        
        const targetBtn = group.querySelector(`.status-btn[data-status="${status}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            // Update row class
            tr.className = tr.className.replace(/status-marked-\w+/g, '').trim();
            tr.classList.add(`status-marked-${status}`);
            
        }
    });
    updateMarkSummaryBanner();
    showToast(`Quick-marked all loaded items as ${status === 'P' ? 'Present' : 'Absent'}`, 'info');
}

// ==========================================================================
// 7. Monthly Summary Report Sheet
// ==========================================================================
function populateReportFilters() {
    const classSelect = document.getElementById('report-class-select');
    if (!classSelect) return;
    
    const classes = [...new Set(state.students.map(s => s.class))].sort();
    
    const savedVal = classSelect.value;
    classSelect.innerHTML = '<option value="all">All Groups</option>';
    classes.forEach(c => {
        classSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
    classSelect.value = savedVal;
}

function renderMonthlyReport() {
    const table = document.getElementById('table-monthly-report');
    if (!table) return;
    
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    const selectedMonthStr = document.getElementById('report-month-select').value; // Format: YYYY-MM
    const selectedClass = document.getElementById('report-class-select').value;
    
    if (!selectedMonthStr) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Please select a month.</td></tr>';
        return;
    }
    
    // Parse Year and Month
    const [year, month] = selectedMonthStr.split('-').map(Number);
    
    // Days in Month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Update Printable titles
    document.getElementById('print-class-name').textContent = selectedClass === 'all' ? 'All Groups' : selectedClass;
    
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('print-month-name').textContent = monthName;
    
    // Generate Table Headers
    let headerRowHTML = `
        <tr>
            <th class="col-sticky-left" rowspan="2">Student Name</th>
            <th rowspan="2" style="font-size: 11px;">Class</th>
            <th colspan="${daysInMonth}">Days of Month</th>
            <th colspan="4">Summary (Days)</th>
            <th rowspan="2">%</th>
        </tr>
        <tr>
    `;
    
    for (let day = 1; day <= daysInMonth; day++) {
        headerRowHTML += `<th style="min-width: 24px; font-size: 10px; padding: 4px;">${day}</th>`;
    }
    
    headerRowHTML += `
            <th style="min-width: 24px; color: var(--status-present); padding: 4px;">P</th>
            <th style="min-width: 24px; color: var(--status-absent); padding: 4px;">A</th>
            <th style="min-width: 24px; color: var(--status-late); padding: 4px;">L</th>
            <th style="min-width: 24px; color: var(--status-excused); padding: 4px;">E</th>
        </tr>
    `;
    
    thead.innerHTML = headerRowHTML;
    
    // Filter Students
    let filteredStudents = state.students.filter(student => selectedClass === 'all' || student.class === selectedClass);
    
    // Sort
    filteredStudents.sort((a, b) => {
        if (a.class !== b.class) return a.class.localeCompare(b.class);
        return a.name.localeCompare(b.name);
    });
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${daysInMonth + 7}" class="text-center text-muted">No student records to display.</td></tr>`;
        return;
    }
    
    // Populate Grid
    filteredStudents.forEach(student => {
        let rowHTML = `
            <tr data-student-id="${student.id}">
                <td class="col-sticky-left"><strong>${student.name}</strong><br><span class="text-muted" style="font-size: 10px;">${student.id}</span></td>
                <td><span style="font-size: 11px; white-space: nowrap;">${student.class.replace('Year ', 'Y')}</span></td>
        `;
        
        let p = 0, a = 0, l = 0, e = 0;
        let totalMarked = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateRecord = state.attendance[dateStr] || {};
            const record = dateRecord[student.id];
            
            if (record) {
                totalMarked++;
                const s = record.status;
                if (s === 'P') { p++; rowHTML += `<td class="status-cell sc-p">P</td>`; }
                else if (s === 'A') { a++; rowHTML += `<td class="status-cell sc-a">A</td>`; }
                else if (s === 'L') { l++; rowHTML += `<td class="status-cell sc-l">L</td>`; }
                else if (s === 'E') { e++; rowHTML += `<td class="status-cell sc-e">E</td>`; }
            } else {
                rowHTML += `<td class="status-cell sc-empty">-</td>`;
            }
        }
        
        // Percent
        const percent = totalMarked > 0 ? Math.round(((p + l) / totalMarked) * 100) : 0;
        const percentColor = percent > 80 ? 'var(--status-present)' : (percent > 50 ? 'var(--status-late)' : 'var(--status-absent)');
        
        rowHTML += `
            <td style="font-weight: 600; color: var(--status-present);">${p}</td>
            <td style="font-weight: 600; color: var(--status-absent);">${a}</td>
            <td style="font-weight: 600; color: var(--status-late);">${l}</td>
            <td style="font-weight: 600; color: var(--status-excused);">${e}</td>
            <td style="font-weight: 800; color: ${percentColor};">${percent}%</td>
        </tr>
        `;
        
        tbody.innerHTML += rowHTML;
    });
}

// ==========================================================================
// 8. Import/Export Engine & CSV Handling
// ==========================================================================
function exportToCSV() {
    if (Object.keys(state.attendance).length === 0) {
        showToast('No attendance records to export.', 'error');
        return;
    }
    
    // Construct CSV rows
    let csvRows = [];
    // CSV Headers
    csvRows.push(['Date', 'StudentID', 'StudentName', 'Class', 'Gender', 'Status', 'Remarks'].join(','));
    
    // Sort dates
    const dates = Object.keys(state.attendance).sort();
    
    dates.forEach(dateStr => {
        const records = state.attendance[dateStr];
        state.students.forEach(student => {
            const record = records[student.id];
            if (record) {
                const row = [
                    dateStr,
                    student.id,
                    `"${student.name.replace(/"/g, '""')}"`,
                    `"${student.class.replace(/"/g, '""')}"`,
                    student.gender,
                    record.status,
                    `"${(record.remarks || '').replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(','));
            }
        });
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `setec_attendance_report_${state.currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Attendance report exported as CSV!', 'success');
}

// Temporary storage for preview imported students
let parsedImportedStudents = [];

function setupCSVImport() {
    const dragDrop = document.getElementById('csv-drag-drop');
    const fileInput = document.getElementById('csv-file-input');
    const confirmBtn = document.getElementById('btn-confirm-import');
    
    if (!dragDrop || !fileInput) return;
    
    // Trigger file dialog
    dragDrop.addEventListener('click', () => fileInput.click());
    
    // Dragover styles
    dragDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDrop.classList.add('dragover');
    });
    
    dragDrop.addEventListener('dragleave', () => {
        dragDrop.classList.remove('dragover');
    });
    
    dragDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDrop.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleSelectedCSV(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleSelectedCSV(fileInput.files[0]);
        }
    });
}

function handleSelectedCSV(file) {
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
        showToast('Please select a valid .csv file.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCSVText(text);
    };
    reader.readAsText(file);
}

function parseCSVText(text) {
    const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
    if (rows.length < 2) {
        showToast('CSV file is empty or missing header row.', 'error');
        return;
    }
    
    // Parse Headers
    const headers = rows[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    // Find column indexes
    const idIdx = headers.findIndex(h => h.includes('id') || h.includes('roll'));
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const classIdx = headers.findIndex(h => h.includes('class') || h.includes('section'));
    const genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('tel'));
    
    if (idIdx === -1 || nameIdx === -1 || classIdx === -1) {
        showToast('CSV missing key headers. Needs at least: StudentID, Name, Class', 'error');
        return;
    }
    
    parsedImportedStudents = [];
    const previewTbody = document.querySelector('#table-import-preview tbody');
    previewTbody.innerHTML = '';
    
    for (let i = 1; i < rows.length; i++) {
        // Simple CSV splitter that handles quoted strings
        const matches = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rows[i].split(',');
        const cols = matches.map(c => c.trim().replace(/^["']|["']$/g, ''));
        
        if (cols.length < 3) continue;
        
        const id = cols[idIdx] || '';
        const name = cols[nameIdx] || '';
        const className = cols[classIdx] || '';
        const gender = genderIdx !== -1 ? (cols[genderIdx] || 'Male') : 'Male';
        const contact = phoneIdx !== -1 ? (cols[phoneIdx] || '') : '';
        
        if (id && name && className) {
            const studentObj = { id, name, class: className, gender, contactNo: contact };
            parsedImportedStudents.push(studentObj);
            
            // Append preview row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${id}</code></td>
                <td>${name}</td>
                <td>${className}</td>
                <td>${gender}</td>
                <td>${contact || '-'}</td>
            `;
            previewTbody.appendChild(tr);
        }
    }
    
    if (parsedImportedStudents.length === 0) {
        showToast('No valid student rows could be parsed.', 'error');
        return;
    }
    
    // Show Preview & Enable Confirm
    document.getElementById('import-preview-count').textContent = parsedImportedStudents.length;
    document.getElementById('import-preview-section').style.display = 'block';
    document.getElementById('btn-confirm-import').disabled = false;
    showToast(`Loaded ${parsedImportedStudents.length} rows for preview.`, 'info');
}

function confirmCSVImport() {
    if (parsedImportedStudents.length === 0) return;
    
    let addedCount = 0;
    let updatedCount = 0;
    
    parsedImportedStudents.forEach(imported => {
        const existIdx = state.students.findIndex(s => s.id === imported.id);
        if (existIdx !== -1) {
            // Update details
            state.students[existIdx] = imported;
            updatedCount++;
        } else {
            // Add new
            state.students.push(imported);
            addedCount++;
        }
    });
    
    saveStudentsToStorage();
    
    // Close Modal & Reset
    closeModal('import-modal');
    
    // Refresh active views
    renderActiveView();
    
    showToast(`Import Success: Added ${addedCount}, Updated ${updatedCount} students.`, 'success');
    parsedImportedStudents = [];
}

// ==========================================================================
// 9. Event Listeners Setup & Modals Handling
// ==========================================================================
function setupEventListeners() {
    // 1. Modals Open
    const addBtn = document.getElementById('btn-add-student');
    if (addBtn) addBtn.addEventListener('click', () => openStudentModal());
    
    // 2. Modals Close
    const closeBtnEl = document.getElementById('btn-close-modal');
    if (closeBtnEl) closeBtnEl.addEventListener('click', () => closeModal('student-modal'));
    const cancelBtnEl = document.getElementById('btn-cancel-modal');
    if (cancelBtnEl) cancelBtnEl.addEventListener('click', () => closeModal('student-modal'));
    const closeImportBtn = document.getElementById('btn-close-import-modal');
    if (closeImportBtn) closeImportBtn.addEventListener('click', () => closeModal('import-modal'));
    const cancelImportBtn = document.getElementById('btn-cancel-import-modal');
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', () => closeModal('import-modal'));
    
    // 3. Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // 4. Student Form Submit (Add/Edit save)
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveStudentForm();
        });
    }
    
    // 5. Search / Filters keyups
    const searchInp = document.getElementById('student-search-input');
    if (searchInp) {
        searchInp.addEventListener('input', () => {
            state.studentsPagination.currentPage = 1;
            renderStudentsList();
        });
    }
    
    const classFilt = document.getElementById('student-class-filter');
    if (classFilt) {
        classFilt.addEventListener('change', () => {
            state.studentsPagination.currentPage = 1;
            renderStudentsList();
        });
    }
    
    // 6. Pagination Navigation click
    // 6. Pagination Navigation click
    const prevBtn = document.getElementById('btn-prev-page');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (state.studentsPagination.currentPage > 1) {
                state.studentsPagination.currentPage--;
                renderStudentsList();
            }
        });
    }
    
    const nextBtn = document.getElementById('btn-next-page');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            state.studentsPagination.currentPage++;
            renderStudentsList();
        });
    }
    
    // 7. Attendance Date & Class Change
    const attDate = document.getElementById('attendance-date');
    if (attDate) attDate.addEventListener('change', renderAttendanceMarker);
    
    const attClass = document.getElementById('attendance-class-select');
    if (attClass) attClass.addEventListener('change', renderAttendanceMarker);
    
    const markerSearch = document.getElementById('marker-search-input');
    if (markerSearch) markerSearch.addEventListener('input', renderAttendanceMarker);
    
    // 8. Attendance Mark Action
    const saveAttBtn = document.getElementById('btn-save-attendance');
    if (saveAttBtn) saveAttBtn.addEventListener('click', saveAttendance);
    const markPresBtn = document.getElementById('btn-mark-all-present');
    if (markPresBtn) markPresBtn.addEventListener('click', () => quickMarkAll('P'));
    const markAbsBtn = document.getElementById('btn-mark-all-absent');
    if (markAbsBtn) markAbsBtn.addEventListener('click', () => quickMarkAll('A'));
    
    // 9. Report Reload
    const refreshRepBtn = document.getElementById('btn-refresh-report');
    if (refreshRepBtn) refreshRepBtn.addEventListener('click', renderMonthlyReport);
    const repMonthSelect = document.getElementById('report-month-select');
    if (repMonthSelect) repMonthSelect.addEventListener('change', renderMonthlyReport);
    const repClassSelect = document.getElementById('report-class-select');
    if (repClassSelect) repClassSelect.addEventListener('change', renderMonthlyReport);
    
    // 10. CSV Import Drag-Drop confirmation
    const confirmImportBtn = document.getElementById('btn-confirm-import');
    if (confirmImportBtn) {
        setupCSVImport();
        confirmImportBtn.addEventListener('click', confirmCSVImport);
    }
}

function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) {
        m.classList.add('open');
        if (modalId === 'import-modal') {
            // Reset import state
            parsedImportedStudents = [];
            document.getElementById('import-preview-section').style.display = 'none';
            document.getElementById('btn-confirm-import').disabled = true;
            document.getElementById('table-import-preview').querySelector('tbody').innerHTML = '';
            document.getElementById('csv-file-input').value = '';
        }
    }
}

function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('open');
}

function saveStudentForm() {
    const originalId = document.getElementById('form-student-id-original').value;
    const id = document.getElementById('form-student-id').value.trim();
    const name = document.getElementById('form-student-name').value.trim();
    const gender = document.getElementById('form-student-gender').value;
    const className = document.getElementById('form-student-class').value.trim();
    const phone = document.getElementById('form-student-phone').value.trim();
    
    if (originalId) {
        // Update operation
        const idx = state.students.findIndex(s => s.id === originalId);
        if (idx !== -1) {
            state.students[idx] = { id: originalId, name, gender, class: className, contactNo: phone };
            saveStudentsToStorage();
            closeModal('student-modal');
            renderStudentsList();
            showToast('Student details updated!', 'success');
        }
    } else {
        // Add operation: check ID unique key constraint
        if (state.students.some(s => s.id.toLowerCase() === id.toLowerCase())) {
            alert(`Error: A student with ID "${id}" already exists. Please choose a unique Roll Number.`);
            return;
        }
        
        state.students.push({ id, name, gender, class: className, contactNo: phone });
        saveStudentsToStorage();
        closeModal('student-modal');
        renderStudentsList();
        showToast('Student added successfully!', 'success');
    }
}

// ==========================================================================
// 10. Utility Notification Toast
// ==========================================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastMsg.textContent = message;
    
    // Style adjustments based on type
    toast.className = 'toast'; // Reset
    toast.classList.add('show');
    
    if (type === 'success') {
        toast.style.borderLeftColor = 'var(--status-present)';
        toastIcon.className = 'fa-solid fa-circle-check toast-icon';
        toastIcon.style.color = 'var(--status-present)';
    } else if (type === 'error') {
        toast.style.borderLeftColor = 'var(--status-absent)';
        toastIcon.className = 'fa-solid fa-circle-xmark toast-icon';
        toastIcon.style.color = 'var(--status-absent)';
    } else if (type === 'info') {
        toast.style.borderLeftColor = 'var(--status-excused)';
        toastIcon.className = 'fa-solid fa-circle-info toast-icon';
        toastIcon.style.color = 'var(--status-excused)';
    }
    
    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
