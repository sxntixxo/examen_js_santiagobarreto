// Main application logic
// index.js corregido y completo

document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const authSection = document.getElementById('authSection');
  const agendaSection = document.getElementById('agendaSection');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const datePicker = document.getElementById('datePicker');
  const addActivityBtn = document.getElementById('addActivityBtn');
  const activityModal = document.getElementById('activityModal');
  const activityForm = document.getElementById('activityForm');
  const closeBtn = document.querySelector('.close');
  const agendaList = document.getElementById('agendaList');

  // Agregar comportamiento a las pestañas
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });


  let db;
  const DB_NAME = 'agendaPersonalDB';
  const DB_VERSION = 1;

  function initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => {
        db = event.target.result;
        db.onerror = (event) => alert('DB Error: ' + event.target.error);
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('activities')) {
          const activitiesStore = db.createObjectStore('activities', { keyPath: 'id' });
          activitiesStore.createIndex('userId', 'userId', { unique: false });
          activitiesStore.createIndex('date', 'date', { unique: false });
          activitiesStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
        }
      };
    });
  }

  async function addUser(user) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.add(user);
      req.onsuccess = () => resolve(user);
      req.onerror = (e) => reject(e);
    });
  }

  async function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const index = tx.objectStore('users').index('email');
      const req = index.get(email);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  }

  async function addActivity(activity) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activities', 'readwrite');
      const store = tx.objectStore('activities');
      const req = store.add(activity);
      req.onsuccess = () => resolve(activity);
      req.onerror = (e) => reject(e);
    });
  }

  async function updateActivity(activity) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activities', 'readwrite');
      const store = tx.objectStore('activities');
      const req = store.put(activity);
      req.onsuccess = () => resolve(activity);
      req.onerror = (e) => reject(e);
    });
  }

  async function deleteActivityById(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activities', 'readwrite');
      const store = tx.objectStore('activities');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  }

  async function getActivityById(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activities', 'readonly');
      const store = tx.objectStore('activities');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  }

  async function getActivitiesByUserAndDate(userId, date) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activities', 'readonly');
      const index = tx.objectStore('activities').index('userId_date');
      const req = index.getAll([userId, date]);
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      req.onerror = (e) => reject(e);
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function formatTime(time) {
    const [h, m] = time.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'pm' : 'am'}`;
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function displayError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearErrorMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.textContent = '');
  }

  async function initApp() {
    try {
      await initializeDB();
      const today = new Date();
      datePicker.value = formatDate(today);
      checkLoggedInStatus();
    } catch (err) {
      console.error('Error al inicializar la aplicación:', err);
      alert('No se pudo inicializar correctamente.');
    }
  }

  function checkLoggedInStatus() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
      showAgendaSection();
      loadActivities();
    } else {
      showAuthSection();
    }
  }

  function showAgendaSection() {
    authSection.classList.add('hidden');
    agendaSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  }

  function showAuthSection() {
    authSection.classList.remove('hidden');
    agendaSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  datePicker.addEventListener('change', loadActivities);
  addActivityBtn.addEventListener('click', () => openActivityModal());
  closeBtn.addEventListener('click', () => activityModal.style.display = 'none');
  activityForm.addEventListener('submit', saveActivity);

  async function handleLogin(e) {
    e.preventDefault();
    clearErrorMessages();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email) return displayError('loginEmailError', 'Email requerido');
    if (!password) return displayError('loginPasswordError', 'Contraseña requerida');
    try {
      const user = await getUserByEmail(email);
      if (!user || user.password !== password) return displayError('loginError', 'Credenciales inválidas');
      localStorage.setItem('currentUser', JSON.stringify(user));
      showAgendaSection();
      loadActivities();
    } catch (err) {
      console.error(err);
      displayError('loginError', 'Error de login');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    clearErrorMessages();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirmPassword').value;
    if (!name || !email || !password || !confirm) return displayError('registerError', 'Todos los campos son obligatorios');
    if (password !== confirm) return displayError('registerConfirmPasswordError', 'Las contraseñas no coinciden');
    try {
      const exists = await getUserByEmail(email);
      if (exists) return displayError('registerEmailError', 'El email ya está registrado');
      await addUser({ id: generateId(), name, email, password });
      document.getElementById('registerSuccess').textContent = 'Registro exitoso. Puedes iniciar sesión.';
      registerForm.reset();
    } catch (err) {
      console.error(err);
      displayError('registerError', 'Error en el registro');
    }
  }

  function handleLogout() {
    localStorage.removeItem('currentUser');
    showAuthSection();
  }

  async function openActivityModal(id = '') {
    activityForm.reset();
    clearErrorMessages();
    document.getElementById('activityId').value = id;
    activityModal.style.display = 'block';
    if (id) {
      const activity = await getActivityById(id);
      document.getElementById('activityTitle').value = activity.title;
      document.getElementById('activityDescription').value = activity.description;
      document.getElementById('activityLocation').value = activity.location;
      document.getElementById('activityDate').value = activity.date;
      document.getElementById('activityStartTime').value = activity.startTime;
      document.getElementById('activityEndTime').value = activity.endTime;
    }
  }

  async function saveActivity(e) {
    e.preventDefault();
    clearErrorMessages();
    const id = document.getElementById('activityId').value || generateId();
    const title = document.getElementById('activityTitle').value.trim();
    const description = document.getElementById('activityDescription').value.trim();
    const location = document.getElementById('activityLocation').value.trim();
    const date = document.getElementById('activityDate').value;
    const startTime = document.getElementById('activityStartTime').value;
    const endTime = document.getElementById('activityEndTime').value;
    if (!title || !date || !startTime || !endTime) return displayError('activityFormError', 'Todos los campos son obligatorios');
    if (startTime >= endTime) return displayError('activityEndTimeError', 'La hora final debe ser posterior');

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const activity = { id, userId: user.id, title, description, location, date, startTime, endTime };
    try {
      if (document.getElementById('activityId').value) {
        await updateActivity(activity);
      } else {
        await addActivity(activity);
      }
      activityModal.style.display = 'none';
      loadActivities();
    } catch (err) {
      displayError('activityFormError', 'Error al guardar actividad');
    }
  }

  async function loadActivities() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const date = datePicker.value;
    const activities = await getActivitiesByUserAndDate(user.id, date);
    agendaList.innerHTML = '';
  
    if (!activities.length) {
      agendaList.innerHTML = '<p>No hay actividades.</p>';
      return;
    }
  
    for (const act of activities) {
      const div = document.createElement('div');
      div.className = 'activity-card';
  
      div.innerHTML = `
        <div><strong>${act.title}</strong> (${formatTime(act.startTime)} - ${formatTime(act.endTime)})</div>
        <div>${act.description}</div>
        <div>📍 ${act.location}</div>
        <div class="activity-actions">
          <button class="edit-btn">Editar</button>
          <button class="delete-btn">Eliminar</button>
        </div>
      `;
  
      // Asignar eventos correctamente
      div.querySelector('.edit-btn').addEventListener('click', () => openActivityModal(act.id));
      div.querySelector('.delete-btn').addEventListener('click', () => deleteActivity(act.id));
  
      agendaList.appendChild(div);
    }
  }
  

  async function deleteActivity(id) {
    if (confirm('¿Estás seguro de eliminar esta actividad?')) {
      await deleteActivityById(id);
      loadActivities();
    }
  }

  initApp();
});
