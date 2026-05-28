const API_URL = "/api";
const attendanceStatuses = ["Hadir", "Izin", "Sakit", "Alpa"];

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const authPage = document.getElementById("authPage");
const dashboardPage = document.getElementById("dashboardPage");
const logoutBtn = document.getElementById("logoutBtn");
const studentForm = document.getElementById("studentForm");
const studentList = document.getElementById("studentList");
const userList = document.getElementById("userList");
const adminPanel = document.getElementById("adminPanel");
const studentFormPanel = document.getElementById("studentFormPanel");
const userPanel = document.getElementById("userPanel");
const attendancePanel = document.getElementById("attendancePanel");
const roleLabel = document.getElementById("roleLabel");
const dashboardTitle = document.getElementById("dashboardTitle");
const welcomeText = document.getElementById("welcomeText");
const myStatus = document.getElementById("myStatus");
const myAttendanceButtons = document.getElementById("myAttendanceButtons");

let currentUser = null;
let students = []; // Menyimpan data dari tabel students (Murid)
let users = [];    // Menyimpan data dari semua akun terdaftar (User/Guru/Admin)

function showTab(tabName) {
  const isLogin = tabName === "login";
  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("active", isLogin);
  registerForm.classList.toggle("active", !isLogin);
  loginMessage.textContent = "";
  registerMessage.textContent = "";
}

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Permintaan gagal.");
  }

  return data;
}

// Mengambil data terpusat agar kalkulasi Admin akurat
async function loadDashboardData() {
  // Ambil semua user untuk menghitung guru & menampilkan list admin
  users = await requestApi("/users");
  // Ambil data murid
  students = await requestApi("/students");

  if (currentUser.role === "admin") {
    renderUsers();
    renderStudents("Data Kehadiran Murid (Global)");
  } else if (currentUser.role === "guru") {
    renderStudents("Data Kehadiran Guru");
  } else if (currentUser.role === "user") {
    renderStudents("Data Kehadiran Murid");
  }

  updateSummary();
}

function setDashboardByRole() {
  const roleText = {
    admin: "Panel Admin",
    guru: "Panel Guru",
    user: "Panel Murid"
  };

  roleLabel.textContent = roleText[currentUser.role];
  dashboardTitle.textContent = `Halo, ${currentUser.name}`;
  
  const displayRole = currentUser.role === "user" ? "murid" : currentUser.role;
  welcomeText.textContent = `selamat menjalankan tugas sebagai ${displayRole}.`;

  adminPanel.classList.toggle("hidden", currentUser.role !== "admin");
  studentFormPanel.classList.toggle("hidden", currentUser.role === "user" || currentUser.role === "guru");
  userPanel.classList.toggle("hidden", currentUser.role !== "user" && currentUser.role !== "guru");
  
  attendancePanel.classList.remove("hidden");

  // Filter baris ringkasan di dashboard berdasarkan role
  const muridRow = document.getElementById("muridSummaryRow");
  const guruRow = document.getElementById("guruSummaryRow");

  if (currentUser.role === "admin") {
    if (muridRow) muridRow.style.setProperty("display", "grid", "important");
    if (guruRow) guruRow.style.setProperty("display", "grid", "important");
  } else if (currentUser.role === "guru") {
    if (muridRow) muridRow.style.setProperty("display", "none", "important");
    if (guruRow) guruRow.style.setProperty("display", "grid", "important");
  } else if (currentUser.role === "user") {
    if (muridRow) muridRow.style.setProperty("display", "grid", "important");
    if (guruRow) guruRow.style.setProperty("display", "none", "important");
  }

  renderMyAttendance();
  loadDashboardData();
}

function showDashboard() {
  authPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  setDashboardByRole();
}

function showAuth() {
  currentUser = null;
  authPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
  loginForm.reset();
  registerForm.reset();
  
  const loginPasswordInput = document.getElementById('loginPassword');
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');
  if (loginPasswordInput && toggleLoginPassword) {
    loginPasswordInput.type = 'password';
    toggleLoginPassword.className = 'fa-solid fa-eye';
  }

  const registerPasswordInput = document.getElementById('registerPassword');
  const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
  if (registerPasswordInput && toggleRegisterPassword) {
    registerPasswordInput.type = 'password';
    toggleRegisterPassword.className = 'fa-solid fa-eye';
  }
}

