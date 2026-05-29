const http = require("http");
const { URL } = require("url");
const { createClient } = require("@supabase/supabase-js");

// ⚠️ DATA URL DAN KEY SUPABASE KAMU:
const SUPABASE_URL = "https://duiatmcdksxdmpidvcjl.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_IUlSndW5GW-bChhtG85gvA_D4Nh0ME-"; 

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

// 🛠️ PERBAIKAN 1: Logika penyaringan data publik berdasarkan role
function publicUser(user, activeRole) {
  const currentRole = user.role || activeRole;
  
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: currentRole, 
    // Jika admin, potong atau kosongkan data kelas dan status absensinya
    className: currentRole === "admin" ? null : (user.class_name || "-"),
    status: currentRole === "admin" ? null : (user.status || "Belum Absen")
  };
}

// Menentukan nama tabel sesuai request kamu (Bahasa Indonesia tanpa 's')
function getTableName(role) {
  if (role === "admin") return "admin";
  if (role === "guru") return "guru";
  return "murid"; // Jika role bernilai "user" (murid)
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { message: "OK" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    // 1. REGISTRASI GURU / MURID
    if (request.method === "POST" && url.pathname === "/api/register") {
      const body = await readBody(request);
      const name = String(body.name || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "user").trim();
      const className = String(body.className || "-").trim() || "-";

      if (role === "admin") {
        return sendJson(response, 403, { message: "Mendaftar sebagai admin ditolak." });
      }

      if (!name || !username || !password || !roles.includes(role)) {
        return sendJson(response, 400, { message: "Data registrasi belum lengkap." });
      }

      if (!username.endsWith("@school.id")) {
        return sendJson(response, 400, { message: "Pendaftaran ditolak. Harus menggunakan email resmi sekolah (@school.id)" });
      }

      const targetTable = getTableName(role);

      const { data: existingUser } = await supabase
        .from(targetTable)
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (existingUser) {
        return sendJson(response, 409, { message: "Username sudah digunakan." });
      }

      const { data: newUser, error } = await supabase
        .from(targetTable)
        .insert([{ 
          name, 
          username, 
          password, 
          class_name: className, 
          status: "Belum Absen",
          role: role
        }])
        .select()
        .single();

      if (error) throw error;

      return sendJson(response, 201, { message: "Registrasi berhasil.", user: publicUser(newUser, role) });
    }

    // 2. LOGIN MULTI-TABEL
    if (request.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(request);
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "").trim();

      if (!roles.includes(role)) {
        return sendJson(response, 400, { message: "Role tidak valid." });
      }

      const targetTable = getTableName(role);

      const { data: user } = await supabase
        .from(targetTable)
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle();

      if (!user) {
        return sendJson(response, 401, { message: "Username, password, atau role salah." });
      }

      return sendJson(response, 200, { message: "Login berhasil.", user: publicUser(user, role) });
    }

    // 3. GET ALL USERS (Menggabungkan isi tabel admin, guru, murid)
    if (request.method === "GET" && url.pathname === "/api/users") {
      const { data: dataAdmin } = await supabase.from("admin").select("*");
      const { data: dataGuru } = await supabase.from("guru").select("*");
      const { data: dataMurid } = await supabase.from("murid").select("*");

      // 🛠️ PERBAIKAN 2: Membersihkan paksaan mapping data kosong bawaan lama
      const mapAdmin = (dataAdmin || []).map(u => ({ ...u, role: "admin" }));
      const mapGuru = (dataGuru || []).map(u => ({ ...u, role: "guru" }));
      const mapMurid = (dataMurid || []).map(u => ({ ...u, role: "user" }));

      const combinedList = [...mapAdmin, ...mapGuru, ...mapMurid];
      
      return sendJson(response, 200, combinedList.map(u => publicUser(u, u.role)));
    }

    // 4. UPDATE STATUS ABSENSI (PUT)
    if (request.method === "PUT" && url.pathname.startsWith("/api/users/")) {
      const id = Number(url.pathname.split("/")[3]);
      const body = await readBody(request);
      const status = String(body.status || "").trim();
      const role = String(body.role || "user").trim();

      if (!statuses.includes(status)) {
        return sendJson(response, 400, { message: "Status absensi tidak valid." });
      }

      const targetTable = getTableName(role);

      const { data: updatedUser, error } = await supabase
        .from(targetTable)
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error || !updatedUser) {
        return sendJson(response, 404, { message: "Data tidak ditemukan." });
      }

      return sendJson(response, 200, publicUser(updatedUser, role));
    }

    sendJson(response, 404, { message: "Halaman API tidak ditemukan." });
  } catch (error) {
    console.error("Server Error:", error);
    sendJson(response, 500, { message: "Terjadi kesalahan internal pada server." });
  }
});

module.exports = server;