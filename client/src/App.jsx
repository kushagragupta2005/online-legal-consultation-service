import { useCallback, useEffect, useMemo, useState } from "react";

const initialToken = localStorage.getItem("northstar-token");
const fmtDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const initials = (name = "") => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function App() {
  const [token, setToken] = useState(initialToken || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("northstar-user") || "null"));
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [lawyers, setLawyers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [metrics, setMetrics] = useState({ appointments: 0, pending: 0, activeCases: 0, documents: 0 });
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All practices");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");

  const api = useCallback(async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`/api${path}`, { ...options, headers });
    const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : {};
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [dash, appt, matter, docs, directory] = await Promise.all([
        api("/dashboard"), api("/appointments"), api("/cases"), api("/documents"), api("/lawyers"),
      ]);
      setMetrics(dash); setAppointments(appt.appointments); setCases(matter.cases); setDocuments(docs.documents); setLawyers(directory.lawyers);
      setError("");
    } catch (err) { setError(err.message); }
  }, [api, token, user]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);

  async function login(email, password) {
    setBusy(true); setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      localStorage.setItem("northstar-token", data.token); localStorage.setItem("northstar-user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); setView("overview"); setToast(`Welcome, ${data.user.name.split(" ")[0]}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function logout() {
    localStorage.removeItem("northstar-token"); localStorage.removeItem("northstar-user");
    setToken(""); setUser(null); setView("overview"); setError("");
  }
  async function act(path, method, payload, success) {
    try {
      await api(path, { method, body: payload instanceof FormData ? payload : JSON.stringify(payload) });
      setToast(success); setModal(null); await refresh();
    } catch (err) { setError(err.message); }
  }

  const filteredLawyers = useMemo(() => lawyers.filter((lawyer) =>
    (area === "All practices" || lawyer.area === area) &&
    `${lawyer.name} ${lawyer.area} ${lawyer.bio}`.toLowerCase().includes(query.toLowerCase())), [lawyers, query, area]);

  if (!user || !token) return <Login onLogin={login} busy={busy} error={error} />;
  const activeNav = (item) => setView(item);
  const upcoming = [...appointments].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 3);
  const title = ({ overview: user.role === "client" ? "Your legal workspace" : user.role === "lawyer" ? "Your practice overview" : "Platform overview", lawyers: "Find a lawyer", consultations: "Consultations", cases: "Case files", documents: "Documents" })[view];

  return <div className="app-frame">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">N</span><span>northstar<span className="brand-dot">.</span><small>LEGAL PORTAL</small></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <NavItem icon="◫" label="Overview" active={view === "overview"} onClick={() => activeNav("overview")} />
        {user.role === "client" && <NavItem icon="⌕" label="Find a lawyer" active={view === "lawyers"} onClick={() => activeNav("lawyers")} />}
        <NavItem icon="◷" label="Consultations" count={metrics.pending} active={view === "consultations"} onClick={() => activeNav("consultations")} />
        <NavItem icon="▤" label="Case files" count={metrics.activeCases} active={view === "cases"} onClick={() => activeNav("cases")} />
        <NavItem icon="▧" label="Documents" active={view === "documents"} onClick={() => activeNav("documents")} />
      </nav>
      {user.role === "admin" && <div className="side-note"><span className="status-dot" /> Administrator access</div>}
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✳</div><b>Need a hand?</b><p>Our client care team is here to help you navigate the portal.</p><button onClick={() => setToast("Client care: support@northstar.local")}>Contact support <span>↗</span></button></div>
        <div className="profile-chip"><Avatar name={user.name} small /><div className="profile-copy"><b>{user.name}</b><span>{roleName(user.role)}</span></div><button className="more-button" onClick={logout} aria-label="Sign out">⋯</button></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="demo-pill"><i /> Preview workspace</span><button className="icon-button" aria-label="Notifications" onClick={() => setToast("You’re all caught up.")}>♧<span /></button><div className="top-user"><Avatar name={user.name} small /><span>{user.name.split(" ")[0]}</span></div></div></header>
      <div className="content-area">
        <div className="page-heading"><div><div className="eyebrow">{user.role === "client" ? "CLIENT WORKSPACE" : user.role === "lawyer" ? "PROFESSIONAL WORKSPACE" : "ADMINISTRATION"} <span>·</span> {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div><h1>{title}</h1><p>{view === "overview" ? user.role === "client" ? "A clear view of your consultations, matters, and next steps." : "Everything you need to keep work moving." : viewDescriptions[view]}</p></div>{user.role === "client" && <button className="button button-dark" onClick={() => setView("lawyers")}><span>＋</span> Book a consultation</button>}</div>
        {error && <div className="alert-error" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        {view === "overview" && <Overview user={user} metrics={metrics} appointments={upcoming} cases={cases.slice(0, 3)} onNav={setView} onAppointment={async (id, status) => act(`/appointments/${id}`, "PATCH", { status }, `Consultation ${status.toLowerCase()}.`)} />}
        {view === "lawyers" && <LawyerDirectory lawyers={filteredLawyers} query={query} setQuery={setQuery} area={area} setArea={setArea} onBook={(lawyer) => setModal({ type: "booking", lawyer })} />}
        {view === "consultations" && <ConsultationList appointments={appointments} role={user.role} onUpdate={(id, status) => act(`/appointments/${id}`, "PATCH", { status }, `Consultation ${status.toLowerCase()}.`)} onBook={() => setView("lawyers")} />}
        {view === "cases" && <CaseList cases={cases} user={user} onCreate={() => setModal({ type: "case" })} />}
        {view === "documents" && <DocumentList documents={documents} cases={cases} user={user} onUpload={(form) => act("/documents", "POST", form, "Document added to the case file.")} onDownload={(id) => downloadDocument(api, id, setError)} />}
      </div>
    </main>
    {modal?.type === "booking" && <BookingModal lawyer={modal.lawyer} close={() => setModal(null)} submit={(data) => act("/appointments", "POST", data, "Consultation request sent.")} />}
    {modal?.type === "case" && <CaseModal api={api} user={user} close={() => setModal(null)} submit={(data) => act("/cases", "POST", data, "Case file created.")} />}
    {toast && <div className="toast-message" role="status"><span>✓</span>{toast}</div>}
    <div className="demo-disclaimer">Demo environment · Use sample accounts and fictional details only. Data is stored locally on this machine.</div>
  </div>;
}

const viewDescriptions = { lawyers: "Meet experienced professionals and find the right fit for your matter.", consultations: "Review requests, upcoming meetings, and past consultations.", cases: "Keep important matter details and next steps in one place.", documents: "Securely organize files by case and share them with your legal team." };
function roleName(role) { return ({ client: "Client", lawyer: "Legal professional", admin: "Administrator" })[role] || role; }
function Avatar({ name, small = false, color = "" }) { return <span className={`avatar ${small ? "avatar-small" : ""} ${color ? `avatar-${color}` : ""}`}>{initials(name)}</span>; }
function NavItem({ icon, label, active, count, onClick }) { return <button className={`nav-item ${active ? "nav-active" : ""}`} onClick={onClick}><span className="nav-icon">{icon}</span><span>{label}</span>{count > 0 && <i className="nav-count">{count}</i>}</button>; }

function Login({ onLogin, busy, error }) {
  const [selected, setSelected] = useState("client");
  const accounts = { client: "maya@example.test", lawyer: "asha@example.test", admin: "admin@example.test" };
  return <div className="login-screen"><div className="login-decoration"><div className="login-brand"><span className="brand-mark">N</span><span>northstar<span className="brand-dot">.</span></span></div><div className="login-quote"><div className="quote-mark">“</div><h1>Good counsel begins with a clear conversation.</h1><p>One considered next step can make a complicated matter feel manageable.</p><div className="quote-rule" /><div className="quote-caption">A MORE HUMAN WAY TO FIND LEGAL SUPPORT</div></div><div className="login-decoration-footer"><span>Thoughtful guidance. Clear next steps.</span><span>EST. 2026</span></div></div>
    <div className="login-panel"><div className="login-content"><div className="eyebrow">WELCOME TO NORTHSTAR</div><h2>Your legal workspace,<br />all in one place.</h2><p className="login-lead">Sign in to continue to your consultations and case files.</p>
      <div className="demo-label">PRESENTATION DEMO <span>Choose a sample role</span></div><div className="role-picker">{["client", "lawyer", "admin"].map((role) => <button key={role} onClick={() => setSelected(role)} className={selected === role ? "role-selected" : ""}><span className={`role-symbol role-${role}`}>{role === "client" ? "◉" : role === "lawyer" ? "§" : "⌘"}</span><b>{roleName(role)}</b><i>{selected === role ? "✓" : ""}</i></button>)}</div>
      <div className="field"><label htmlFor="demo-email">Email address</label><input id="demo-email" autoComplete="username" defaultValue={accounts[selected]} key={selected} /></div><div className="field"><div className="field-label-row"><label htmlFor="demo-password">Password</label><span>Sample: demo1234</span></div><input id="demo-password" type="password" autoComplete="current-password" defaultValue="demo1234" /></div>
      {error && <div className="alert-error" role="alert">{error}</div>}<button className="button button-dark login-submit" disabled={busy} onClick={() => onLogin(accounts[selected], "demo1234")}>{busy ? "Signing in…" : "Sign in to workspace"}<span>→</span></button><div className="login-privacy">🔒 &nbsp;Sample data only · No real client information</div></div><div className="login-footer">© 2026 Northstar Legal <span>Privacy · Terms</span></div></div></div>;
}

function Overview({ user, metrics, appointments, cases, onNav, onAppointment }) {
  const greeting = new Date().getHours() < 12 ? "Good morning" : "Good afternoon";
  return <>
    <section className="welcome-banner"><div className="welcome-copy"><span className="welcome-kicker">{greeting}, {user.name.split(" ")[0]}</span><h2>{user.role === "client" ? "Let's move things forward." : user.role === "lawyer" ? "Your matters are in good order." : "Here’s the latest across Northstar."}</h2><p>{user.role === "client" ? "Your next step is ready when you are. Pick up where you left off." : "A concise view of today’s activity and upcoming work."}</p>{user.role === "client" && <button onClick={() => onNav("lawyers")}>Explore legal professionals <span>→</span></button>}</div><div className="welcome-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun" /><span className="art-star star-one">✳</span><span className="art-star star-two">✧</span><div className="art-line line-one" /><div className="art-line line-two" /></div></section>
    <section className="metric-grid"><Metric icon="◷" label="Consultations" value={metrics.appointments} note={`${metrics.pending} awaiting response`} color="blue" /><Metric icon="▤" label="Active matters" value={metrics.activeCases} note="Across your workspace" color="gold" /><Metric icon="▧" label="Case documents" value={metrics.documents} note="Shared securely by case" color="green" /><Metric icon="⌁" label="Next step" value={appointments.length ? fmtDate(appointments[0].date) : "—"} note={appointments[0]?.time || "Nothing scheduled"} color="rose" /></section>
    <div className="dashboard-columns"><section className="surface-card schedule-card"><div className="section-heading"><div><span className="eyebrow">ON YOUR CALENDAR</span><h3>Upcoming consultations</h3></div><button className="text-button" onClick={() => onNav("consultations")}>View all <span>→</span></button></div>{appointments.length ? <div className="appointment-list">{appointments.map((item) => <AppointmentRow key={item.id} item={item} role={user.role} onUpdate={onAppointment} />)}</div> : <Empty icon="◷" title="No consultations yet" text="When a consultation is booked, it will appear here." />}</section>
      <section className="surface-card matters-card"><div className="section-heading"><div><span className="eyebrow">KEEP THINGS MOVING</span><h3>Recent case files</h3></div><button className="text-button" onClick={() => onNav("cases")}>View all <span>→</span></button></div>{cases.length ? <div className="matter-list">{cases.map((matter) => <button key={matter.id} className="matter-row" onClick={() => onNav("cases")}><span className="matter-icon">§</span><span className="matter-copy"><b>{matter.title}</b><small>{matter.reference} · {matter.category}</small></span><span className="status status-neutral">{matter.status}</span><span className="row-arrow">↗</span></button>)}</div> : <Empty icon="§" title="No case files" text="Your open matters will be listed here." />}</section></div>
    <section className="next-step-strip"><span className="strip-icon">✳</span><div><b>Every matter starts with a good question.</b><p>Not sure where to begin? Browse by practice area to find a professional who understands your situation.</p></div><button onClick={() => onNav("lawyers")}>{user.role === "client" ? "Browse professionals" : "Open case files"} <span>→</span></button></section>
  </>;
}
function Metric({ icon, label, value, note, color }) { return <article className="metric-card"><span className={`metric-icon metric-${color}`}>{icon}</span><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></article>; }
function AppointmentRow({ item, role, onUpdate }) { return <div className="appointment-row"><div className="date-box"><b>{new Date(`${item.date}T12:00:00`).getDate()}</b><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-IN", { month: "short" })}</span></div><div className="appointment-details"><b>{item.subject}</b><span>{role === "client" ? `with ${item.lawyer}` : `with ${item.client}`} <i>·</i> {item.time} <i>·</i> {item.mode}</span></div><Status value={item.status} />{role !== "client" && item.status === "Requested" ? <div className="row-actions"><button title="Confirm" onClick={() => onUpdate(item.id, "Confirmed")}>✓</button><button title="Decline" onClick={() => onUpdate(item.id, "Declined")}>×</button></div> : <span className="row-arrow">↗</span>}</div>; }
function Status({ value }) { return <span className={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>; }
function Empty({ icon, title, text }) { return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{text}</p></div>; }

function LawyerDirectory({ lawyers, query, setQuery, area, setArea, onBook }) {
  const practices = ["All practices", ...new Set(lawyers.map((lawyer) => lawyer.area))];
  return <><div className="directory-toolbar"><label className="search-field"><span>⌕</span><input placeholder="Name, practice area, or keyword" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filter by practice area">{practices.map((practice) => <option key={practice}>{practice}</option>)}</select><span className="result-count">{lawyers.length} professionals</span></div><div className="lawyer-grid">{lawyers.map((lawyer) => <article className="lawyer-card" key={lawyer.id}><div className="lawyer-card-top"><Avatar name={lawyer.name} color={lawyer.color} /><span className="verified"><span>✓</span> Verified profile</span></div><h3>{lawyer.name}</h3><div className="lawyer-area">{lawyer.area}</div><div className="lawyer-rating"><span>★</span> {lawyer.rating.toFixed(1)} <i>·</i> {lawyer.experience} experience</div><p>{lawyer.bio}</p><div className="lawyer-card-bottom"><div><small>CONSULTATION</small><b>₹{lawyer.rate.toLocaleString("en-IN")} <span>/ session</span></b></div><button onClick={() => onBook(lawyer)}>View availability <span>→</span></button></div></article>)}</div>{!lawyers.length && <Empty icon="⌕" title="No matching professionals" text="Try another name or practice area." />}</>;
}

function ConsultationList({ appointments, role, onUpdate, onBook }) { return <section className="surface-card full-card"><div className="section-heading"><div><span className="eyebrow">YOUR SCHEDULE</span><h3>Consultation requests and meetings</h3></div>{role === "client" && <button className="button button-dark button-small" onClick={onBook}>＋ Request a time</button>}</div>{appointments.length ? <div className="table-wrap"><table><thead><tr><th>MATTER</th><th>{role === "client" ? "LAWYER" : "CLIENT"}</th><th>DATE & TIME</th><th>FORMAT</th><th>STATUS</th>{role !== "client" && <th>ACTION</th>}</tr></thead><tbody>{appointments.map((item) => <tr key={item.id}><td><b>{item.subject}</b></td><td>{role === "client" ? item.lawyer : item.client}</td><td>{fmtDate(item.date)} <span className="muted">· {item.time}</span></td><td>{item.mode}</td><td><Status value={item.status} /></td>{role !== "client" && <td>{item.status === "Requested" ? <div className="table-actions"><button onClick={() => onUpdate(item.id, "Confirmed")}>Confirm</button><button onClick={() => onUpdate(item.id, "Declined")}>Decline</button></div> : item.status === "Confirmed" ? <button className="subtle-button" onClick={() => onUpdate(item.id, "Completed")}>Mark complete</button> : "—"}</td>}</tr>)}</tbody></table></div> : <Empty icon="◷" title="No consultations to show" text="Your consultations will appear here." />}</section>; }

function CaseList({ cases, user, onCreate }) { return <><div className="case-toolbar"><div className="case-summary"><b>{cases.length}</b><span>matters in your workspace</span></div>{user.role !== "client" && <button className="button button-dark" onClick={onCreate}>＋ Create case file</button>}</div><div className="case-grid">{cases.map((matter) => <article className="case-card" key={matter.id}><div className="case-card-head"><span className="case-ref">{matter.reference}</span><Status value={matter.status} /></div><span className="case-emblem">§</span><h3>{matter.title}</h3><div className="case-category">{matter.category}</div><p>{matter.summary}</p><div className="case-card-footer"><span>Client <b>{matter.client}</b></span><span>Lawyer <b>{matter.lawyer}</b></span></div><div className="case-updated">Updated {fmtDate(matter.updatedAt)}</div></article>)}</div>{!cases.length && <Empty icon="§" title="No case files yet" text="New matters will show here." />}</>; }

function DocumentList({ documents, cases, user, onUpload, onDownload }) { const [file, setFile] = useState(null); const [caseId, setCaseId] = useState(cases[0]?.id || ""); const [loading, setLoading] = useState(false);
  async function submit(e) { e.preventDefault(); if (!file || !caseId) return; const form = new FormData(); form.append("file", file); form.append("caseId", caseId); setLoading(true); await onUpload(form); setFile(null); e.target.reset(); setLoading(false); }
  return <div className="document-layout"><section className="surface-card full-card"><div className="section-heading"><div><span className="eyebrow">CASE LIBRARY</span><h3>Shared documents</h3></div><span className="file-count">{documents.length} files</span></div>{documents.length ? <div className="document-list">{documents.map((doc) => <div className="document-row" key={doc.id}><span className="file-icon">{doc.mimeType === "application/pdf" ? "PDF" : "DOC"}</span><span className="document-copy"><b>{doc.name}</b><small>{doc.caseTitle} · {formatSize(doc.size)} · {fmtDate(doc.createdAt.slice(0, 10))}</small></span><button className="download-button" onClick={() => onDownload(doc.id)} aria-label={`Download ${doc.name}`}>↓</button></div>)}</div> : <Empty icon="▧" title="No shared documents" text="Files added to a case appear here." />}</section>
    {cases.length > 0 && <section className="surface-card upload-card"><span className="eyebrow">ADD TO A CASE</span><h3>Upload a document</h3><p>Keep supporting documents connected to the right matter.</p><form onSubmit={submit}><label className="field"><span>Case file</span><select value={caseId} onChange={(e) => setCaseId(e.target.value)}>{cases.map((matter) => <option key={matter.id} value={matter.id}>{matter.reference} · {matter.title}</option>)}</select></label><label className="upload-drop"><input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="upload-icon">↑</span><b>{file ? file.name : "Choose a file or drag it here"}</b><small>PDF, DOCX, PNG, JPEG · up to 5 MB</small></label><button className="button button-dark" disabled={!file || loading}>{loading ? "Uploading…" : "Upload to case"}</button></form><div className="upload-privacy">🔒 Private to the case team. Demo files remain on this machine.</div></section>}</div>; }
function formatSize(size) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
async function downloadDocument(api, id, setError) { try { const token = localStorage.getItem("northstar-token"); const response = await fetch(`/api/documents/${id}/download`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error("Unable to download this file."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "case-document"; a.click(); URL.revokeObjectURL(url); } catch (err) { setError(err.message); } }

function BookingModal({ lawyer, close, submit }) { const [subject, setSubject] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState("10:30"); const [mode, setMode] = useState("Video call"); const [loading, setLoading] = useState(false); async function send(e) { e.preventDefault(); setLoading(true); await submit({ lawyerId: lawyer.id, subject, date, time, mode }); setLoading(false); }
  return <Modal close={close}><div className="modal-heading"><span className="eyebrow">REQUEST A CONSULTATION</span><button className="modal-close" onClick={close}>×</button><h2>Choose a time to talk.</h2><div className="modal-lawyer"><Avatar name={lawyer.name} color={lawyer.color} small /><span><b>{lawyer.name}</b><small>{lawyer.area} · ₹{lawyer.rate.toLocaleString("en-IN")} / session</small></span></div></div><form className="modal-form" onSubmit={send}><div className="field"><label htmlFor="topic">What would you like to discuss?</label><input id="topic" required minLength="5" maxLength="120" placeholder="A short description of your matter" value={subject} onChange={(e) => setSubject(e.target.value)} /></div><div className="form-pair"><div className="field"><label htmlFor="consult-date">Preferred date</label><input id="consult-date" type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="field"><label htmlFor="consult-time">Preferred time</label><select id="consult-time" value={time} onChange={(e) => setTime(e.target.value)}>{["09:30", "10:30", "11:30", "14:00", "15:00", "16:00"].map((t) => <option key={t}>{t}</option>)}</select></div></div><div className="field"><label htmlFor="consult-mode">Meeting format</label><select id="consult-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option>Video call</option><option>Office visit</option></select></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button className="button button-dark" disabled={loading}>{loading ? "Sending…" : "Send request →"}</button></div></form></Modal>;
}
function CaseModal({ api, user, close, submit }) { const [clients, setClients] = useState([]); const [title, setTitle] = useState(""); const [clientId, setClientId] = useState(""); const [category, setCategory] = useState("Family law"); const [summary, setSummary] = useState(""); const [loading, setLoading] = useState(false); useEffect(() => { api("/clients").then((data) => { setClients(data.clients); setClientId(data.clients[0]?.id || ""); }).catch(() => {}); }, [api]); async function send(e) { e.preventDefault(); setLoading(true); await submit({ title, clientId, category, summary }); setLoading(false); }
  return <Modal close={close}><div className="modal-heading"><span className="eyebrow">NEW MATTER</span><button className="modal-close" onClick={close}>×</button><h2>Create a case file.</h2><p>Start a shared matter workspace for the client and legal team.</p></div><form className="modal-form" onSubmit={send}><div className="field"><label htmlFor="case-title">Matter title</label><input id="case-title" required minLength="4" maxLength="100" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mehta Family Settlement" /></div><div className="form-pair"><div className="field"><label htmlFor="case-client">Client</label><select id="case-client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div><div className="field"><label htmlFor="case-area">Practice area</label><select id="case-area" value={category} onChange={(e) => setCategory(e.target.value)}>{["Family law", "Business law", "Property law", "Employment law", "Other"].map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="field"><label htmlFor="case-summary">Initial note</label><textarea id="case-summary" maxLength="500" rows="3" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Add a concise internal note" /></div><div className="modal-footer"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button className="button button-dark" disabled={loading || !clients.length}>{loading ? "Creating…" : "Create case file →"}</button></div></form></Modal>;
}
function Modal({ children, close }) { useEffect(() => { const onKey = (e) => e.key === "Escape" && close(); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [close]); return <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}><div className="modal-card">{children}</div></div>; }

export default App;
