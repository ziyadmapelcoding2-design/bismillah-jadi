const http = require("http");
const { URL } = require("url");
const { createClient } = require("@supabase/supabase-js");

// ⚠️ MASUKKAN DATA URL DAN KEY SUPABASE KAMU DI SINI:
const SUPABASE_URL = "https://duiatmcdksxdmpidvcjl.supabase.co"; // Alamat rumah database kamu
const SUPABASE_KEY = "sb_publishable_IUlSndW5GW-bChhtG85gvA_D4Nh0ME-"; // Masukkan kunci sb_publishable_... kamu di sini

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const roles = ["admin", "guru", "user"];
const statuses = ["Hadir", "Izin", "Sakit", "Alpa", "Belum Absen"];

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
    request.on("data", (chunk) => { body += chunk.toString(); });
    request.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  });
}

// Menyesuaikan format keluaran user agar aman dan konsisten dengan frontend kamu
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    className: user.class_name, // Mengubah dari snake_case database ke camelCase frontend
    status: user.status
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { message: "OK" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    // 1. REGISTRASI USER/GURU
    if (request.method === "POST" && url.pathname === "/api/register") {
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "user").trim();
      const className = String(body.className || "-").trim() || "-";

      // 🔒 KHUSUS ADMIN: Tolak total jika mendaftar sebagai admin lewat halaman registrasi
      if (role === "admin") {
        return sendJson(response, 403, { message: "Mendaftar sebagai admin ditolak" });
      }

      if (!name || !username || !password || !roles.includes(role)) {
        return sendJson(response, 400, { message: "Data registrasi belum lengkap." });
      }

      // Cek apakah username sudah ada di database Supabase
      const { data: existingUser } = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (existingUser) {
        return sendJson(response, 409, { message: "Username sudah digunakan." });
      }

      // Simpan data user baru ke cloud Supabase
      const { data: newUser, error } = await supabase
        .from("users")
        .insert([{ name, username, password, role, class_name: className }])
        .select()
        .single();

      if (error) throw error;

      return sendJson(response, 201, { message: "Registrasi berhasil.", user: publicUser(newUser) });
    }

    // 2. LOGIN USER / GURU / ADMIN
    if (request.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(request);
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "").trim();

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .eq("role", role)
        .maybeSingle();

      if (!user) {
        return sendJson(response, 401, { message: "Username, password, atau role salah." });
      }

      return sendJson(response, 200, { message: "Login berhasil.", user: publicUser(user) });
    }

    // 3. GET ALL USERS
    if (request.method === "GET" && url.pathname === "/api/users") {
      const { data: users } = await supabase.from("users").select("*");
      return sendJson(response, 200, (users || []).map(publicUser));
    }

    // 4. GET ALL STUDENTS
    if (request.method === "GET" && url.pathname === "/api/students") {
      const { data: students } = await supabase.from("students").select("*");
      
      // Menyesuaikan format kembalian agar key kelas berupa className sesuai kebutuhan frontend
      const formattedStudents = (students || []).map(student => ({
        id: student.id,
        name: student.name,
        className: student.class_name,
        status: student.status
      }));

      return sendJson(response, 200, formattedStudents);
    }

    // 5. POST NEW STUDENT
    if (request.method === "POST" && url.pathname === "/api/students") {
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const className = String(body.className || "").trim();

      if (!name || !className) {
        return sendJson(response, 400, { message: "Nama siswa dan kelas wajib diisi." });
      }

      const { data: student, error } = await supabase
        .from("students")
        .insert([{ name, class_name: className }])
        .select()
        .single();

      if (error) throw error;

      return sendJson(response, 201, {
        id: student.id,
        name: student.name,
        className: student.class_name,
        status: student.status
      });
    }

    // 6. UPDATE STATUS STUDENT (PUT)
    if (request.method === "PUT" && url.pathname.startsWith("/api/students/")) {
      const id = Number(url.pathname.split("/")[3]);
      const body = await readBody(request);
      const status = String(body.status || "").trim();

      if (!statuses.includes(status)) {
        return sendJson(response, 400, { message: "Status absensi tidak valid." });
      }

      const { data: student, error } = await supabase
        .from("students")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error || !student) {
        return sendJson(response, 404, { message: "Siswa tidak ditemukan." });
      }

      return sendJson(response, 200, {
        id: student.id,
        name: student.name,
        className: student.class_name,
        status: student.status
      });
    }

    // 7. UPDATE STATUS USER (PUT)
    if (request.method === "PUT" && url.pathname.startsWith("/api/users/")) {
      const id = Number(url.pathname.split("/")[3]);
      const body = await readBody(request);
      const status = String(body.status || "").trim();

      if (!statuses.includes(status)) {
        return sendJson(response, 400, { message: "Status absensi tidak valid." });
      }

      const { data: user, error } = await supabase
        .from("users")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error || !user) {
        return sendJson(response, 404, { message: "User tidak ditemukan." });
      }

      return sendJson(response, 200, publicUser(user));
    }

    sendJson(response, 404, { message: "Halaman API tidak ditemukan." });
  } catch (error) {
    sendJson(response, 500, { message: "Terjadi kesalahan server." });
  }
});

module.exports = server;