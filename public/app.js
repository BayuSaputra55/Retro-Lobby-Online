const socket = io();
const $ = s => document.querySelector(s);
const playerName = $("#playerName");
const mode = $("#mode");
const roomPanel = $("#roomPanel");
const errorBox = $("#error");
let currentRoom = null;
let emulatorLoaded = false;
let currentObjectUrl = null;

function showError(message = "") { errorBox.textContent = message; }
function getName() { return playerName.value.trim() || "Player"; }
function modeLabel(value) { return ({ trade: "Trade Pokémon", battle: "Battle Pokémon", coop: "Co-op / MPlayer" })[value] || value; }
function setConnected(ok) {
  $("#connectionLabel").textContent = ok ? "SERVER TERHUBUNG" : "SERVER TERPUTUS";
  $(".top-status i").classList.toggle("online", ok);
}
socket.on("connect", () => { setConnected(true); showError(""); });
socket.on("disconnect", () => { setConnected(false); showError("Koneksi ke server terputus. Coba refresh halaman."); });
socket.on("connect_error", () => { setConnected(false); showError("Tidak dapat menghubungi server. Jalankan server lokal atau deploy ke hosting."); });
socket.on("room:update", room => { currentRoom = room; renderRoom(room); });
socket.on("room:notice", message => appendChat("LOBBY", message));
socket.on("room:closed", message => { appendChat("LOBBY", message); clearRoom(); });
socket.on("room:chat", data => appendChat(data.name, data.message, data.at));

function renderRoom(room) {
  roomPanel.hidden = false;
  $("#roomCode").textContent = room.code;
  $("#roomStatus").textContent = room.status === "ready" ? "PEMAIN LENGKAP" : "MENUNGGU";
  $("#roomSummary").textContent = `Pokémon Quetzal · ${modeLabel(room.mode)} · maksimal 2 pemain`;
  $("#players").replaceChildren();
  room.players.forEach(p => {
    const row = document.createElement("div"); row.className = "player";
    const name = document.createElement("span"); name.textContent = `${p.name}${p.role === "host" ? " (Host)" : ""}`;
    const status = document.createElement("em"); status.textContent = "ONLINE";
    row.append(name, status); $("#players").append(row);
  });
  $("#startButton").disabled = room.players.length < 2 || !room.players.some(p => p.id === socket.id && p.role === "host");
  $("#chatInput").disabled = false; $("#chatSend").disabled = false;
}
function clearRoom() {
  currentRoom = null; roomPanel.hidden = true;
  $("#chatInput").disabled = true; $("#chatSend").disabled = true;
}
function appendChat(name, message, at = Date.now()) {
  const empty = $("#chatLog").querySelector(".muted");
  if (empty) empty.remove();
  const line = document.createElement("p"); line.className = "chat-line";
  const stamp = new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const strong = document.createElement("b"); strong.textContent = `[${stamp}] ${name}: `;
  line.append(strong, document.createTextNode(message));
  $("#chatLog").append(line); $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
}
$("#createButton").addEventListener("click", () => {
  showError("");
  socket.emit("room:create", { name: getName(), mode: mode.value }, result => {
    if (!result?.ok) return showError(result?.error || "Gagal membuat room.");
    currentRoom = result.room; renderRoom(result.room);
  });
});
$("#joinButton").addEventListener("click", () => {
  showError("");
  const code = $("#joinCode").value.trim();
  if (!code) return showError("Masukkan kode room dari host.");
  socket.emit("room:join", { name: getName(), code }, result => {
    if (!result?.ok) return showError(result?.error || "Gagal bergabung.");
    currentRoom = result.room; renderRoom(result.room);
  });
});
$("#startButton").addEventListener("click", () => {
  socket.emit("room:start", result => {
    if (!result?.ok) showError(result?.error || "Sesi belum siap.");
    else appendChat("LOBBY", "Lobby ditandai siap. Ini belum berarti game tersinkron.");
  });
});
$("#leaveButton").addEventListener("click", () => { socket.emit("room:leave"); clearRoom(); });
$("#copyButton").addEventListener("click", async () => {
  if (!currentRoom) return;
  const text = `Retro Lobby — Pokémon Quetzal\nKode room: ${currentRoom.code}\nMode: ${modeLabel(currentRoom.mode)}\nLink: ${location.origin}\n\nCatatan: room ini untuk koordinasi/chat. Jalankan metode multiplayer Quetzal sesuai panduan resmi; website belum menyinkronkan emulator.`;
  try { await navigator.clipboard.writeText(text); $("#copyButton").textContent = "TERSALIN ✓"; }
  catch { window.prompt("Salin undangan:", text); }
});
$("#chatForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = $("#chatInput"); const message = input.value.trim();
  if (!message || !currentRoom) return;
  socket.emit("room:chat", { message }); input.value = "";
});

// EmulatorJS is loaded only after the user chooses a local ROM.
// This is a single-player browser emulator, not an online multiplayer bridge.
$("#romFile").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/\.gba$/i.test(file.name)) { $("#emulatorStatus").textContent = "Pilih file berekstensi .gba."; return; }
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  $("#emulatorStatus").textContent = "Memuat EmulatorJS. File ROM dipakai lokal di browser; jangan tutup tab saat bermain.";
  $("#game").replaceChildren();
  const player = document.createElement("div"); player.id = "emulator-player"; player.style.width = "100%"; player.style.minHeight = "300px";
  $("#game").append(player);
  // EmulatorJS uses global configuration read by its loader.
  window.EJS_player = "#emulator-player";
  window.EJS_core = "gba";
  window.EJS_gameUrl = currentObjectUrl;
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;
  const old = document.querySelector("#emulator-loader");
  if (old) old.remove();
  const script = document.createElement("script");
  script.id = "emulator-loader";
  script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  script.onload = () => { emulatorLoaded = true; $("#emulatorStatus").textContent = "Emulator dimuat jika core/browser kompatibel. Multiplayer Quetzal tidak didukung oleh fitur ini."; };
  script.onerror = () => { $("#emulatorStatus").textContent = "Gagal memuat EmulatorJS dari CDN. Periksa koneksi internet atau coba lagi nanti."; };
  document.body.append(script);
});
window.addEventListener("beforeunload", () => { if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); });
