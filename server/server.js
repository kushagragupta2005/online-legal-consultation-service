const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 5055);
const secret = process.env.JWT_SECRET || "local-demo-only-change-this-secret";
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "demo-store.json");
const uploadDir = path.join(__dirname, "uploads", "private");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const seedPass = "demo1234";
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function seedUser(id, name, email, role, extra = {}) {
  return { id, name, email, role, passwordHash: hashPassword(seedPass), ...extra };
}

const seed = {
  users: [
    seedUser("c101", "Maya Chen", "maya@example.test", "client"),
    seedUser("c102", "Arjun Mehta", "arjun@example.test", "client"),
    seedUser("l201", "Asha Raman", "asha@example.test", "lawyer", { area: "Family law", experience: "12 years", rate: 2800, rating: 4.9, initials: "AR", color: "rose", bio: "Practical guidance for family transitions, agreements, and mediation." }),
    seedUser("l202", "Kabir Sethi", "kabir@example.test", "lawyer", { area: "Business law", experience: "9 years", rate: 3500, rating: 4.8, initials: "KS", color: "blue", bio: "Helping founders and growing teams make confident commercial decisions." }),
    seedUser("l203", "Leela Nair", "leela@example.test", "lawyer", { area: "Property law", experience: "15 years", rate: 3200, rating: 5.0, initials: "LN", color: "gold", bio: "Clear advice on property transactions, title review, and disputes." }),
    seedUser("l204", "Rohan Iyer", "rohan@example.test", "lawyer", { area: "Employment law", experience: "7 years", rate: 2400, rating: 4.7, initials: "RI", color: "green", bio: "Employment counsel for workplace questions and policy reviews." }),
    seedUser("a301", "Platform Admin", "admin@example.test", "admin"),
  ],
  appointments: [
    { id: "ap401", clientId: "c101", lawyerId: "l201", subject: "Family settlement options", date: "2026-10-20", time: "10:30", mode: "Video call", status: "Confirmed", createdAt: "2026-10-10T10:00:00.000Z" },
    { id: "ap402", clientId: "c101", lawyerId: "l202", subject: "Reviewing a vendor agreement", date: "2026-10-22", time: "14:00", mode: "Video call", status: "Requested", createdAt: "2026-10-11T10:00:00.000Z" },
    { id: "ap403", clientId: "c102", lawyerId: "l203", subject: "Property title review", date: "2026-10-24", time: "11:00", mode: "Office visit", status: "Confirmed", createdAt: "2026-10-11T11:00:00.000Z" },
  ],
  cases: [
    { id: "cs501", reference: "NC-2026-014", title: "Mehta Family Settlement", clientId: "c101", lawyerId: "l201", category: "Family law", status: "In progress", updatedAt: "2026-10-12", summary: "Initial consultation completed. Reviewing proposed settlement terms." },
    { id: "cs502", reference: "NC-2026-019", title: "Blue Oak Vendor Agreement", clientId: "c101", lawyerId: "l202", category: "Business law", status: "Documents requested", updatedAt: "2026-10-13", summary: "Draft agreement received; awaiting the signed scope of work." },
    { id: "cs503", reference: "NC-2026-021", title: "Property Title Review", clientId: "c102", lawyerId: "l203", category: "Property law", status: "In progress", updatedAt: "2026-10-12", summary: "Reviewing title documents and encumbrance records." },
  ],
  documents: [],
};

let store;
try { store = JSON.parse(fs.readFileSync(dbPath, "utf8")); }
catch { store = seed; save(); }
function save() { fs.writeFileSync(dbPath, JSON.stringify(store, null, 2)); }

