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
const studentList = document.getElementById("studentList");
const userList = document.getElementById("userList");
const adminPanel = document.getElementById("adminPanel");
const userPanel = document.getElementById("userPanel");
const attendancePanel = document.getElementById("attendancePanel");
const roleLabel = document.getElementById("roleLabel");
const dashboardTitle = document.getElementById("dashboardTitle");
const welcomeText = document.getElementById("welcomeText");
const myStatus = document.getElementById("myStatus");
const myAttendanceButtons = document.getElementById("myAttendanceButtons");

let currentUser = null;
let allUsersGlobal = []; // Menampung gabungan data dari server (admin + guru + murid)

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
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Permintaan gagal.");
  return data;
}

// 🔄 FUNGSI UTAMA AMBIL DATA: Mengambil data global terpusat dari backend
async function loadDashboardData() {
  allUsersGlobal = await requestApi("/users");

  const guruBox = document.getElementById("guruAttendanceBox");
  const studentBox = document.getElementById("studentAttendanceBox");
  const studentTitle = document.getElementById("studentBoxTitle");

  if (currentUser.role === "admin") {
    if (guruBox) guruBox.style.setProperty("display", "block", "important");
    if (studentBox) studentBox.style.setProperty("display", "block", "important");
    if (studentTitle) studentTitle.textContent = "Data Kehadiran Murid";
    
    renderUsersList();         // List kelola akun admin
    renderGuruAttendance();    // Kotak daftar guru
    renderStudentAttendance(); // Kotak daftar murid
  } 
  else if (currentUser.role === "guru") {
    if (guruBox) guruBox.style.setProperty("display", "block", "important");
    if (studentBox) studentBox.style.setProperty("display", "none", "important");
    renderGuruAttendance();
  } 
  else if (currentUser.role === "user") {
    if (guruBox) guruBox.style.setProperty("display", "none", "important");
    if (studentBox) studentBox.style.setProperty("display", "block", "important");
    if (studentTitle) studentTitle.textContent = "Data Kehadiran Murid";
    renderStudentAttendance();
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
  userPanel.classList.toggle("hidden", currentUser.role !== "user" && currentUser.role !== "guru");
  attendancePanel.classList.remove("hidden");

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
}

// Render data khusus list kelola akun di Panel Admin
function renderUsersList() {
  userList.innerHTML = "";
  if (allUsersGlobal.length === 0) {
    userList.innerHTML = '<p class="empty-state">Belum ada akun terdaftar.</p>';
    return;
  }

  allUsersGlobal.forEach((user) => {
    const card = document.createElement("div");
    card.className = "user-card";
    
    // Memastikan tanda @ bersih dan khusus admin tidak memunculkan kelas/status
    let metaText = "";
    if (user.role === "admin") {
      metaText = `${user.username}`; 
    } else {
      metaText = `${user.username} - Kelas ${user.className || "-"} - Status ${user.status || "Belum Absen"}`; 
    }

    card.innerHTML = `
      <div>
        <p class="user-name">${user.name}</p>
        <p class="user-meta">${metaText}</p>
      </div>
      <span class="badge">${user.role === "user" ? "murid" : user.role}</span>
    `;
    userList.appendChild(card);
  });
}

// RENDER DAFTAR GURU
function renderGuruAttendance() {
  const container = document.getElementById("guruList");
  if (!container) return;
  container.innerHTML = "";

  const listGuru = allUsersGlobal.filter(u => u.role === "guru");

  if (listGuru.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada data kehadiran guru.</p>';
    return;
  }

  listGuru.forEach((item) => {
    const card = document.createElement("div");
    card.className = "student-card";

    const info = document.createElement("div");
    info.innerHTML = `
      <p class="student-name">${item.name}</p>
      <p class="student-meta">Kelas: ${item.className || "-"} - Status: ${item.status || "Belum Absen"}</p>
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
        button.addEventListener("click", () => updateStatusByAdmin(item.id, "guru", status));
        actions.appendChild(button);
      });
      card.appendChild(actions);
    }
    container.appendChild(card);
  });
}

// RENDER DAFTAR MURID
function renderStudentAttendance() {
  const container = document.getElementById("studentList");
  if (!container) return;
  container.innerHTML = "";

  const listMurid = allUsersGlobal.filter(u => u.role === "user");

  if (listMurid.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada data kehadiran murid.</p>';
    return;
  }

  listMurid.forEach((item) => {
    const card = document.createElement("div");
    card.className = "student-card";

    const info = document.createElement("div");
    info.innerHTML = `
      <p class="student-name">${item.name}</p>
      <p class="student-meta">Kelas: ${item.className || "-"} - Status: ${item.status || "Belum Absen"}</p>
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
        button.addEventListener("click", () => updateStatusByAdmin(item.id, "user", status));
        actions.appendChild(button);
      });
      card.appendChild(actions);
    }
    container.appendChild(card);
  });
}

function renderMyAttendance() {
  if (currentUser.role === "admin") return; 
  
  myStatus.textContent = `Nama: ${currentUser.name} | Kelas: ${currentUser.className || "-"} | Status: ${currentUser.status || "Belum Absen"}`;
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

async function updateStatusByAdmin(id, role, status) {
  await requestApi(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status, role: role })
  });
  await loadDashboardData();
}

async function updateMyStatus(status) {
  const data = await requestApi(`/users/${currentUser.id}`, {
    method: "PUT",
    body: JSON.stringify({ status, role: currentUser.role })
  });

  currentUser = data; 
  renderMyAttendance();
  await loadDashboardData();
}

function updateSummary() {
  const listMurid = allUsersGlobal.filter(u => u.role === "user");
  const mTotal = listMurid.length;
  const mHadir = listMurid.filter(s => s.status === "Hadir").length;

  const listGuru = allUsersGlobal.filter(u => u.role === "guru");
  const gTotal = listGuru.length;
  const gHadir = listGuru.filter(g => g.status === "Hadir").length;

  if(document.getElementById("totalSiswa")) document.getElementById("totalSiswa").textContent = mTotal;
  if(document.getElementById("totalHadir")) document.getElementById("totalHadir").textContent = mHadir;
  if(document.getElementById("totalTidakHadir")) document.getElementById("totalTidakHadir").textContent = mTotal - mHadir;

  if(document.getElementById("totalGuru")) document.getElementById("totalGuru").textContent = gTotal;
  if(document.getElementById("totalGuruHadir")) document.getElementById("totalGuruHadir").textContent = gHadir;
  if(document.getElementById("totalGuruTidakHadir")) document.getElementById("totalGuruTidakHadir").textContent = gTotal - gHadir;
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

  if (!username.endsWith("@school.id")) {
    registerMessage.textContent = "Gagal: Harus menggunakan email resmi sekolah (@school.id)";
    registerMessage.classList.remove("success");
    return;
  }

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

logoutBtn.addEventListener("click", showAuth);

function setupPasswordToggle(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const toggleIcon = document.getElementById(iconId);
  if (passwordInput && toggleIcon) {
    toggleIcon.addEventListener('click', function () {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.className = 'fa-solid fa-eye-slash';
      } else {
        passwordInput.type = 'password';
        this.className = 'fa-solid fa-eye';
      }
    });
  }
}
setupPasswordToggle('loginPassword', 'toggleLoginPassword');
setupPasswordToggle('registerPassword', 'toggleRegisterPassword');