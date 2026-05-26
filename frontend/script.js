const API_URL = "http://localhost:3000/api";
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
let students = [];
let users = [];

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

async function loadStudents() {
  students = await requestApi("/students");
  renderStudents();
}

async function loadUsers() {
  users = await requestApi("/users");
  renderUsers();
}

function setDashboardByRole() {
  const roleText = {
    admin: "Panel Admin",
    guru: "Panel Guru",
    user: "Panel Murid"
  };

  roleLabel.textContent = roleText[currentUser.role];
  dashboardTitle.textContent = `Halo, ${currentUser.name}`;
  welcomeText.textContent = `Login sebagai ${currentUser.role}.`;

  adminPanel.classList.toggle("hidden", currentUser.role !== "admin");
  studentFormPanel.classList.toggle("hidden", currentUser.role === "user");
  userPanel.classList.toggle("hidden", currentUser.role !== "user");
  attendancePanel.classList.toggle("hidden", false);

  if (currentUser.role === "admin") {
    loadUsers();
  }

  if (currentUser.role === "user") {
    renderMyAttendance();
  }
}

function showDashboard() {
  authPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  setDashboardByRole();
  loadStudents();
}

function showAuth() {
  currentUser = null;
  authPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
  loginForm.reset();
  registerForm.reset();
  
  // Reset tampilan icon mata kembali ke bentuk semula (tertutup/bulat) saat log out
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
        <p class="user-meta">@${user.username} - Kelas ${user.className} - Status ${user.status}</p>
      </div>
      <span class="badge">${user.role}</span>
    `;
    userList.appendChild(card);
  });
}

function renderStudents() {
  studentList.innerHTML = "";

  if (students.length === 0) {
    studentList.innerHTML = '<p class="empty-state">Belum ada data siswa.</p>';
    updateSummary();
    return;
  }

  students.forEach((student) => {
    const card = document.createElement("div");
    card.className = "student-card";

    const info = document.createElement("div");
    info.innerHTML = `
      <p class="student-name">${student.name}</p>
      <p class="student-meta">Kelas ${student.className} - Status: ${student.status}</p>
    `;

    card.appendChild(info);

    if (currentUser.role !== "user") {
      const actions = document.createElement("div");
      actions.className = "status-buttons";

      attendanceStatuses.forEach((status) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = status;
        button.classList.toggle("active", student.status === status);
        button.addEventListener("click", () => updateStudentStatus(student.id, status));
        actions.appendChild(button);
      });

      card.appendChild(actions);
    }

    studentList.appendChild(card);
  });

  updateSummary();
}

function renderMyAttendance() {
  myStatus.textContent = `Nama: ${currentUser.name} | Kelas: ${currentUser.className} | Status: ${currentUser.status}`;
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

  await loadStudents();
}

async function updateMyStatus(status) {
  currentUser = await requestApi(`/users/${currentUser.id}`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });

  renderMyAttendance();

  if (currentUser.role === "admin") {
    await loadUsers();
  }
}

function updateSummary() {
  const totalSiswa = students.length;
  const totalHadir = students.filter((student) => student.status === "Hadir").length;
  const totalTidakHadir = students.filter((student) => {
    return ["Izin", "Sakit", "Alpa"].includes(student.status);
  }).length;

  document.getElementById("totalSiswa").textContent = totalSiswa;
  document.getElementById("totalHadir").textContent = totalHadir;
  document.getElementById("totalTidakHadir").textContent = totalTidakHadir;
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
  await loadStudents();
});

logoutBtn.addEventListener("click", showAuth);


// =======================================================
// 👁️ KODE BARU: LOGIKA TOMBOL MATA (FONT AWESOME MODERN)
// =======================================================

function setupPasswordToggle(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const toggleIcon = document.getElementById(iconId);

  if (passwordInput && toggleIcon) {
    toggleIcon.addEventListener('click', function () {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        // Ubah icon mata menjadi coret (slash)
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        // Kembalikan icon mata menjadi biasa
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      }
    });
  }
}

// Menjalankan fungsi mata untuk kedua form (Masuk & Pendaftaran)
setupPasswordToggle('loginPassword', 'toggleLoginPassword');
setupPasswordToggle('registerPassword', 'toggleRegisterPassword');