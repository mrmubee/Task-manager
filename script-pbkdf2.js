/* Enhanced Task Manager with client-side PBKDF2 password hashing using Web Crypto API */
const authPanel = document.getElementById('auth');
const appPanel = document.getElementById('app');

// Auth elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const welcomeUser = document.getElementById('welcomeUser');
const logoutBtn = document.getElementById('logoutBtn');

// Task elements
const taskForm = document.getElementById('taskForm');
const titleInput = document.getElementById('title');
const dueInput = document.getElementById('due');
const detailsInput = document.getElementById('details');
const priorityInput = document.getElementById('priority');
const reminderInput = document.getElementById('reminder');
const taskList = document.getElementById('taskList');
const taskTpl = document.getElementById('taskTpl');
const search = document.getElementById('search');
const filter = document.getElementById('filter');
const clearCompletedBtn = document.getElementById('clearCompleted');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const upcoming = document.getElementById('upcoming');
const enableNotifications = document.getElementById('enableNotifications');
const autoSort = document.getElementById('autoSort');

const STORAGE_USERS = 'tm_users_v2';
const STORAGE_CURRENT = 'tm_current_user_v2';
const STORAGE_TASKS_PREFIX = 'tm_tasks_v2_';

let users = JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
let currentUser = localStorage.getItem(STORAGE_CURRENT) || null;
let tasks = []; // loaded per user

// PBKDF2 helpers (Web Crypto API)
async function genSalt(){ const arr = crypto.getRandomValues(new Uint8Array(16)); return btoa(String.fromCharCode(...arr)); }
async function deriveKeyBase64(password, salt, iterations=100_000, len=32){
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveBits']);
  const saltBuf = Uint8Array.from(atob(salt), c=>c.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt: saltBuf, iterations, hash:'SHA-256'}, passKey, len*8);
  const bytes = new Uint8Array(bits);
  let binary=''; for(let i=0;i<bytes.length;i++) binary+=String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function saveUsers(){ localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }
function setCurrentUser(email){ localStorage.setItem(STORAGE_CURRENT, email); currentUser = email; }
function loadTasks(){ tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS_PREFIX + currentUser) || '[]'); }
function saveTasks(){ localStorage.setItem(STORAGE_TASKS_PREFIX + currentUser, JSON.stringify(tasks)); }

function findUser(email){ return users.find(u=>u.email===email); }

// UI toggles
showSignup.addEventListener('click', ()=>{ document.getElementById('loginForm').classList.add('hidden'); document.getElementById('signupForm').classList.remove('hidden'); });
showLogin.addEventListener('click', ()=>{ document.getElementById('signupForm').classList.add('hidden'); document.getElementById('loginForm').classList.remove('hidden'); });

signupBtn.addEventListener('click', async ()=>{
  const name = signupName.value.trim(), email = signupEmail.value.trim().toLowerCase(), pw = signupPassword.value;
  if(!name || !email || !pw) return alert('Please fill all fields');
  if(findUser(email)) return alert('Account already exists');
  const salt = await genSalt();
  const hash = await deriveKeyBase64(pw, salt); // 100k iterations, 32 bytes
  users.push({name, email, hash, salt, iterations:100000});
  saveUsers();
  setCurrentUser(email);
  loadTasks();
  showApp();
});

loginBtn.addEventListener('click', async ()=>{
  const email = loginEmail.value.trim().toLowerCase(), pw = loginPassword.value;
  const u = findUser(email);
  if(!u) return alert('Invalid credentials');
  const derived = await deriveKeyBase64(pw, u.salt, u.iterations);
  if(derived !== u.hash) return alert('Invalid credentials');
  setCurrentUser(email);
  loadTasks();
  showApp();
});

logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem(STORAGE_CURRENT);
  currentUser = null;
  tasks = [];
  authPanel.classList.remove('hidden');
  appPanel.classList.add('hidden');
});

function showApp(){
  authPanel.classList.add('hidden');
  appPanel.classList.remove('hidden');
  welcomeUser.textContent = 'Logged in as: ' + (findUser(currentUser)?.name || currentUser);
  render();
  requestNotificationPermissionIfNeeded();
}

// Task rendering and logic (same as prior, adapted storage keys)
function formatDateTime(d){ if(!d) return ''; try{ const dt = new Date(d); return dt.toLocaleString(); }catch(e){return d} }

