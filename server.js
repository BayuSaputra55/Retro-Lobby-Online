const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 3000;
const rooms = new Map();
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, service: "retro-lobby", rooms: rooms.size }));

function cleanName(value) {
  return String(value || "Player").trim().replace(/[<>\\u0000-\\u001f]/g, "").slice(0, 20) || "Player";
}
function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from(crypto.randomBytes(5), b => chars[b % chars.length]).join("");
  } while (rooms.has(code));
  return code;
}
function publicRoom(room) {
  return {
    code: room.code,
    game: room.game,
    mode: room.mode,
    status: room.status,
    createdAt: room.createdAt,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, role: p.role, connected: true }))
  };
}
function emitRoom(room) {
  io.to(room.code).emit("room:update", publicRoom(room));
}
function removePlayer(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.data.roomCode = null;
  if (!room) return;
  const player = room.players.get(socket.id);
  room.players.delete(socket.id);
  if (player) {
    io.to(code).emit("room:notice", `${player.name} keluar dari room.`);
  }
  if (room.players.size === 0) {
    rooms.delete(code);
    return;
  }
  if (![...room.players.values()].some(p => p.role === "host")) {
    const next = room.players.values().next().value;
    if (next) next.role = "host";
  }
  emitRoom(room);
}
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      io.to(code).emit("room:closed", "Room kedaluwarsa setelah 6 jam.");
      rooms.delete(code);
    }
  }
}, 60_000).unref();

io.on("connection", socket => {
  socket.on("room:create", (payload = {}, reply = () => {}) => {
    removePlayer(socket);
    const room = {
      code: makeCode(),
      game: "Pokémon Quetzal (GBA)",
      mode: ["trade", "battle", "coop"].includes(payload.mode) ? payload.mode : "trade",
      status: "waiting",
      createdAt: Date.now(),
      players: new Map()
    };
    const player = { id: socket.id, name: cleanName(payload.name), role: "host" };
    room.players.set(socket.id, player);
    rooms.set(room.code, room);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    reply({ ok: true, room: publicRoom(room) });
    emitRoom(room);
    io.to(room.code).emit("room:notice", `${player.name} membuat room.`);
  });

  socket.on("room:join", (payload = {}, reply = () => {}) => {
    removePlayer(socket);
    const code = String(payload.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    const room = rooms.get(code);
    if (!room) return reply({ ok: false, error: "Room tidak ditemukan atau sudah ditutup." });
    if (room.players.size >= 2) return reply({ ok: false, error: "Room penuh. Prototipe ini membatasi 2 pemain." });
    const player = { id: socket.id, name: cleanName(payload.name), role: "guest" };
    room.players.set(socket.id, player);
    socket.join(code);
    socket.data.roomCode = code;
    reply({ ok: true, room: publicRoom(room) });
    emitRoom(room);
    io.to(code).emit("room:notice", `${player.name} bergabung.`);
  });

  socket.on("room:leave", () => removePlayer(socket));
  socket.on("room:start", reply => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player || player.role !== "host") return reply?.({ ok: false, error: "Hanya host yang dapat memulai sesi." });
    if (room.players.size < 2) return reply?.({ ok: false, error: "Tunggu satu teman bergabung dulu." });
    room.status = "ready";
    emitRoom(room);
    io.to(room.code).emit("room:notice", "Kedua pemain hadir. Ini hanya status lobby; game belum tersinkron.");
    reply?.({ ok: true });
  });
  socket.on("room:chat", (payload = {}) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player) return;
    const message = String(payload.message || "").trim().replace(/[<>\\u0000-\\u001f]/g, "").slice(0, 240);
    if (!message) return;
    io.to(room.code).emit("room:chat", { name: player.name, message, at: Date.now() });
  });
  socket.on("disconnect", () => removePlayer(socket));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Retro Lobby listening on http://localhost:${PORT}`);
});
