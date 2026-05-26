const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const dataPath = path.join(__dirname, "data.json");
const roles = ["admin", "guru", "user"];
const statuses = ["Hadir", "Izin", "Sakit", "Alpa", "Belum Absen"];

function readData() {
  try {
    if (!fs.existsSync(dataPath)) {
      // Jika file data.json belum ada di server, otomatis buatkan struktur dasarnya
      const defaultData = { users: [], students: [] };
      fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch (error) {
    return { users: [], students: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    className: user.className,
    status: user.status
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { message: "OK" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const data = readData();

  try {
    if (request.method === "POST" && url.pathname === "/api/register") {
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "user").trim();
      const className = String(body.className || "-").trim() || "-";

      // 🔒 KHUSUS ADMIN: Tolak total jika mendaftar sebagai admin lewat halaman registrasi
      if (role === "admin") {
        sendJson(response, 403, { message: "Mendaftar sebagai admin ditolak" });
        return;
      }

      if (!name || !username || !password || !roles.includes(role)) {
        sendJson(response, 400, { message: "Data registrasi belum lengkap." });
        return;
      }

      if (data.users.some((user) => user.username === username)) {
        sendJson(response, 409, { message: "Username sudah digunakan." });
        return;
      }

      const user = {
        id: Date.now(),
        name,
        username,
        password,
        role, // Guru dan User biasa tetap bisa mendaftar normal sesuai input frontend
        className,
        status: "Belum Absen"
      };

      data.users.push(user);
      saveData(data);
      sendJson(response, 201, { message: "Registrasi berhasil.", user: publicUser(user) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(request);
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "").trim();

      const user = data.users.find((item) => {
        return item.username === username && item.password === password && item.role === role;
      });

      if (!user) {
        sendJson(response, 401, { message: "Username, password, atau role salah." });
        return;
      }

      sendJson(response, 200, { message: "Login berhasil.", user: publicUser(user) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/users") {
      sendJson(response, 200, data.users.map(publicUser));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/students") {
      sendJson(response, 200, data.students);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/students") {
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const className = String(body.className || "").trim();

      if (!name || !className) {
        sendJson(response, 400, { message: "Nama siswa dan kelas wajib diisi." });
        return;
      }

      const student = {
        id: Date.now(),
        name,
        className,
        status: "Belum Absen"
      };

      data.students.push(student);
      saveData(data);
      sendJson(response, 201, student);
      return;
    }

    if (request.method === "PUT" && url.pathname.startsWith("/api/students/")) {
      const id = Number(url.pathname.split("/")[3]);
      const body = await readBody(request);
      const status = String(body.status || "").trim();

      if (!statuses.includes(status)) {
        sendJson(response, 400, { message: "Status absensi tidak valid." });
        return;
      }

      const student = data.students.find((item) => item.id === id);

      if (!student) {
        sendJson(response, 404, { message: "Siswa tidak ditemukan." });
        return;
      }

      student.status = status;
      saveData(data);
      sendJson(response, 200, student);
      return;
    }

    if (request.method === "PUT" && url.pathname.startsWith("/api/users/")) {
      const id = Number(url.pathname.split("/")[3]);
      const body = await readBody(request);
      const status = String(body.status || "").trim();

      if (!statuses.includes(status)) {
        sendJson(response, 400, { message: "Status absensi tidak valid." });
        return;
      }

      const user = data.users.find((item) => item.id === id);

      if (!user) {
        sendJson(response, 404, { message: "User tidak ditemukan." });
        return;
      }

      user.status = status;
      saveData(data);
      sendJson(response, 200, publicUser(user));
      return;
    }

    sendJson(response, 404, { message: "Halaman API tidak ditemukan." });
  } catch (error) {
    sendJson(response, 500, { message: "Terjadi kesalahan server." });
  }
});

// KODE BARU (Mengikuti Port Dynamic dari Render):
const ACTUAL_PORT = process.env.PORT || PORT;

server.listen(ACTUAL_PORT, () => {
  console.log(`Backend absensi berjalan di port ${ACTUAL_PORT}`);
});