function render(){
  taskList.innerHTML='';
  const q = search.value.trim().toLowerCase();
  const f = filter.value;
  let filtered = tasks.filter(t=>{
    if(f==='active' && t.completed) return false;
    if(f==='completed' && !t.completed) return false;
    if(q && !(t.title.toLowerCase().includes(q) || (t.details||'').toLowerCase().includes(q))) return false;
    return true;
  });
  if(autoSort.checked){
    filtered.sort((a,b)=>{
      if(!a.due && !b.due) return 0;
      if(!a.due) return 1;
      if(!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
  }
  for(const t of filtered){
    const el = taskTpl.content.firstElementChild.cloneNode(true);
    el.dataset.id = t.id;
    el.dataset.priority = t.priority || 'medium';
    el.querySelector('.title').textContent = t.title;
    el.querySelector('.details').textContent = t.details || '';
    el.querySelector('.text-xs').textContent = t.due ? ('Due: '+formatDateTime(t.due)) : '';
    const chk = el.querySelector('.toggle');
    chk.checked = !!t.completed;
    if(t.completed) el.classList.add('completed');
    el.querySelector('.priority').textContent = (t.priority||'medium').toUpperCase();
    el.querySelector('.priority').classList.add('px-2','py-1','rounded','text-white');
    if(t.priority==='high') el.querySelector('.priority').classList.add('bg-red-500');
    if(t.priority==='medium') el.querySelector('.priority').classList.add('bg-yellow-500');
    if(t.priority==='low') el.querySelector('.priority').classList.add('bg-green-500');
    chk.addEventListener('change', ()=>{ t.completed = chk.checked; saveTasks(); render(); });
    el.querySelector('.deleteBtn').addEventListener('click', ()=>{
      if(!confirm('Delete task?')) return;
      tasks = tasks.filter(x=>x.id!==t.id); saveTasks(); render();
    });
    el.querySelector('.editBtn').addEventListener('click', ()=>{
      const newTitle = prompt('Title', t.title);
      if(newTitle===null) return;
      t.title = newTitle || t.title;
      const newDetails = prompt('Details', t.details||'');
      if(newDetails!==null) t.details = newDetails;
      const newDue = prompt('Due (YYYY-MM-DDTHH:MM)', t.due||'');
      if(newDue!==null) t.due = newDue;
      const newPriority = prompt('Priority (low, medium, high)', t.priority||'medium');
      if(newPriority!==null && ['low','medium','high'].includes(newPriority.toLowerCase())) t.priority = newPriority.toLowerCase();
      saveTasks(); render();
    });

    // drag handlers
    el.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', t.id);
      el.classList.add('opacity-60');
    });
    el.addEventListener('dragend', ()=> el.classList.remove('opacity-60'));

    taskList.appendChild(el);
  }

  // upcoming
  upcoming.innerHTML='';
  const up = tasks.filter(t=> t.due && !t.completed).sort((a,b)=> new Date(a.due)-new Date(b.due)).slice(0,6);
  for(const u of up){
    const li = document.createElement('li');
    li.textContent = `${u.title} — ${new Date(u.due).toLocaleString()}`;
    upcoming.appendChild(li);
  }
}

// Drag & drop reordering on the list container
taskList.addEventListener('dragover', (e)=>{ e.preventDefault(); });
taskList.addEventListener('drop', (e)=>{
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if(!id) return;
  const target = e.target.closest('li');
  const draggedIndex = tasks.findIndex(t=>t.id===id);
  if(draggedIndex===-1) return;
  let dropIndex;
  if(!target) dropIndex = tasks.length-1;
  else {
    const dropId = target.dataset.id;
    dropIndex = tasks.findIndex(t=>t.id===dropId);
  }
  const [item] = tasks.splice(draggedIndex,1);
  tasks.splice(dropIndex,0,item);
  saveTasks(); render();
});

// Add task
taskForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  if(!currentUser) return alert('Please login');
  const title = titleInput.value.trim();
  if(!title) return alert('Add a title');
  const task = {
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    title,
    details: detailsInput.value.trim(),
    due: dueInput.value || null,
    priority: priorityInput.value || 'medium',
    reminder: reminderInput.value || '',
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.push(task); saveTasks(); render(); taskForm.reset(); titleInput.focus();
});

// search/filter handlers
search.addEventListener('input', render);
filter.addEventListener('change', render);
clearCompletedBtn.addEventListener('click', ()=>{
  if(!confirm('Remove all completed tasks?')) return;
  tasks = tasks.filter(t=>!t.completed); saveTasks(); render();
});

// export/import
exportBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = (currentUser||'tasks') + '-tasks.json'; a.click(); URL.revokeObjectURL(url);
});

importFile.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const imported = JSON.parse(reader.result);
      if(!Array.isArray(imported)) throw new Error('Invalid file');
      for(const it of imported){
        it.id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        tasks.push(it);
      }
      saveTasks(); render(); alert('Imported '+imported.length+' tasks');
    }catch(err){ alert('Import failed: '+err.message) }
  };
  reader.readAsText(f);
});

// Reminders: check every minute for tasks with due date approaching based on reminder value
function requestNotificationPermissionIfNeeded(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default' && enableNotifications.checked){
    Notification.requestPermission().then(()=>{});
  }
}

setInterval(()=>{
  // run checks only if user enabled and logged in
  if(!currentUser) return;
  if(!enableNotifications.checked) return;
  const now = Date.now();
  for(const t of tasks){
    if(t.completed || !t.due || !t.reminder) continue;
    if(t.__notified) continue;
    const dueMs = new Date(t.due).getTime();
    const remindBefore = parseInt(t.reminder,10) * 60000; // minutes to ms
    if(isNaN(remindBefore)) continue;
    if(dueMs - now <= remindBefore && dueMs > now){
      const msg = `Reminder: ${t.title} — due ${new Date(t.due).toLocaleString()}`;
      try{
        if(Notification.permission === 'granted'){
          new Notification('Task Reminder', {body: msg});
        } else {
          alert(msg);
        }
      }catch(e){ alert(msg); }
      t.__notified = true;
      saveTasks();
    }
  }
}, 60 * 1000);

setTimeout(()=>{},2000);

// Initialization
function init(){
  if(currentUser){
    loadTasks();
    showApp();
  } else {
    authPanel.classList.remove('hidden');
    appPanel.classList.add('hidden');
  }
}
init();
