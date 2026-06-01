import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, set, get, runTransaction } from "firebase/database";

// ============================================================
// Summer Burger Count 🍔
// Real-time, multi-player burger tally for up to 15 friends.
// Backend: Firebase Realtime Database. Hosting: GitHub Pages.
// Two tabs: Counter (+1 / -1 with burger confetti) and Leaderboard
// (gold/silver/bronze podium + full ranked list).
// ============================================================

// ---- Config you can tweak ---------------------------------
const MAX_P = 30; // max number of players
const ROOT = "burgers"; // Realtime Database node that holds everyone's counts
const ME_KEY = "burgerName_v1"; // localStorage key for "who am I" auto-login
const THEME_KEY = "burgerTheme_v1"; // localStorage key for light/dark choice
const ADMIN_PW = "ualumni"; // password for the hidden admin reset menu
const FALL_EMOJIS = ["🍔", "🍔", "🍔", "🍔", "🍟", "🥤", "🧀"];

// ---- Theme tokens -----------------------------------------
const LT = {
  name: "light",
  bg: "#FFF4DF",
  glow1: "rgba(245,185,22,0.35)",
  glow2: "rgba(226,62,46,0.18)",
  card: "#FFFFFF",
  cardSoft: "#FFFBF2",
  text: "#3A2316",
  subt: "#9A7A60",
  line: "#F0DFBF",
  ketchup: "#E23E2E",
  ketchupD: "#B92C20",
  mustard: "#F5B916",
  lettuce: "#79B33B",
  bun: "#E39A4C",
  tabInactive: "#F4E6CB",
  shadow: "0 14px 30px -12px rgba(160,90,30,0.35)",
  gold: "#F6B917",
  silver: "#C9B79B",
  bronze: "#D08A4B",
};
const DT = {
  name: "dark",
  bg: "#180F08",
  glow1: "rgba(245,185,22,0.20)",
  glow2: "rgba(226,62,46,0.18)",
  card: "#271A10",
  cardSoft: "#20150C",
  text: "#FCE9CF",
  subt: "#B7977A",
  line: "#3B2818",
  ketchup: "#F0533F",
  ketchupD: "#C23624",
  mustard: "#F8C53A",
  lettuce: "#8FC850",
  bun: "#E7A458",
  tabInactive: "#2E2013",
  shadow: "0 16px 34px -14px rgba(0,0,0,0.7)",
  gold: "#F8C53A",
  silver: "#CDBBA0",
  bronze: "#D98F4F",
};