function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function readToken(token) {
  const [header, body, signature] = String(token || "").split(".");
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest();
  let given;
  try { given = Buffer.from(signature, "base64url"); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
const publicUser = ({ passwordHash, ...user }) => user;
function auth(req, res, next) {
  const payload = readToken(req.get("authorization")?.replace(/^Bearer\s+/i, ""));
  const user = payload && store.users.find((entry) => entry.id === payload.sub && entry.role === payload.role);
  if (!user) return res.status(401).json({ error: "Please sign in to continue." });
  req.user = user;
  next();
}
const roles = (...allowed) => (req, res, next) => allowed.includes(req.user.role)
  ? next() : res.status(403).json({ error: "You do not have access to this action." });
const id = (prefix) => `${prefix}${crypto.randomBytes(5).toString("hex")}`;
const safeEqual = (a, b) => {
  const [salt, digest] = String(a || "").split(":");
  if (!salt || !digest) return false;
  const candidate = crypto.scryptSync(String(b || ""), salt, 64);
  const expected = Buffer.from(digest, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
};

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "32kb" }));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Northstar Legal demo API", mode: "local-demo" }));

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = store.users.find((entry) => entry.email.toLowerCase() === email);
  if (!user || !safeEqual(user.passwordHash, password)) return res.status(401).json({ error: "Email or password is incorrect." });
  res.json({ token: signToken(user), user: publicUser(user) });
});
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Enter a name, valid email, and password of at least 8 characters." });
  }
  if (store.users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) return res.status(409).json({ error: "That email already has an account." });
  const user = { id: id("c"), name: name.trim(), email: email.trim().toLowerCase(), role: "client", passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  store.users.push(user); save();
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});
app.get("/api/auth/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get("/api/lawyers", (_req, res) => res.json({ lawyers: store.users.filter((user) => user.role === "lawyer").map(publicUser) }));
app.get("/api/clients", auth, roles("lawyer", "admin"), (_req, res) => res.json({ clients: store.users.filter((user) => user.role === "client").map(publicUser) }));
app.get("/api/dashboard", auth, (req, res) => {
  const visibleAppointments = store.appointments.filter((appointment) => req.user.role === "admin" || (req.user.role === "client" ? appointment.clientId === req.user.id : appointment.lawyerId === req.user.id));
  const visibleCases = store.cases.filter((matter) => req.user.role === "admin" || (req.user.role === "client" ? matter.clientId === req.user.id : matter.lawyerId === req.user.id));
  res.json({ appointments: visibleAppointments.length, pending: visibleAppointments.filter((item) => item.status === "Requested").length, activeCases: visibleCases.filter((item) => item.status !== "Closed").length, documents: store.documents.filter((file) => req.user.role === "admin" || file.clientId === req.user.id || file.lawyerId === req.user.id).length });
});
app.get("/api/appointments", auth, (req, res) => {
  const items = store.appointments.filter((item) => req.user.role === "admin" || (req.user.role === "client" ? item.clientId === req.user.id : item.lawyerId === req.user.id)).map((item) => ({ ...item, client: store.users.find((user) => user.id === item.clientId)?.name, lawyer: store.users.find((user) => user.id === item.lawyerId)?.name }));
  res.json({ appointments: items });
});
app.post("/api/appointments", auth, roles("client"), (req, res) => {
  const { lawyerId, subject, date, time, mode } = req.body || {};
  const lawyer = store.users.find((user) => user.id === lawyerId && user.role === "lawyer");
  if (!lawyer || typeof subject !== "string" || subject.trim().length < 5 || !/^\d{4}-\d\d-\d\d$/.test(date || "") || !/^\d\d:\d\d$/.test(time || "")) return res.status(400).json({ error: "Choose a lawyer and provide a valid topic, date, and time." });
  const appointment = { id: id("ap"), clientId: req.user.id, lawyerId, subject: subject.trim(), date, time, mode: mode === "Office visit" ? mode : "Video call", status: "Requested", createdAt: new Date().toISOString() };
  store.appointments.push(appointment); save(); res.status(201).json({ appointment });
});
app.patch("/api/appointments/:id", auth, roles("lawyer", "admin"), (req, res) => {
  const item = store.appointments.find((entry) => entry.id === req.params.id && (req.user.role === "admin" || entry.lawyerId === req.user.id));
  const status = req.body?.status;
  if (!item) return res.status(404).json({ error: "Consultation not found." });
  if (!(["Confirmed", "Declined", "Completed"].includes(status)) || (item.status !== "Requested" && status !== "Completed")) return res.status(400).json({ error: "That status change is not allowed." });
  item.status = status; item.updatedAt = new Date().toISOString(); save(); res.json({ appointment: item });
});

app.get("/api/cases", auth, (req, res) => {
  const cases = store.cases.filter((item) => req.user.role === "admin" || (req.user.role === "client" ? item.clientId === req.user.id : item.lawyerId === req.user.id)).map((item) => ({ ...item, client: store.users.find((user) => user.id === item.clientId)?.name, lawyer: store.users.find((user) => user.id === item.lawyerId)?.name }));
  res.json({ cases });
});
app.post("/api/cases", auth, roles("lawyer", "admin"), (req, res) => {
  const { title, clientId, category, summary } = req.body || {};
  const client = store.users.find((user) => user.id === clientId && user.role === "client");
  if (typeof title !== "string" || title.trim().length < 4 || !client || typeof category !== "string") return res.status(400).json({ error: "Add a title, client, and practice area." });
  const matter = { id: id("cs"), reference: `NC-${new Date().getFullYear()}-${String(store.cases.length + 1).padStart(3, "0")}`, title: title.trim(), clientId, lawyerId: req.user.role === "lawyer" ? req.user.id : (req.body.lawyerId || req.user.id), category, status: "In progress", updatedAt: new Date().toISOString().slice(0, 10), summary: String(summary || "New matter created.").slice(0, 500) };
  store.cases.unshift(matter); save(); res.status(201).json({ case: matter });
});

const storage = multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadDir), filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  cb(allowed.has(file.mimetype) ? null : new Error("Upload a PDF, DOCX, PNG, or JPEG file."), allowed.has(file.mimetype));
} });
function canSeeCase(user, matter) { return user.role === "admin" || matter.clientId === user.id || matter.lawyerId === user.id; }
app.get("/api/documents", auth, (req, res) => res.json({ documents: store.documents.filter((doc) => req.user.role === "admin" || doc.clientId === req.user.id || doc.lawyerId === req.user.id) }));
app.post("/api/documents", auth, upload.single("file"), (req, res) => {
  const matter = store.cases.find((item) => item.id === req.body.caseId);
  if (!req.file) return res.status(400).json({ error: "Choose a file to upload." });
  if (!matter || !canSeeCase(req.user, matter)) { fs.unlinkSync(req.file.path); return res.status(404).json({ error: "Case not found or access denied." }); }
  const doc = { id: id("d"), caseId: matter.id, caseTitle: matter.title, clientId: matter.clientId, lawyerId: matter.lawyerId, name: path.basename(req.file.originalname).slice(0, 160), fileName: req.file.filename, mimeType: req.file.mimetype, size: req.file.size, uploadedBy: req.user.id, createdAt: new Date().toISOString() };
  store.documents.unshift(doc); save(); res.status(201).json({ document: { ...doc, fileName: undefined } });
});
app.get("/api/documents/:id/download", auth, (req, res) => {
  const doc = store.documents.find((entry) => entry.id === req.params.id);
  if (!doc || !(req.user.role === "admin" || doc.clientId === req.user.id || doc.lawyerId === req.user.id)) return res.status(404).json({ error: "Document not found." });
  res.download(path.join(uploadDir, path.basename(doc.fileName)), doc.name);
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Files must be 5 MB or smaller." });
  res.status(400).json({ error: err.message || "The request could not be completed." });
});
app.listen(port, () => console.log(`Northstar Legal demo API listening on http://localhost:${port}`));