function renderUsers() {
  userList.innerHTML = "";

  if (users.length === 0) {
    userList.innerHTML = '<p class="empty-state">Belum ada akun terdaftar.</p>';
    return;
  }

  users.forEach((user) => {
    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <div>
        <p class="user-name">${user.name}</p>
        <p class="user-meta">@${user.username} - Kelas ${user.className} - Status ${user.status || 'Belum Absen'}</p>
      </div>
      <span class="badge">${user.role === "user" ? "murid" : user.role}</span>
    `;
    userList.appendChild(card);
  });
}

function renderStudents(titleText = "Data Kehadiran murid") {
  studentList.innerHTML = "";

  const tableTitle = document.querySelector("#attendancePanel h3");
  if (tableTitle) {
    tableTitle.textContent = titleText;
  }

  let displayList = [];
  if (currentUser.role === "guru") {
    displayList = users.filter(u => u.role === "guru");
  } else {
    displayList = students;
  }

  if (displayList.length === 0) {
    studentList.innerHTML = `<p class="empty-state">Belum ada data.</p>`;
    return;
  }

  displayList.forEach((item) => {
    const card = document.createElement("div");
    card.className = "student-card";

    const info = document.createElement("div");
    info.innerHTML = `
      <p class="student-name">${item.name}</p>
      <p class="student-meta">Kelas ${item.className} - Status: ${item.status || 'Belum Absen'}</p>
    `;

    card.appendChild(info);

    if (currentUser.role === "admin") {
      const actions = document.createElement("div");
      actions.className = "status-buttons";

      attendanceStatuses.forEach((status) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = status;
        button.classList.toggle("active", item.status === status);
        button.addEventListener("click", () => updateStudentStatus(item.id, status));
        actions.appendChild(button);
      });

      card.appendChild(actions);
    }

    studentList.appendChild(card);
  });
}

function renderMyAttendance() {
  if (currentUser.role === "admin") return; 
  
  myStatus.textContent = `Nama: ${currentUser.name} | Kelas: ${currentUser.className} | Status: ${currentUser.status || 'Belum Absen'}`;
  myAttendanceButtons.innerHTML = "";

  attendanceStatuses.forEach((status) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = status;
    button.classList.toggle("active", currentUser.status === status);
    button.addEventListener("click", () => updateMyStatus(status));
    myAttendanceButtons.appendChild(button);
  });
}

async function updateStudentStatus(id, status) {
  await requestApi(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });

  await loadDashboardData();
}

async function updateMyStatus(status) {
  currentUser = await requestApi(`/users/${currentUser.id}`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });

  renderMyAttendance();
  await loadDashboardData();
}

// REALTIME KALKULASI RINGKASAN
function updateSummary() {
  const mTotal = students.length;
  const mHadir = students.filter(s => s.status === "Hadir").length;

  const guruList = users.filter(u => u.role === "guru");
  const gTotal = guruList.length;
  const gHadir = guruList.filter(g => g.status === "Hadir").length;
  const gTidakHadir = guruList.filter(g => ["Izin", "Sakit", "Alpa"].includes(g.status)).length;

  if(document.getElementById("totalSiswa")) document.getElementById("totalSiswa").textContent = mTotal;
  if(document.getElementById("totalHadir")) document.getElementById("totalHadir").textContent = mHadir;
  if(document.getElementById("totalTidakHadir")) document.getElementById("totalTotalSiswa") 
  if(document.getElementById("totalTidakHadir")) document.getElementById("totalTidakHadir").textContent = mTotal - mHadir;

  if(document.getElementById("totalGuru")) document.getElementById("totalGuru").textContent = gTotal;
  if(document.getElementById("totalGuruHadir")) document.getElementById("totalGuruHadir").textContent = gHadir;
  if(document.getElementById("totalGuruTidakHadir")) document.getElementById("totalGuruTidakHadir").textContent = gTidakHadir;
}

loginTab.addEventListener("click", () => showTab("login"));
registerTab.addEventListener("click", () => showTab("register"));

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const role = document.getElementById("registerRole").value;
  const name = document.getElementById("registerName").value.trim();
  const className = document.getElementById("registerClass").value.trim() || "-";
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  try {
    await requestApi("/register", {
      method: "POST",
      body: JSON.stringify({ name, username, password, role, className })
    });

    registerMessage.textContent = "Registrasi berhasil. Silakan masuk.";
    registerMessage.classList.add("success");
    registerForm.reset();
    showTab("login");
  } catch (error) {
    registerMessage.textContent = error.message;
    registerMessage.classList.remove("success");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const role = document.getElementById("loginRole").value;
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const data = await requestApi("/login", {
      method: "POST",
      body: JSON.stringify({ username, password, role })
    });

    currentUser = data.user;
    loginMessage.textContent = "";
    showDashboard();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("studentName").value.trim();
  const className = document.getElementById("studentClass").value.trim();

  await requestApi("/students", {
    method: "POST",
    body: JSON.stringify({ name, className })
  });

  studentForm.reset();
  await loadDashboardData();
});

logoutBtn.addEventListener("click", showAuth);

function setupPasswordToggle(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const toggleIcon = document.getElementById(iconId);

  if (passwordInput && toggleIcon) {
    toggleIcon.addEventListener('click', function () {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      }
    });
  }
}

setupPasswordToggle('loginPassword', 'toggleLoginPassword');
setupPasswordToggle('registerPassword', 'toggleRegisterPassword');