// ---- Helpers ----------------------------------------------
function sanitize(raw) {
  return String(raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}
// Firebase keys can't contain . $ # [ ] / or control chars.
// encodeURIComponent handles all of those except ".", which we replace too.
function keyFor(name) {
  return encodeURIComponent(name.trim().toLowerCase()).replace(/\./g, "%2E");
}

export default function App() {
  const [th, setTh] = useState(() =>
    (typeof localStorage !== "undefined" && localStorage.getItem(THEME_KEY) === "dark") ? DT : LT
  );
  const [tab, setTab] = useState("counter");
  const [players, setPlayers] = useState([]); // sorted [{key,name,count}]
  const [myName, setMyName] = useState(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(ME_KEY) || null : null
  );
  const [loading, setLoading] = useState(true);
  const [connErr, setConnErr] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [pop, setPop] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [err, setErr] = useState("");
  // admin reset modal state
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [pending, setPending] = useState(null); // "counts" | "people" | null
  const [adminMsg, setAdminMsg] = useState("");
  const cid = useRef(0);

  // ---- Real-time subscription (instant updates from every device) ----
  useEffect(() => {
    const unsub = onValue(
      ref(db, ROOT),
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([key, v]) => ({
          key,
          name: (v && v.name) || "?",
          count: Math.max(0, (v && v.count) || 0),
        }));
        list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        setPlayers(list);
        setConnErr(false);
        setLoading(false);
      },
      () => {
        setConnErr(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // persist theme
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, th.name); } catch (e) {}
  }, [th]);

  const myKey = myName ? keyFor(myName) : null;
  const myRecord = players.find((p) => p.key === myKey);
  const myCount = myRecord ? myRecord.count : 0;

  async function register(raw) {
    setErr("");
    const name = sanitize(raw);
    if (!name) { setErr("Enter a name first."); return; }
    const key = keyFor(name);
    try {
      const snap = await get(ref(db, ROOT));
      const val = snap.val() || {};
      const exists = Object.prototype.hasOwnProperty.call(val, key);
      if (!exists && Object.keys(val).length >= MAX_P) {
        setErr(`The grill is full — ${MAX_P} players max. Tap an existing name to log in.`);
        return;
      }
      if (!exists) {
        await set(ref(db, `${ROOT}/${key}`), { name, count: 0 });
      }
      try { localStorage.setItem(ME_KEY, name); } catch (e) {}
      setMyName(name);
      setNameInput("");
    } catch (e) {
      setErr("Couldn't reach the database — double-check your Firebase config & rules.");
    }
  }

  function rainBurgers(n) {
    const pieces = [];
    for (let i = 0; i < n; i++) {
      cid.current += 1;
      const dur = 1500 + Math.random() * 1400;
      pieces.push({
        id: cid.current,
        left: Math.random() * 96,
        size: 22 + Math.random() * 30,
        dur,
        delay: Math.random() * 350,
        rot: (Math.random() * 2 - 1) * 540,
        sway: (Math.random() * 2 - 1) * 40,
        emoji: FALL_EMOJIS[(Math.random() * FALL_EMOJIS.length) | 0],
      });
    }
    setConfetti((c) => [...c, ...pieces]);
    const maxLife = Math.max(...pieces.map((p) => p.dur + p.delay)) + 200;
    setTimeout(() => {
      const ids = new Set(pieces.map((p) => p.id));
      setConfetti((c) => c.filter((p) => !ids.has(p.id)));
    }, maxLife);
  }

  // atomic increment/decrement so two devices never clobber each other
  async function change(delta) {
    if (!myName) return;
    const key = keyFor(myName);
    if (delta > 0) { rainBurgers(16); setPop((x) => x + 1); }
    try {
      await runTransaction(ref(db, `${ROOT}/${key}`), (cur) => {
        const base = cur || { name: myName, count: 0 };
        return { name: base.name || myName, count: Math.max(0, (base.count || 0) + delta) };
      });
    } catch (e) {}
  }

  function switchUser() {
    try { localStorage.removeItem(ME_KEY); } catch (e) {}
    setMyName(null);
    setNameInput("");
    setErr("");
  }

  // ---- Admin reset menu ----
  function openAdmin() {
    setAdminOpen(true);
    setAdminAuthed(false);
    setPw("");
    setPwErr(false);
    setPending(null);
    setAdminMsg("");
  }
  function closeAdmin() {
    setAdminOpen(false);
  }
  function tryAuth() {
    if (pw === ADMIN_PW) {
      setAdminAuthed(true);
      setPwErr(false);
    } else {
      setPwErr(true);
    }
  }
  async function runReset(kind) {
    try {
      if (kind === "counts") {
        // keep players, zero every count
        const snap = await get(ref(db, ROOT));
        const val = snap.val() || {};
        const zeroed = {};
        for (const k of Object.keys(val)) {
          zeroed[k] = { name: (val[k] && val[k].name) || "?", count: 0 };
        }
        await set(ref(db, ROOT), zeroed);
        setAdminMsg("All counts reset to 0.");
      } else if (kind === "people") {
        // wipe everyone and their counts
        await set(ref(db, ROOT), null);
        setAdminMsg("All players and counts cleared.");
      }
    } catch (e) {
      setAdminMsg("Something went wrong — check your connection and rules.");
    }
    setPending(null);
  }

  const S = styles(th);

  return (
    <div style={S.root}>
      {/* falling burgers */}
      <div style={S.rainLayer}>
        {confetti.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              top: 0,
              left: p.left + "%",
              fontSize: p.size,
              animation: `bfall ${p.dur}ms ${p.delay}ms cubic-bezier(.45,.05,.55,.95) forwards`,
              ["--r"]: p.rot + "deg",
              ["--sx"]: p.sway + "px",
              willChange: "transform, opacity",
              filter: "drop-shadow(0 6px 6px rgba(0,0,0,.25))",
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <div style={S.shell}>
        <header style={S.header}>
          <div style={S.brand}>
            <span style={S.brandBurger}>🍔</span>
            <div>
              <h1 style={S.title}>Summer Burger Count</h1>
              <p style={S.subtitle}>Tally your patties · {players.length}/{MAX_P} players</p>
            </div>
          </div>
          <button
            style={S.iconBtn}
            onClick={() => setTh(th.name === "light" ? DT : LT)}
            title="Toggle theme"
          >
            {th.name === "light" ? "🌙" : "☀️"}
          </button>
        </header>

        <div style={S.tabs}>
          <button style={S.tab(tab === "counter")} onClick={() => setTab("counter")}>
            🍔 Counter
          </button>
          <button style={S.tab(tab === "board")} onClick={() => setTab("board")}>
            🏆 Leaderboard
          </button>
        </div>

        {connErr && (
          <div style={S.warn}>
            Can't reach the database. Make sure you pasted your Firebase config into
            <code style={S.code}> src/firebase.js</code> and set the Realtime Database rules
            (see README).
          </div>
        )}

        {loading ? (
          <div style={S.card}><div style={S.empty}>Firing up the grill…</div></div>
        ) : tab === "counter" ? (
          <CounterTab
            S={S} myName={myName} myCount={myCount} pop={pop} players={players}
            nameInput={nameInput} setNameInput={setNameInput}
            register={register} change={change} switchUser={switchUser} err={err}
          />
        ) : (
          <BoardTab S={S} th={th} players={players} myKey={myKey} />
        )}

        <footer style={S.footer}>
          Have a great summer 🌞 · counts update live for everyone
        </footer>
        <div style={S.adminBar}>
          <button style={S.adminBtn} onClick={openAdmin}>🔧 Admin</button>
        </div>
      </div>

      {adminOpen && (
        <div style={S.modalOverlay} onClick={closeAdmin}>
          <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHead}>
              <span style={S.modalTitle}>🔧 Admin</span>
              <button style={S.ghostBtn} onClick={closeAdmin}>close</button>
            </div>

            {!adminAuthed ? (
              <>
                <p style={S.muted}>Enter the admin password.</p>
                <div style={S.joinRow}>
                  <input
                    style={S.input}
                    type="password"
                    placeholder="Password"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setPwErr(false); }}
                    onKeyDown={(e) => e.key === "Enter" && tryAuth()}
                    autoFocus
                  />
                  <button style={S.primary} onClick={tryAuth}>Enter</button>
                </div>
                {pwErr && <p style={S.err}>Wrong password.</p>}
              </>
            ) : (
              <>
                <p style={S.muted}>Choose a reset. These cannot be undone.</p>
                {!pending ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button style={S.dangerOutline} onClick={() => { setPending("counts"); setAdminMsg(""); }}>
                      Reset all counts to 0
                      <span style={S.dangerSub}>Keeps everyone on the board, sets every burger count to 0.</span>
                    </button>
                    <button style={S.dangerOutline} onClick={() => { setPending("people"); setAdminMsg(""); }}>
                      Remove all players & counts
                      <span style={S.dangerSub}>Clears the whole board — everyone has to rejoin.</span>
                    </button>
                  </div>
                ) : (
                  <div style={S.confirmBox}>
                    <p style={S.confirmText}>
                      {pending === "counts"
                        ? "Reset every player's count to 0?"
                        : "Permanently remove all players and their counts?"}
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button style={S.ghostBtnLg} onClick={() => setPending(null)}>Cancel</button>
                      <button style={S.danger} onClick={() => runReset(pending)}>Yes, do it</button>
                    </div>
                  </div>
                )}
                {adminMsg && <p style={S.adminMsg}>{adminMsg}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Counter tab ------------------------------------------
function CounterTab({
  S, myName, myCount, pop, players, nameInput, setNameInput,
  register, change, switchUser, err,
}) {
  if (!myName) {
    const full = players.length >= MAX_P;
    return (
      <div style={S.card}>
        <h2 style={S.h2}>Who's grilling?</h2>
        <p style={S.muted}>Pick your name or add yourself to the cookout.</p>

        {players.length > 0 && (
          <div style={S.chips}>
            {players.map((p) => (
              <button key={p.key} style={S.chip} onClick={() => register(p.name)}>
                {p.name} · {p.count}🍔
              </button>
            ))}
          </div>
        )}

        {!full ? (
          <div style={S.joinRow}>
            <input
              style={S.input}
              placeholder="Your name"
              value={nameInput}
              maxLength={18}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register(nameInput)}
            />
            <button style={S.primary} onClick={() => register(nameInput)}>Join 🔥</button>
          </div>
        ) : (
          <p style={S.muted}>The grill is full ({MAX_P} players). Tap a name above to log in.</p>
        )}
        {err && <p style={S.err}>{err}</p>}
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.meRow}>
        <span style={S.meName}>{myName}</span>
        <button style={S.ghostBtn} onClick={switchUser}>switch</button>
      </div>

      <div style={S.counterStage}>
        <div style={S.bigBurger}>🍔</div>
        <div key={pop} style={S.bigCount}>{myCount}</div>
        <div style={S.countLabel}>{myCount === 1 ? "burger" : "burgers"} this summer</div>
      </div>

      <div style={S.btnRow}>
        <button style={S.minus} onClick={() => change(-1)} disabled={myCount === 0}>−1</button>
        <button style={S.plus} onClick={() => change(1)}>+1 Burger 🍔</button>
      </div>
      <p style={S.tinyHint}>Eat one, tap +1. Confetti included.</p>
    </div>
  );
}

// ---- Leaderboard tab --------------------------------------
function BoardTab({ S, th, players, myKey }) {
  if (players.length === 0) {
    return (
      <div style={S.card}>
        <div style={S.empty}>No burgers yet — be the first to fire up the grill! 🔥</div>
      </div>
    );
  }
  const top = players.slice(0, 3);
  const maxCount = Math.max(1, players[0].count);
  const order = [top[1], top[0], top[2]].filter(Boolean); // display: 2nd, 1st, 3rd
  // indexed by actual rank: 0 = 1st, 1 = 2nd, 2 = 3rd
  const medals = ["🥇", "🥈", "🥉"];
  const podColors = [th.gold, th.silver, th.bronze];
  const rankOf = (p) => top.findIndex((t) => t.key === p.key);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={S.card}>
        <h2 style={S.h2}>🏆 The Podium</h2>
        <div style={S.podium}>
          {order.map((p) => {
            const r = rankOf(p); // 0=gold,1=silver,2=bronze
            const h = r === 0 ? 108 : r === 1 ? 70 : 48;
            return (
              <div key={p.key} style={S.podCol}>
                <div style={S.podMedal}>{medals[r]}</div>
                <div style={S.podName(p.key === myKey)}>{p.name}</div>
                <div style={S.podCount}>{p.count}</div>
                <div
                  style={{
                    ...S.podBlock,
                    height: h,
                    background: `linear-gradient(180deg, ${podColors[r]}, ${th.bun})`,
                  }}
                >
                  <span style={S.podRankNum}>{r + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>All Players</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map((p, i) => {
            const mine = p.key === myKey;
            const pct = Math.round((p.count / maxCount) * 100);
            return (
              <div key={p.key} style={S.rankRow(mine)}>
                <span style={S.rankNum}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.rankTop}>
                    <span style={S.rankName}>{p.name} {mine ? "(you)" : ""}</span>
                    <span style={S.rankCount}>{p.count} 🍔</span>
                  </div>
                  <div style={S.barTrack}>
                    <div style={{ ...S.barFill, width: pct + "%" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Styles -----------------------------------------------
function styles(th) {
  const font = "'Nunito', system-ui, sans-serif";
  const display = "'Bungee', 'Nunito', sans-serif";
  return {
    root: {
      minHeight: "100%",
      width: "100%",
      fontFamily: font,
      color: th.text,
      background: `radial-gradient(120% 80% at 12% -10%, ${th.glow1}, transparent 60%), radial-gradient(120% 80% at 100% 0%, ${th.glow2}, transparent 55%), ${th.bg}`,
      position: "relative",
      overflow: "hidden",
      transition: "background .3s, color .3s",
    },
    rainLayer: { position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 },
    shell: { maxWidth: 720, margin: "0 auto", padding: "22px 16px 40px", position: "relative", zIndex: 1 },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    brandBurger: { fontSize: 40, display: "inline-block", animation: "wiggle 2.8s ease-in-out infinite", transformOrigin: "60% 60%" },
    title: { fontFamily: display, fontSize: 26, lineHeight: 1.05, margin: 0, color: th.ketchup, letterSpacing: 0.3 },
    subtitle: { margin: "4px 0 0", fontSize: 13, color: th.subt, fontWeight: 700 },
    iconBtn: { border: "none", background: th.card, color: th.text, width: 44, height: 44, borderRadius: 14, fontSize: 20, cursor: "pointer", boxShadow: th.shadow },
    tabs: { display: "flex", gap: 8, background: th.tabInactive, padding: 6, borderRadius: 16, marginBottom: 16 },
    tab: (active) => ({
      flex: 1, border: "none", cursor: "pointer", padding: "12px 10px", borderRadius: 12,
      fontFamily: font, fontWeight: 800, fontSize: 15, color: active ? "#fff" : th.subt,
      background: active ? th.ketchup : "transparent", boxShadow: active ? th.shadow : "none", transition: "all .18s",
    }),
    card: { background: th.card, borderRadius: 22, padding: 22, boxShadow: th.shadow, border: `1px solid ${th.line}`, animation: "rise .35s ease both" },
    h2: { fontFamily: display, fontSize: 18, margin: "0 0 4px", color: th.text },
    muted: { color: th.subt, fontSize: 14, margin: "0 0 14px", fontWeight: 700 },
    tinyHint: { textAlign: "center", color: th.subt, fontSize: 12.5, fontWeight: 700, margin: "14px 0 0" },
    err: { color: th.ketchup, fontWeight: 800, fontSize: 13.5, marginTop: 10 },
    warn: { background: th.cardSoft, border: `1px dashed ${th.bun}`, color: th.subt, borderRadius: 14, padding: "12px 14px", fontSize: 13, fontWeight: 700, marginBottom: 16 },
    code: { fontFamily: "ui-monospace, monospace", color: th.ketchup },
    empty: { textAlign: "center", padding: "30px 10px", color: th.subt, fontWeight: 800, fontSize: 16 },

    chips: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    chip: { border: `1.5px solid ${th.line}`, background: th.cardSoft, color: th.text, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 13.5, cursor: "pointer" },
    joinRow: { display: "flex", gap: 8 },
    input: { flex: 1, border: `1.5px solid ${th.line}`, background: th.cardSoft, color: th.text, borderRadius: 14, padding: "13px 14px", fontSize: 16, fontFamily: font, fontWeight: 700, outline: "none" },
    primary: { border: "none", background: th.ketchup, color: "#fff", borderRadius: 14, padding: "0 20px", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: th.shadow },

    meRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    meName: { fontFamily: display, fontSize: 18, color: th.bun },
    ghostBtn: { border: `1.5px solid ${th.line}`, background: "transparent", color: th.subt, borderRadius: 10, padding: "6px 12px", fontWeight: 800, fontSize: 12.5, cursor: "pointer" },
    counterStage: { textAlign: "center", padding: "18px 0 8px" },
    bigBurger: { fontSize: 64, lineHeight: 1, marginBottom: 2 },
    bigCount: { fontFamily: display, fontSize: 88, lineHeight: 1, color: th.ketchup, animation: "popnum .35s ease", textShadow: `0 6px 0 ${th.bun}` },
    countLabel: { color: th.subt, fontWeight: 800, fontSize: 15, marginTop: 6 },
    btnRow: { display: "flex", gap: 12, marginTop: 18 },
    minus: { width: 84, border: `2px solid ${th.line}`, background: th.cardSoft, color: th.text, borderRadius: 16, padding: "16px 0", fontWeight: 900, fontSize: 20, cursor: "pointer" },
    plus: { flex: 1, border: "none", background: `linear-gradient(180deg, ${th.ketchup}, ${th.ketchupD})`, color: "#fff", borderRadius: 16, padding: "16px 0", fontWeight: 900, fontSize: 20, cursor: "pointer", boxShadow: th.shadow },

    podium: { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, marginTop: 14 },
    podCol: { flex: 1, maxWidth: 150, display: "flex", flexDirection: "column", alignItems: "center" },
    podBurgers: { fontSize: 15, marginBottom: 2, height: 20 },
    podMedal: { fontSize: 30, lineHeight: 1 },
    podName: (mine) => ({ fontWeight: 900, fontSize: 13.5, marginTop: 2, color: mine ? th.ketchup : th.text, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
    podCount: { fontFamily: display, fontSize: 22, color: th.text, lineHeight: 1.1 },
    podBlock: { width: "100%", borderRadius: "12px 12px 0 0", marginTop: 8, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8, boxShadow: "inset 0 4px 12px rgba(255,255,255,.25)" },
    podRankNum: { fontFamily: display, fontSize: 22, color: "rgba(255,255,255,.9)" },

    rankRow: (mine) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: mine ? th.cardSoft : "transparent", border: mine ? `1.5px solid ${th.bun}` : "1.5px solid transparent" }),
    rankNum: { fontFamily: display, fontSize: 16, color: th.bun, width: 26, textAlign: "center", flexShrink: 0 },
    rankTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
    rankName: { fontWeight: 800, fontSize: 14.5, color: th.text },
    rankCount: { fontWeight: 900, fontSize: 14, color: th.subt, flexShrink: 0 },
    barTrack: { height: 9, borderRadius: 6, background: th.tabInactive, marginTop: 5, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${th.mustard}, ${th.ketchup})`, transition: "width .4s ease" },

    footer: { textAlign: "center", color: th.subt, fontSize: 12.5, fontWeight: 700, marginTop: 22 },

    // admin button at the bottom
    adminBar: { display: "flex", justifyContent: "center", marginTop: 14 },
    adminBtn: {
      border: `1.5px solid ${th.line}`, background: th.card, color: th.subt, borderRadius: 12,
      padding: "9px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: th.shadow,
    },

    // admin modal
    modalOverlay: {
      position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 18, background: "rgba(20,10,4,0.55)", backdropFilter: "blur(2px)",
    },
    modalCard: {
      width: "100%", maxWidth: 420, background: th.card, borderRadius: 22, padding: 22,
      boxShadow: th.shadow, border: `1px solid ${th.line}`, animation: "rise .25s ease both",
    },
    modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    modalTitle: { fontFamily: display, fontSize: 18, color: th.text },
    dangerOutline: {
      textAlign: "left", border: `1.5px solid ${th.line}`, background: th.cardSoft, color: th.text,
      borderRadius: 14, padding: "13px 15px", cursor: "pointer", fontWeight: 900, fontSize: 14.5,
      display: "flex", flexDirection: "column", gap: 3,
    },
    dangerSub: { fontWeight: 700, fontSize: 12, color: th.subt },
    confirmBox: { border: `1.5px solid ${th.bun}`, background: th.cardSoft, borderRadius: 14, padding: 15 },
    confirmText: { fontWeight: 800, fontSize: 14.5, color: th.text, margin: "0 0 12px" },
    danger: {
      flex: 1, border: "none", background: `linear-gradient(180deg, ${th.ketchup}, ${th.ketchupD})`,
      color: "#fff", borderRadius: 12, padding: "12px 0", fontWeight: 900, fontSize: 14.5, cursor: "pointer",
    },
    ghostBtnLg: {
      flex: 1, border: `1.5px solid ${th.line}`, background: "transparent", color: th.subt,
      borderRadius: 12, padding: "12px 0", fontWeight: 800, fontSize: 14.5, cursor: "pointer",
    },
    adminMsg: { marginTop: 12, fontWeight: 800, fontSize: 13.5, color: th.lettuce },
  };
}
