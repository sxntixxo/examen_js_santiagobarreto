 // Main application logic
 document.addEventListener('DOMContentLoaded', function() {
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
  
  // Set today's date as default
  const today = new Date();
  const todayFormatted = formatDate(today);
  datePicker.value = todayFormatted;
  
  // Tab switching
  loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
  });
  
  registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
  });
  
  // Check if user is logged in
  checkLoggedInStatus();
  
  // Event Listeners
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  datePicker.addEventListener('change', loadActivities);
  addActivityBtn.addEventListener('click', openActivityModal);
  closeBtn.addEventListener('click', closeActivityModal);
  activityForm.addEventListener('submit', saveActivity);
  
  // Initialize storage if needed
  initializeStorage();
  
  // Authentication Functions
  function handleLogin(e) {
      e.preventDefault();
      clearErrorMessages();
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      
      if (!email) {
          displayError('loginEmailError', 'Email es requerido');
          return;
      }
      
      if (!password) {
          displayError('loginPasswordError', 'Contraseña es requerida');
          return;
      }
      
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const user = users.find(u => u.email === email);
      
      if (!user || user.password !== password) {
          displayError('loginError', 'Email o contraseña incorrectos');
          return;
      }
      
      // Set current user
      localStorage.setItem('currentUser', JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email
      }));
      
      showAgendaSection();
  }
  
  function handleRegister(e) {
      e.preventDefault();
      clearErrorMessages();
      
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('registerConfirmPassword').value;
      
      if (!name) {
          displayError('registerNameError', 'Nombre es requerido');
          return;
      }
      
      if (!email) {
          displayError('registerEmailError', 'Email es requerido');
          return;
      }
      
      if (!isValidEmail(email)) {
          displayError('registerEmailError', 'Email no válido');
          return;
      }
      
      if (!password) {
          displayError('registerPasswordError', 'Contraseña es requerida');
          return;
      }
      
      if (password.length < 6) {
          displayError('registerPasswordError', 'La contraseña debe tener al menos 6 caracteres');
          return;
      }
      
      if (password !== confirmPassword) {
          displayError('registerConfirmPasswordError', 'Las contraseñas no coinciden');
          return;
      }
      
      const users = JSON.parse(localStorage.getItem('users')) || [];
      
      if (users.some(user => user.email === email)) {
          displayError('registerEmailError', 'Este email ya está registrado');
          return;
      }
      
      const newUser = {
          id: generateId(),
          name,
          email,
          password
      };
      
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      document.getElementById('registerSuccess').textContent = 'Registro exitoso. Ya puedes iniciar sesión.';
      registerForm.reset();
      
      // Switch to login tab after successful registration
      setTimeout(() => {
          loginTab.click();
          document.getElementById('registerSuccess').textContent = '';
      }, 2000);
  }
  
  function handleLogout(e) {
      e.preventDefault();
      localStorage.removeItem('currentUser');
      showAuthSection();
  }
  
  // Activity Functions
  function loadActivities() {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const selectedDate = datePicker.value;
      const activities = JSON.parse(localStorage.getItem('activities')) || [];
      
      // Filter activities by user and date
      const userActivities = activities.filter(activity => 
          activity.userId === currentUser.id && 
          activity.date === selectedDate
      );
      
      // Sort activities by start time
      userActivities.sort((a, b) => {
          return a.startTime.localeCompare(b.startTime);
      });
      
      // Clear the agenda list
      agendaList.innerHTML = '';
      
      if (userActivities.length === 0) {
          agendaList.innerHTML = '<p>No hay actividades programadas para esta fecha.</p>';
          return;
      }
      
      // Display activities
      userActivities.forEach(activity => {
          const card = createActivityCard(activity);
          agendaList.appendChild(card);
      });
  }
  
  function createActivityCard(activity) {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.dataset.id = activity.id;
      
      card.innerHTML = `
          <div class="activity-header">
              <div class="activity-title">${activity.title}</div>
              <div class="activity-time">${formatTime(activity.startTime)} - ${formatTime(activity.endTime)}</div>
          </div>
          <div class="activity-location">📍 ${activity.location}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-actions">
              <button class="edit-activity secondary" data-id="${activity.id}">Editar</button>
              <button class="delete-activity secondary" data-id="${activity.id}">Eliminar</button>
          </div>
      `;
      
      // Add event listeners for edit and delete buttons
      card.querySelector('.edit-activity').addEventListener('click', () => {
          editActivity(activity.id);
      });
      
      card.querySelector('.delete-activity').addEventListener('click', () => {
          deleteActivity(activity.id);
      });
      
      return card;
  }
  
  function openActivityModal(activityId = null) {
      document.getElementById('modalTitle').textContent = activityId ? 'Editar Actividad' : 'Nueva Actividad';
      document.getElementById('activityId').value = activityId || '';
      
      if (!activityId) {
          // New activity, set default date to the selected date
          document.getElementById('activityDate').value = datePicker.value;
          activityForm.reset();
          document.getElementById('activityDate').value = datePicker.value;
      } else {
          // Edit existing activity, load data
          const activities = JSON.parse(localStorage.getItem('activities')) || [];
          const activity = activities.find(a => a.id === activityId);
          
          if (activity) {
              document.getElementById('activityDate').value = activity.date;
              document.getElementById('activityTitle').value = activity.title;
              document.getElementById('activityDescription').value = activity.description;
              document.getElementById('activityLocation').value = activity.location;
              document.getElementById('activityStartTime').value = activity.startTime;
              document.getElementById('activityEndTime').value = activity.endTime;
          }
      }
      
      activityModal.style.display = 'block';
  }
  
  function closeActivityModal() {
      activityModal.style.display = 'none';
      clearErrorMessages();
  }
  
  function saveActivity(e) {
      e.preventDefault();
      clearErrorMessages();
      
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const activityId = document.getElementById('activityId').value;
      const date = document.getElementById('activityDate').value;
      const title = document.getElementById('activityTitle').value.trim();
      const description = document.getElementById('activityDescription').value.trim();
      const location = document.getElementById('activityLocation').value.trim();
      const startTime = document.getElementById('activityStartTime').value;
      const endTime = document.getElementById('activityEndTime').value;
      
      // Validation
      if (!date) {
          displayError('activityDateError', 'La fecha es requerida');
          return;
      }
      
      if (!title) {
          displayError('activityTitleError', 'El título es requerido');
          return;
      }
      
      if (!description) {
          displayError('activityDescriptionError', 'La descripción es requerida');
          return;
      }
      
      if (!location) {
          displayError('activityLocationError', 'La ubicación es requerida');
          return;
      }
      
      if (!startTime) {
          displayError('activityStartTimeError', 'La hora de inicio es requerida');
          return;
      }
      
      if (!endTime) {
          displayError('activityEndTimeError', 'La hora de finalización es requerida');
          return;
      }
      
      // Check if end time is after start time
      if (startTime >= endTime) {
          displayError('activityEndTimeError', 'La hora de finalización debe ser posterior a la hora de inicio');
          return;
      }
      
      const activities = JSON.parse(localStorage.getItem('activities')) || [];
      
      // Check for time conflicts with other activities
      const isEditingActivity = activityId !== '';
      const hasConflict = activities.some(activity => {
          // Skip the current activity being edited
          if (isEditingActivity && activity.id === activityId) {
              return false;
          }
          
          // Check only activities of the same user and date
          if (activity.userId === currentUser.id && activity.date === date) {
              // Check for time overlap
              return (
                  (startTime >= activity.startTime && startTime < activity.endTime) ||
                  (endTime > activity.startTime && endTime <= activity.endTime) ||
                  (startTime <= activity.startTime && endTime >= activity.endTime)
              );
          }
          
          return false;
      });
      
      if (hasConflict) {
          displayError('activityFormError', 'Esta actividad se cruza con otra existente en el mismo horario');
          return;
      }
      
      const newActivity = {
          id: activityId || generateId(),
          userId: currentUser.id,
          date,
          title,
          description,
          location,
          startTime,
          endTime
      };
      
      if (isEditingActivity) {
          // Update existing activity
          const activityIndex = activities.findIndex(a => a.id === activityId);
          activities[activityIndex] = newActivity;
      } else {
          // Add new activity
          activities.push(newActivity);
      }
      
      localStorage.setItem('activities', JSON.stringify(activities));
      
      closeActivityModal();
      
      // Update date picker if needed and reload activities
      if (date !== datePicker.value) {
          datePicker.value = date;
      }
      
      loadActivities();
  }
  
  function editActivity(activityId) {
      openActivityModal(activityId);
  }
  
  function deleteActivity(activityId) {
      if (confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
          const activities = JSON.parse(localStorage.getItem('activities')) || [];
          const filteredActivities = activities.filter(activity => activity.id !== activityId);
          
          localStorage.setItem('activities', JSON.stringify(filteredActivities));
          loadActivities();
      }
  }
  
  // Helper Functions
  function checkLoggedInStatus() {
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      
      if (currentUser) {
          showAgendaSection();
      } else {
          showAuthSection();
      }
  }
  
  function showAuthSection() {
      authSection.classList.remove('hidden');
      agendaSection.classList.add('hidden');
      logoutBtn.classList.add('hidden');
      
      // Clear forms
      loginForm.reset();
      registerForm.reset();
      clearErrorMessages();
  }
  
  function showAgendaSection() {
      authSection.classList.add('hidden');
      agendaSection.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      
      // Load activities for today
      loadActivities();
  }
  
  function clearErrorMessages() {
      const errorElements = document.querySelectorAll('.error-message');
      errorElements.forEach(element => {
          element.textContent = '';
      });
      
      const successElements = document.querySelectorAll('.success-message');
      successElements.forEach(element => {
          element.textContent = '';
      });
  }
  
  function displayError(elementId, message) {
      document.getElementById(elementId).textContent = message;
  }
  
  function isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
  }
  
  function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }
  
  function formatTime(timeString) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
  }
  
  function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  function initializeStorage() {
      if (!localStorage.getItem('users')) {
          localStorage.setItem('users', JSON.stringify([]));
      }
      
      if (!localStorage.getItem('activities')) {
          localStorage.setItem('activities', JSON.stringify([]));
      }
  }
});