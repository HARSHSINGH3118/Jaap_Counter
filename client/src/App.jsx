import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./providers/AuthProvider.jsx";
import api from "./lib/api";
import { useEffect, useState, useMemo } from "react";
import { enqueueEvent } from "./lib/db";
import { useSync } from "./hooks/useSync";
import AudioPlayer from "./components/AudioPlayer.jsx";
import AppFooter from "./components/AppFooter.jsx";
import PeacockDrift from "./components/PeacockDrift.jsx";

/* ---------- Route Guards ---------- */
function Protected({ children }) {
  const { user, booting } = useAuth();
  const loc = useLocation();
  if (booting) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
function PublicOnly({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

/* ---------- Pages ---------- */
function DashboardPage() {
  const { user } = useAuth();
  const name = useMemo(() => {
    const raw = user?.displayName || user?.email || "Devotee";
    const first = raw.split("@")[0].split(" ")[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [user]);

  return (
    <Shell>
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="greet">राधे राधे</span>
            <span className="comma">, </span>
            <span className="uname">{name}</span>
          </h1>
          <p className="subtitle">Count with devotion. Works offline.</p>
          <div className="cta-row">
            <Link className="btn" to="/jaap">Open Counter</Link>
            <Link className="btn ghost" to="/settings">Settings</Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
function LoginPage() { return <AuthForm mode="login" />; }
function RegisterPage() { return <AuthForm mode="register" />; }
function JaapPage() { return <Shell><CounterCard /></Shell>; }
function SettingsPage() { return <Shell><SettingsCard /></Shell>; }

/* ---------- Layout ---------- */
function Shell({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      {/* Peacock feather background */}
      <PeacockDrift count={16} src="/art/feather.png" />
      <div className="app">
        <header className="topbar">
          <Link to="/" className="brand">🪷 Jaap Counter</Link>
          <nav className="menu">
            {user ? (
              <>
                <span className="dim">Hi, {user.displayName || user.email}</span>
                <Link to="/jaap">Counter</Link>
                <Link to="/settings">Settings</Link>
                <button className="btn small" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register" className="btn small">Register</Link>
              </>
            )}
          </nav>
        </header>
        <main className="container">{children}</main>
        <AppFooter />
      </div>
      <AudioPlayer />
    </>
  );
}

/* ---------- Auth Form ---------- */
function AuthForm({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (isLogin) await login({ email, password });
      else await register({ email, password, displayName });
    } catch (e2) { setErr(e2.response?.data?.error || "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={onSubmit}>
        <h2>{isLogin ? "Login" : "Create account"}</h2>
        {!isLogin && (
          <label><span>Display name</span>
            <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Harsh" />
          </label>
        )}
        <label><span>Email</span>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />
        </label>
        <label><span>Password</span>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
        {err && <div className="error">{err}</div>}
        <button className="btn full" disabled={busy}>{busy ? "Please wait..." : (isLogin ? "Login" : "Register")}</button>
        <div className="swap">
          {isLogin ? <>No account? <Link to="/register">Register</Link></> : <>Have an account? <Link to="/login">Login</Link></>}
        </div>
      </form>
    </div>
  );
}

/* ---------- Counter (offline-first) ---------- */
function CounterCard() {
  const [counterId, setCounterId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const sync = useSync();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: list } = await api.get("/counters");
        let c = list[0];
        if (!c) c = (await api.post("/counters", { name: "Radha Jaap", goalPerDay: 108 })).data;
        if (!mounted) return;
        setCounterId(c._id);
        const { data: s } = await api.get(`/counters/${c._id}/summary`);
        if (mounted) { setSummary(s); setPending(0); }
      } catch (e) {
        setErr(e.response?.data?.error || "Failed to load counter");
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!sync.syncing && !sync.offline && counterId) {
      (async () => {
        try {
          const { data: s } = await api.get(`/counters/${counterId}/summary`);
          setSummary(s);
          setPending(0);
        } catch {}
      })();
    }
  }, [sync.syncing, sync.offline, counterId]);

  async function inc(by = 1) {
    if (!counterId) return;
    const evt = { opId: crypto.randomUUID(), type: "inc", value: by, counterId };
    await enqueueEvent(evt);
    setPending(p => p + by);
    sync.scheduleSync();
  }

  if (loading) return <CardLoader />;
  if (err) return <div className="card error">{err}</div>;
  if (!summary) return null;

  const today = summary.daily + pending;
  const pct = Math.min(100, Math.round((today / summary.goalPerDay) * 100));

  return (
    <div className="card counter">
      <div className="krishna-bg" />
      <div className="status">
        <span className={`badge ${sync.offline ? "on" : ""}`}>Offline • queued: {sync.queueCount}</span>
        <span className={`badge ${!sync.offline && sync.syncing ? "on" : ""}`}>Syncing…</span>
      </div>

      <div className="metrics">
        <div className="stat"><div className="label">Today</div><div className="value">{today}</div></div>
        <div className="stat"><div className="label">Goal</div><div className="value">{summary.goalPerDay}</div></div>
        <div className="stat"><div className="label">Streak</div><div className="value">{summary.streak}</div></div>
      </div>

      <div className="progress">
        <div className="bar" style={{ width: `${pct}%` }} />
        <div className="pct">{pct}%</div>
      </div>

      <button className="tap" onClick={()=>inc(1)}>जप • Tap to Count</button>

      <div className="row">
        <button className="btn ghost" onClick={()=>inc(108)}>+108 (माला)</button>
        <button className="btn ghost" onClick={()=>inc(10)}>+10</button>
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsCard() {
  const [goal, setGoal] = useState(108);
  const [counterId, setCounterId] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: list } = await api.get("/counters");
      if (list[0]) {
        setCounterId(list[0]._id);
        setGoal(list[0].goalPerDay || 108);
      }
    })();
  }, []);

  async function save() {
    if (!counterId) return;
    await api.patch(`/counters/${counterId}`, { goalPerDay: Number(goal) });
    await api.get(`/counters/${counterId}/summary`);
    setMsg("Saved!"); setTimeout(()=>setMsg(""), 1200);
  }

  return (
    <div className="card settings">
      <h2>Settings</h2>
      <label><span>Daily Goal</span>
        <input type="number" min="1" value={goal} onChange={(e)=>setGoal(e.target.value)} />
      </label>
      <button className="btn" onClick={save}>Save</button>
      {msg && <span className="ok">{msg}</span>}
    </div>
  );
}

/* ---------- Misc ---------- */
function Splash() { return <div className="splash"><div className="spinner" /><div>Loading…</div></div>; }
function CardLoader() { return <div className="card loader">Loading…</div>; }

/* ---------- Router ---------- */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/jaap" element={<Protected><JaapPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
