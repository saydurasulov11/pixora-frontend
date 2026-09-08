import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, Grid3x3, User, Home, Loader2, X,
  MessagesSquare, ArrowLeft, BadgeCheck, Search, Clapperboard, UserPlus,
  UserCheck, Bell, PlusSquare, Image as ImageIcon, Video as VideoIcon,
  Check, CheckCheck, Plus, Volume2, VolumeX,
} from "lucide-react";

/**
 * ============================================================================
 * SARDOGRAM — Instagram + TikTok + WhatsApp uslublari birlashtirilgan ilova
 * ============================================================================
 *
 * MUHIM: TURLI QURILMALAR (masalan sizning telefoningiz va onangizning
 * telefoni) bir-birini ko'rishi va yozishishi uchun ma'lumotlar BITTA umumiy
 * joyda saqlanishi shart. Buning uchun bu kod Firebase Firestore'dan
 * foydalanadi — bu Google'ning BEPUL, faqat brauzer orqali sozlanadigan
 * ma'lumotlar bazasi. Sizga CMD yoki server boshqarish SHART EMAS.
 *
 * SOZLASH (bir martalik, 5 daqiqa, faqat brauzerda):
 *   1) https://console.firebase.google.com ga Google akkauntingiz bilan kiring
 *   2) "Add project" — istalgan nom bering (masalan "sardogram") — Create
 *   3) Chap menyudan "Build" → "Firestore Database" → "Create database"
 *      → "Start in test mode" ni tanlang → Enable
 *   4) Loyihaning bosh sahifasida "</>" (Web) belgisini bosib yangi web-ilova
 *      qo'shing — nom bering — "Register app"
 *   5) Sizga ko'rsatiladigan firebaseConfig obyektini nusxalab, pastdagi
 *      FIREBASE_CONFIG ichiga joylashtiring (apiKey, projectId va h.k.)
 *   6) Saqlang — tayyor! Endi istalgan qurilmadan kirgan har bir kishi
 *      bir-birini REAL VAQTDA ko'radi va yozishadi.
 *
 * Config qo'yilmagan bo'lsa, ilova baribir ishlaydi, lekin faqat shu
 * qurilmaning o'zida (localStorage orqali zaxira rejimida).
 * ============================================================================
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCbf3T-pfxHbTgeu5VWlG_trQwIP45CEfk",
  authDomain: "sardogram.firebaseapp.com",
  projectId: "sardogram",
  storageBucket: "sardogram.firebasestorage.app",
  messagingSenderId: "134388428662",
  appId: "1:134388428662:web:b45bdfab1eb5f9ef37d457",
};
const FIREBASE_READY = !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

// ---------- Ranglar va shrift ----------
const C = {
  bg: "#0a0b0e",
  card: "#15161b",
  cardAlt: "#1c1e25",
  border: "#252730",
  pink: "#ff3d6e",
  blue: "#3ddbff",
  green: "#25d366", // WhatsApp yashil — o'qilgan belgi uchun
  ink: "#f5f4f2",
  inkDim: "#8f8d99",
};
const FONT = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const AVATAR_COLORS = ["#ff3d6e", "#3ddbff", "#ffb84d", "#8b6bff", "#4dd48a", "#ff7a5c"];
const LS_PREFIX = "sardogram_";
const lsKey = (n) => `${LS_PREFIX}${n}`;
const STORY_TTL = 24 * 60 * 60 * 1000; // 24 soat — Instagram uslubida hikoyalar

// ---------- localStorage yordamchilari (zaxira rejim) ----------
function readLS(name, fallback) {
  try {
    const raw = localStorage.getItem(lsKey(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeLS(name, value) { localStorage.setItem(lsKey(name), JSON.stringify(value)); }

// ---------- Umumiy yordamchilar ----------
function timeAgo(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "hozir";
  if (d < 3600) return `${Math.floor(d / 60)}d oldin`;
  if (d < 86400) return `${Math.floor(d / 3600)}s oldin`;
  return `${Math.floor(d / 86400)}k oldin`;
}
function convoKey(a, b) { return [a, b].sort().join("::"); }
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// FIREBASE QATLAMI — barcha real-time bog'lanish shu yerda izolyatsiya qilingan
// ============================================================================
function useFirestoreBackend() {
  const [db, setDb] = useState(null);
  const [ready, setReady] = useState(!FIREBASE_READY); // config yo'q bo'lsa darhol "tayyor" (LS rejimi)
  const fns = useRef(null);

  useEffect(() => {
    if (!FIREBASE_READY) return;
    (async () => {
      const { initializeApp } = await import(/* @vite-ignore */ `${SDK}/firebase-app.js`);
      const firestore = await import(/* @vite-ignore */ `${SDK}/firebase-firestore.js`);
      const app = initializeApp(FIREBASE_CONFIG);
      const database = firestore.getFirestore(app);
      fns.current = firestore;
      setDb(database);
      setReady(true);
    })();
  }, []);

  return { db, ready, fns: fns.current, enabled: FIREBASE_READY };
}

export default function Sardogram() {
  const { db, ready, fns, enabled } = useFirestoreBackend();

  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState({});
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [stories, setStories] = useState([]);
  const [following, setFollowing] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dms, setDms] = useState({});

  const [tab, setTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [storyViewer, setStoryViewer] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authColor, setAuthColor] = useState(AVATAR_COLORS[0]);
  const [authAvatar, setAuthAvatar] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftMedia, setDraftMedia] = useState("");
  const [draftIsVideo, setDraftIsVideo] = useState(false);

  const [reelComposerOpen, setReelComposerOpen] = useState(false);
  const [reelMedia, setReelMedia] = useState("");
  const [reelCaption, setReelCaption] = useState("");
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyMedia, setStoryMedia] = useState("");

  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});

  const [dmTarget, setDmTarget] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const chatEndRef = useRef(null);
  const [reelMuted, setReelMuted] = useState(true);

  // -------------------- localStorage zaxira: bir brauzerdagi tablar --------------------
  useEffect(() => {
    if (enabled) return; // Firebase yoqilgan bo'lsa localStorage-eventga ehtiyoj yo'q
    const sync = () => {
      setUsers(readLS("users", {}));
      setPosts(readLS("posts", []));
      setReels(readLS("reels", []));
      setStories(readLS("stories", []));
      setFollowing(readLS("following", []));
      setNotifications(readLS("notifs", []));
      setDms(readLS("dms", {}));
    };
    sync();
    const savedMe = readLS("me", null);
    if (savedMe) setMe(savedMe);
    setBooting(false);

    const onStorage = (e) => { if (e.key && e.key.startsWith(LS_PREFIX)) sync(); };
    window.addEventListener("storage", onStorage);
    const bc = "BroadcastChannel" in window ? new BroadcastChannel("sardogram") : null;
    if (bc) bc.onmessage = sync;
    const poll = setInterval(sync, 1500); // bitta tab ichida ham darhol yangilanish uchun zaxira
    return () => {
      window.removeEventListener("storage", onStorage);
      if (bc) bc.close();
      clearInterval(poll);
    };
  }, [enabled]);

  const pingTabs = () => {
    if ("BroadcastChannel" in window) new BroadcastChannel("sardogram").postMessage("update");
  };

  // -------------------- Firebase: real-time obunalar --------------------
  useEffect(() => {
    if (!enabled || !ready || !db || !fns) return;
    const { collection, onSnapshot, query, orderBy } = fns;

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const next = {};
      snap.forEach((d) => { next[d.id] = d.data(); });
      setUsers(next);
    });
    const unsubPosts = onSnapshot(query(collection(db, "posts"), orderBy("ts", "desc")), (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubReels = onSnapshot(query(collection(db, "reels"), orderBy("ts", "desc")), (snap) => {
      setReels(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubStories = onSnapshot(query(collection(db, "stories"), orderBy("ts", "desc")), (snap) => {
      const now = Date.now();
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => now - s.ts < STORY_TTL));
    });
    setBooting(false);

    const savedMe = readLS("me", null);
    if (savedMe) setMe(savedMe);

    return () => { unsubUsers(); unsubPosts(); unsubReels(); unsubStories(); };
  }, [enabled, ready, db, fns]);

  // Men uchun bildirishnomalar va following ro'yxati (men login qilganda ulanadi)
  useEffect(() => {
    if (!me) return;
    if (!enabled || !ready || !db || !fns) {
      setFollowing(readLS("following_" + me.username, []));
      setNotifications(readLS("notifs_" + me.username, []));
      return;
    }
    const { doc, onSnapshot, collection, query, orderBy } = fns;
    const unsubFollow = onSnapshot(doc(db, "follows", me.username), (d) => {
      setFollowing(d.exists() ? d.data().following || [] : []);
    });
    const unsubNotif = onSnapshot(
      query(collection(db, "notifications", me.username, "items"), orderBy("ts", "desc")),
      (snap) => setNotifications(snap.docs.map((d2) => ({ id: d2.id, ...d2.data() })))
    );
    return () => { unsubFollow(); unsubNotif(); };
  }, [me, enabled, ready, db, fns]);

  // Ochiq suhbat uchun real-time xabarlar (WhatsApp uslubida)
  useEffect(() => {
    if (!me || !dmTarget) return;
    const k = convoKey(me.username, dmTarget);
    if (!enabled || !ready || !db || !fns) {
      const sync = () => setDms((prev) => ({ ...prev, [k]: readLS("dms", {})[k] || [] }));
      sync();
      const poll = setInterval(sync, 1200);
      return () => clearInterval(poll);
    }
    const { collection, onSnapshot, query, orderBy } = fns;
    const unsub = onSnapshot(
      query(collection(db, "messages", k, "thread"), orderBy("ts", "asc")),
      (snap) => setDms((prev) => ({ ...prev, [k]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }))
    );
    return () => unsub();
  }, [me, dmTarget, enabled, ready, db, fns]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dms, dmTarget]);

  // -------------------- Yozish (Firebase yoki localStorage'ga) --------------------
  const writeUser = async (username, data) => {
    if (enabled && db && fns) {
      await fns.setDoc(fns.doc(db, "users", username), data, { merge: true });
    } else {
      const next = { ...readLS("users", {}), [username]: data };
      writeLS("users", next); setUsers(next); pingTabs();
    }
  };
  const addPost = async (post) => {
    if (enabled && db && fns) {
      await fns.addDoc(fns.collection(db, "posts"), post);
    } else {
      const next = [{ id: `p_${Date.now()}`, ...post }, ...readLS("posts", [])];
      writeLS("posts", next); setPosts(next); pingTabs();
    }
  };
  const addReel = async (reel) => {
    if (enabled && db && fns) {
      await fns.addDoc(fns.collection(db, "reels"), reel);
    } else {
      const next = [{ id: `r_${Date.now()}`, ...reel }, ...readLS("reels", [])];
      writeLS("reels", next); setReels(next); pingTabs();
    }
  };
  const addStory = async (story) => {
    if (enabled && db && fns) {
      await fns.addDoc(fns.collection(db, "stories"), story);
    } else {
      const next = [{ id: `s_${Date.now()}`, ...story }, ...readLS("stories", [])];
      writeLS("stories", next); setStories(next); pingTabs();
    }
  };
  const updatePost = async (id, data) => {
    if (enabled && db && fns) {
      await fns.updateDoc(fns.doc(db, "posts", id), data);
    } else {
      const next = posts.map((p) => (p.id === id ? { ...p, ...data } : p));
      writeLS("posts", next); setPosts(next); pingTabs();
    }
  };
  const updateReel = async (id, data) => {
    if (enabled && db && fns) {
      await fns.updateDoc(fns.doc(db, "reels", id), data);
    } else {
      const next = reels.map((r) => (r.id === id ? { ...r, ...data } : r));
      writeLS("reels", next); setReels(next); pingTabs();
    }
  };
  const setFollowingRemote = async (username, list) => {
    if (enabled && db && fns) {
      await fns.setDoc(fns.doc(db, "follows", username), { following: list }, { merge: true });
    } else {
      writeLS("following_" + username, list); setFollowing(list); pingTabs();
    }
  };
  const pushNotification = async (toUser, fromUser, text) => {
    const item = { from: fromUser, text, ts: Date.now() };
    if (enabled && db && fns) {
      await fns.addDoc(fns.collection(db, "notifications", toUser, "items"), item);
    } else {
      const listKey = "notifs_" + toUser;
      const next = [{ id: Date.now(), ...item }, ...readLS(listKey, [])];
      writeLS(listKey, next);
      if (me && toUser === me.username) setNotifications(next);
      pingTabs();
    }
  };
  const sendMessageRemote = async (k, msg) => {
    if (enabled && db && fns) {
      await fns.addDoc(fns.collection(db, "messages", k, "thread"), msg);
    } else {
      const all = readLS("dms", {});
      const next = { ...all, [k]: [...(all[k] || []), { id: Date.now(), ...msg }] };
      writeLS("dms", next); setDms(next); pingTabs();
    }
  };

  // -------------------- Auth --------------------
  const submitAuth = async () => {
    const name = authName.trim();
    if (!name) { setAuthError("Ismingizni kiriting"); return; }
    setAuthBusy(true);
    try {
      let existing = users[name];
      if (!existing && enabled && db && fns) {
        const snap = await fns.getDoc(fns.doc(db, "users", name));
        existing = snap.exists() ? snap.data() : null;
      }
      if (authMode === "register") {
        if (existing) { setAuthError(`"${name}" nomi band. Boshqasini tanlang.`); setAuthBusy(false); return; }
        const profile = { bio: "", color: authColor, avatar: authAvatar.trim(), verified: false, createdAt: Date.now() };
        await writeUser(name, profile);
        const meProfile = { username: name, ...profile };
        setMe(meProfile); writeLS("me", meProfile);
      } else {
        if (!existing) { setAuthError(`"${name}" nomli akkaunt topilmadi.`); setAuthBusy(false); return; }
        const meProfile = { username: name, ...existing };
        setMe(meProfile); writeLS("me", meProfile);
      }
      setAuthError("");
    } catch (e) {
      setAuthError("Xatolik yuz berdi, qayta urinib ko'ring.");
    }
    setAuthBusy(false);
  };

  const logout = () => { setMe(null); localStorage.removeItem(lsKey("me")); setDmTarget(null); };

  const buyVerification = async () => {
    if (!me) return;
    await writeUser(me.username, { ...(users[me.username] || {}), verified: true });
    const updated = { ...me, verified: true };
    setMe(updated); writeLS("me", updated);
  };

  // -------------------- Media --------------------
  const handleDraftFile = async (e, isVideo) => {
    const file = e.target.files[0]; if (!file) return;
    setDraftMedia(await fileToDataUrl(file)); setDraftIsVideo(isVideo);
  };
  const handleReelFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setReelMedia(await fileToDataUrl(file));
  };
  const handleStoryFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setStoryMedia(await fileToDataUrl(file));
  };

  // -------------------- Aksiyalar --------------------
  const submitPost = async () => {
    if ((!draftText.trim() && !draftMedia) || !me) return;
    await addPost({ author: me.username, text: draftText.trim(), media: draftMedia, isVideo: draftIsVideo, ts: Date.now(), likes: [], comments: [] });
    setDraftText(""); setDraftMedia(""); setDraftIsVideo(false); setComposerOpen(false);
  };
  const submitReel = async () => {
    if (!reelMedia || !me) return;
    await addReel({ author: me.username, videoUrl: reelMedia, caption: reelCaption.trim(), ts: Date.now(), likes: [] });
    setReelMedia(""); setReelCaption(""); setReelComposerOpen(false);
  };
  const submitStory = async () => {
    if (!storyMedia || !me) return;
    await addStory({ author: me.username, media: storyMedia, ts: Date.now() });
    setStoryMedia(""); setStoryComposerOpen(false);
  };
  const toggleLike = async (post) => {
    if (!me) return;
    const has = post.likes.includes(me.username);
    const likes = has ? post.likes.filter((u) => u !== me.username) : [...post.likes, me.username];
    await updatePost(post.id, { likes });
    if (!has && post.author !== me.username) pushNotification(post.author, me.username, "postingizni yoqtirdi ❤️");
  };
  const toggleReelLike = async (reel) => {
    if (!me) return;
    const has = reel.likes.includes(me.username);
    const likes = has ? reel.likes.filter((u) => u !== me.username) : [...reel.likes, me.username];
    await updateReel(reel.id, { likes });
  };
  const submitComment = async (post) => {
    const text = (commentDrafts[post.id] || "").trim();
    if (!text || !me) return;
    await updatePost(post.id, { comments: [...post.comments, { author: me.username, text, ts: Date.now() }] });
    if (post.author !== me.username) pushNotification(post.author, me.username, `izoh qoldirdi: "${text}"`);
    setCommentDrafts((d) => ({ ...d, [post.id]: "" }));
  };
  const toggleFollow = async (username) => {
    if (!me) return;
    const isFollowing = following.includes(username);
    const next = isFollowing ? following.filter((u) => u !== username) : [...following, username];
    await setFollowingRemote(me.username, next);
    if (!isFollowing) pushNotification(username, me.username, "sizga obuna bo'ldi 👋");
  };
  const sendMessage = async () => {
    const text = messageDraft.trim();
    if (!text || !me || !dmTarget) return;
    const k = convoKey(me.username, dmTarget);
    await sendMessageRemote(k, { from: me.username, text, ts: Date.now(), read: false });
    if (dmTarget !== me.username) pushNotification(dmTarget, me.username, "sizga xabar yubordi 💬");
    setMessageDraft("");
  };

  // -------------------- Yuklanish holati --------------------
  if (booting) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={30} color={C.pink} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // -------------------- Kirish / Ro'yxatdan o'tish --------------------
  if (!me) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp 0.5s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.pink}, #ff7e5f)`, boxShadow: `0 0 34px ${C.pink}55`, animation: "pulseGlow 2.4s ease-in-out infinite alternate" }}>
              <span style={{ fontWeight: 900, fontSize: 30, color: "#fff" }}>S</span>
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
              <span style={{ color: C.pink }}>Sardo</span><span style={{ color: C.blue }}>gram</span>
            </h1>
            <p style={{ color: C.inkDim, fontSize: 14, marginTop: 6 }}>Rasm, video, hikoya va xabarlaringizni ulashing.</p>
            {!enabled && (
              <p style={{ color: "#ffb84d", fontSize: 11.5, marginTop: 10, lineHeight: 1.5, background: "#2a2210", padding: "8px 12px", borderRadius: 8 }}>
                ⚠️ Firebase ulanmagan — hozir faqat shu qurilmada ishlaydi. Boshqa telefon/kompyuter bilan
                ko'rinish uchun koddagi FIREBASE_CONFIG'ni to'ldiring.
              </p>
            )}
          </div>

          <div style={{ display: "flex", background: C.card, borderRadius: 10, padding: 3, marginBottom: 18, border: `1px solid ${C.border}` }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, background: authMode === m ? C.pink : "transparent", color: authMode === m ? "#1a0810" : C.inkDim }}>
                {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
              </button>
            ))}
          </div>

          {authMode === "register" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: "center" }}>
                {AVATAR_COLORS.map((c) => (
                  <button key={c} onClick={() => setAuthColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: authColor === c ? `2px solid ${C.ink}` : "2px solid transparent" }} />
                ))}
              </div>
              <input value={authAvatar} onChange={(e) => setAuthAvatar(e.target.value)} placeholder="Avatar rasm havolasi (ixtiyoriy)" style={inputStyle} />
            </>
          )}

          <input value={authName} onChange={(e) => { setAuthName(e.target.value); if (authError) setAuthError(""); }} onKeyDown={(e) => e.key === "Enter" && submitAuth()} placeholder="Foydalanuvchi nomi" style={{ ...inputStyle, borderColor: authError ? C.pink : C.border }} />

          {authError && <div style={{ color: C.pink, fontSize: 12, marginTop: -6, marginBottom: 10 }}>{authError}</div>}

          <button onClick={submitAuth} disabled={!authName.trim() || authBusy} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", marginTop: 4, fontWeight: 700, fontSize: 15, cursor: authName.trim() ? "pointer" : "default", background: authName.trim() ? C.pink : C.border, color: authName.trim() ? "#1a0810" : C.inkDim, boxShadow: authName.trim() ? `0 6px 20px ${C.pink}55` : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {authBusy && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {authMode === "login" ? "Kirish" : "Akkaunt ochish"}
          </button>
        </div>
        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulseGlow { from { transform: scale(1); } to { transform: scale(1.06); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // -------------------- Hisoblangan qiymatlar --------------------
  const storyUsers = Object.entries(users);
  const myPosts = posts.filter((p) => p.author === me.username);
  const otherUsers = Object.keys(users).filter((u) => u !== me.username);
  const filteredUsers = Object.entries(users).filter(([u]) => u.toLowerCase().includes(searchQuery.toLowerCase()));
  const conversationPreview = (u) => { const t = dms[convoKey(me.username, u)] || []; return t[t.length - 1]; };
  const storiesByUser = {};
  stories.forEach((s) => { (storiesByUser[s.author] ||= []).push(s); });

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(10,11,14,0.9)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          <span style={{ color: C.pink }}>Sardo</span><span style={{ color: C.blue }}>gram</span>
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconTab active={tab === "notifs"} onClick={() => setTab("notifs")} Icon={Bell} badge={notifications.length > 0} />
          <button onClick={() => setComposerOpen(true)} style={{ background: C.pink, border: "none", borderRadius: 8, padding: "8px 14px", color: "#1a0810", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <PlusSquare size={15} /> Post
          </button>
          <button onClick={logout} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.inkDim, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Chiqish</button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 76 }}>
        {/* LENTA (Instagram uslubi: Stories + Postlar) */}
        {tab === "feed" && (
          <>
            <div style={{ display: "flex", gap: 14, padding: "14px 16px", overflowX: "auto", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => setStoryComposerOpen(true)} style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer", background: "none", padding: 0 }}>
                  <Avatar name={me.username} color={me.color} avatar={me.avatar} size={52} />
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bg}` }}>
                    <Plus size={12} color="#001a1f" strokeWidth={3} />
                  </div>
                </button>
                <span style={{ fontSize: 11, color: C.inkDim }}>Siz</span>
              </div>
              {storyUsers.filter(([name]) => storiesByUser[name]?.length).map(([name, u]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setStoryViewer({ username: name, items: storiesByUser[name], idx: 0 })} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: "50%", backgroundImage: `linear-gradient(45deg, ${C.pink}, ${C.blue})` }}>
                    <div style={{ background: C.bg, borderRadius: "50%", padding: 2 }}>
                      <Avatar name={name} color={u.color} avatar={u.avatar} size={48} />
                    </div>
                  </button>
                  <span style={{ fontSize: 11, color: C.inkDim, maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                </div>
              ))}
            </div>

            {posts.length === 0 ? <EmptyState text="Hali postlar yo'q. Birinchi bo'lib ulashing!" /> : posts.map((post) => {
              const liked = post.likes.includes(me.username);
              const u = users[post.author] || {};
              return (
                <div key={post.id} style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar name={post.author} color={u.color} avatar={u.avatar} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={post.author} verified={u.verified} /></div>
                      <div style={{ fontSize: 11, color: C.inkDim }}>{timeAgo(post.ts)}</div>
                    </div>
                  </div>
                  {post.media && (
                    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 10, background: "#000" }}>
                      {post.isVideo ? <video src={post.media} controls style={{ width: "100%", maxHeight: 480, display: "block" }} /> : <img src={post.media} alt="" style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }} />}
                    </div>
                  )}
                  {post.text && <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.5 }}>{post.text}</p>}
                  <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    <button onClick={() => toggleLike(post)} style={likeBtnStyle(liked)}><Heart size={18} fill={liked ? C.pink : "none"} />{post.likes.length > 0 && post.likes.length}</button>
                    <button onClick={() => setOpenComments((o) => ({ ...o, [post.id]: !o[post.id] }))} style={likeBtnStyle(false)}><MessageCircle size={18} />{post.comments.length > 0 && post.comments.length}</button>
                    <Bookmark size={18} color={C.inkDim} style={{ marginLeft: "auto" }} />
                  </div>
                  {openComments[post.id] && (
                    <div style={{ marginTop: 10 }}>
                      {post.comments.map((c, i) => (
                        <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>{c.author}</span> <span style={{ color: C.inkDim, fontSize: 11 }}>{timeAgo(c.ts)}</span>
                          <div>{c.text}</div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <input value={commentDrafts[post.id] || ""} onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && submitComment(post)} placeholder="Izoh yozing..." style={{ ...inputStyle, marginBottom: 0, padding: "8px 10px", fontSize: 13, flex: 1 }} />
                        <button onClick={() => submitComment(post)} style={{ background: "none", border: "none", color: C.pink, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Yuborish</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* QIDIRUV / EXPLORE (Instagram uslubi) */}
        {tab === "search" && (
          <div style={{ padding: 16 }}>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={18} color={C.inkDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Akkauntlarni qidirish..." style={{ ...inputStyle, marginBottom: 16, padding: "10px 10px 10px 38px" }} />
            </div>
            {searchQuery === "" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginBottom: 16 }}>
                {posts.filter((p) => p.media && !p.isVideo).slice(0, 21).map((p) => (
                  <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}>
                    <img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
            {searchQuery !== "" && (filteredUsers.length === 0 ? <EmptyState text="Akkaunt topilmadi" /> : filteredUsers.map(([username, u]) => {
              const isMe = username === me.username, isFollowing = following.includes(username);
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={username} color={u.color} avatar={u.avatar} size={42} />
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={username} verified={u.verified} /></div><div style={{ fontSize: 12, color: C.inkDim }}>{u.bio || "Foydalanuvchi"}</div></div>
                  </div>
                  {!isMe && <button onClick={() => toggleFollow(username)} style={followBtnStyle(isFollowing)}>{isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}{isFollowing ? "Obunadasiz" : "Obuna bo'lish"}</button>}
                </div>
              );
            }))}
          </div>
        )}

        {/* REELS — TikTok uslubida to'liq ekran, yuqori-pastga scroll */}
        {tab === "reels" && (
          <div style={{ height: "calc(100vh - 130px)", overflowY: "auto", scrollSnapType: "y mandatory" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Reels</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReelMuted((m) => !m)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, color: C.inkDim, cursor: "pointer" }}>
                  {reelMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button onClick={() => setReelComposerOpen(true)} style={{ background: C.pink, color: "#1a0810", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Reel</button>
              </div>
            </div>
            {reels.length === 0 ? <EmptyState text="Hozircha Reels yo'q" /> : reels.map((reel) => {
              const liked = reel.likes.includes(me.username);
              const u = users[reel.author] || {};
              return (
                <div key={reel.id} style={{ scrollSnapAlign: "start", position: "relative", height: "calc(100vh - 172px)", background: "#000", borderRadius: 16, overflow: "hidden", marginBottom: 14, marginLeft: 16, marginRight: 16, width: "calc(100% - 32px)" }}>
                  <video src={reel.videoUrl} autoPlay loop muted={reelMuted} playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", right: 10, bottom: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                    <button onClick={() => toggleReelLike(reel)} style={{ background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Heart size={22} color={liked ? C.pink : "#fff"} fill={liked ? C.pink : "none"} />
                    </button>
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, marginTop: -12 }}>{reel.likes.length}</span>
                  </div>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Avatar name={reel.author} color={u.color} avatar={u.avatar} size={30} />
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}><NameTag name={reel.author} verified={u.verified} /></span>
                    </div>
                    {reel.caption && <p style={{ margin: 0, fontSize: 13, color: "#eee" }}>{reel.caption}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GRID */}
        {tab === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: 2 }}>
            {posts.filter((p) => p.media).map((p) => (
              <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}>
                {p.isVideo ? <video src={p.media} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
            ))}
            {posts.filter((p) => p.media).length === 0 && <div style={{ gridColumn: "span 3" }}><EmptyState text="Media postlar yo'q" /></div>}
          </div>
        )}

        {/* XABARLAR — WhatsApp uslubida */}
        {tab === "messages" && (
          <div style={{ padding: dmTarget ? 0 : 16 }}>
            {!dmTarget ? (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>Xabarlar</h2>
                {otherUsers.length === 0 ? <EmptyState text="Boshqa foydalanuvchilar yo'q" /> : otherUsers.map((username) => {
                  const u = users[username] || {}, lastMsg = conversationPreview(username);
                  return (
                    <div key={username} onClick={() => setDmTarget(username)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                      <Avatar name={username} color={u.color} avatar={u.avatar} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                          <NameTag name={username} verified={u.verified} />
                          {lastMsg && <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 400 }}>{timeAgo(lastMsg.ts)}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: C.inkDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                          {lastMsg?.from === me.username && <CheckCheck size={13} color={C.blue} />}
                          {lastMsg ? lastMsg.text : "Yozishni boshlash..."}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.card }}>
                  <button onClick={() => setDmTarget(null)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "flex" }}><ArrowLeft size={20} /></button>
                  <Avatar name={dmTarget} color={users[dmTarget]?.color} avatar={users[dmTarget]?.avatar} size={32} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={dmTarget} verified={users[dmTarget]?.verified} /></span>
                </div>
                <div style={{
                  flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 6,
                  backgroundImage: "radial-gradient(circle at 20% 20%, #131418 0%, #0a0b0e 70%)",
                }}>
                  {(dms[convoKey(me.username, dmTarget)] || []).map((m, idx) => {
                    const isMe = m.from === me.username;
                    return (
                      <div key={m.id || idx} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "78%", display: "flex", flexDirection: "column" }}>
                        <div style={{
                          background: isMe ? "#1f5a3a" : C.card, color: C.ink, padding: "8px 12px 6px",
                          borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px", fontSize: 14, lineHeight: 1.4,
                        }}>
                          {m.text}
                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: C.inkDim }}>{new Date(m.ts).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                            {isMe && <CheckCheck size={13} color={C.blue} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.border}`, background: C.card }}>
                  <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Xabar yozing..." style={{ ...inputStyle, marginBottom: 0, flex: 1, borderRadius: 22 }} />
                  <button onClick={sendMessage} style={{ background: C.pink, border: "none", borderRadius: "50%", width: 40, height: 40, color: "#1a0810", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={16} /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFIL */}
        {tab === "profile" && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <Avatar name={me.username} color={me.color} avatar={me.avatar} size={64} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}><NameTag name={me.username} verified={me.verified} size={16} /></div>
                <div style={{ fontSize: 13, color: C.inkDim, marginTop: 2 }}>{myPosts.length} ta post</div>
              </div>
            </div>
            {!me.verified && (
              <button onClick={buyVerification} style={{ width: "100%", background: C.card, border: `1px solid ${C.blue}`, color: C.blue, borderRadius: 8, padding: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <BadgeCheck size={16} /> Tasdiqlangan belgi olish
              </button>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              {myPosts.map((p) => (
                <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}>
                  {p.media ? (p.isVideo ? <video src={p.media} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />) : <div style={{ position: "absolute", inset: 0, padding: 8, fontSize: 11, background: C.card, overflow: "hidden" }}>{p.text}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BILDIRISHNOMALAR */}
        {tab === "notifs" && (
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>Bildirishnomalar</h2>
            {notifications.length === 0 ? <EmptyState text="Bildirishnomalar yo'q" /> : notifications.map((n) => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div><span style={{ fontWeight: 700 }}>{n.from}</span> {n.text}</div>
                <span style={{ color: C.inkDim, fontSize: 11 }}>{timeAgo(n.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PASTKI NAVIGATSIYA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,11,14,0.92)", backdropFilter: "blur(14px)", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0", zIndex: 10 }}>
        <IconTab active={tab === "feed"} onClick={() => setTab("feed")} Icon={Home} />
        <IconTab active={tab === "search"} onClick={() => setTab("search")} Icon={Search} />
        <IconTab active={tab === "reels"} onClick={() => setTab("reels")} Icon={Clapperboard} />
        <IconTab active={tab === "grid"} onClick={() => setTab("grid")} Icon={Grid3x3} />
        <IconTab active={tab === "messages"} onClick={() => { setTab("messages"); setDmTarget(null); }} Icon={MessagesSquare} />
        <IconTab active={tab === "profile"} onClick={() => setTab("profile")} Icon={User} />
      </div>

      {/* POST MODALI */}
      {composerOpen && (
        <Modal onClose={() => setComposerOpen(false)} title="Yangi post yaratish">
          <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Nima gaplar?" style={{ ...inputStyle, height: 80, resize: "none" }} />
          {draftMedia && (
            <div style={{ position: "relative", marginBottom: 10 }}>
              {draftIsVideo ? <video src={draftMedia} controls style={{ width: "100%", maxHeight: 200, borderRadius: 8 }} /> : <img src={draftMedia} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }} />}
              <button onClick={() => setDraftMedia("")} style={removeMediaBtnStyle}><X size={14} /></button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <label style={fileLabelStyle}><ImageIcon size={14} /> Rasm<input type="file" accept="image/*" onChange={(e) => handleDraftFile(e, false)} style={{ display: "none" }} /></label>
            <label style={fileLabelStyle}><VideoIcon size={14} /> Video<input type="file" accept="video/*" onChange={(e) => handleDraftFile(e, true)} style={{ display: "none" }} /></label>
          </div>
          <button onClick={submitPost} style={submitBtnStyle}>Ulashish</button>
        </Modal>
      )}

      {/* REEL MODALI */}
      {reelComposerOpen && (
        <Modal onClose={() => setReelComposerOpen(false)} title="Reel yuklash">
          {reelMedia ? (
            <div style={{ position: "relative", marginBottom: 10 }}>
              <video src={reelMedia} controls style={{ width: "100%", maxHeight: 220, borderRadius: 8 }} />
              <button onClick={() => setReelMedia("")} style={removeMediaBtnStyle}><X size={14} /></button>
            </div>
          ) : (
            <label style={{ ...fileLabelStyle, width: "100%", justifyContent: "center", padding: 22, marginBottom: 12 }}>
              <VideoIcon size={18} /> Video tanlash
              <input type="file" accept="video/*" onChange={handleReelFile} style={{ display: "none" }} />
            </label>
          )}
          <textarea value={reelCaption} onChange={(e) => setReelCaption(e.target.value)} placeholder="Izoh yozing..." style={{ ...inputStyle, height: 60, resize: "none" }} />
          <button onClick={submitReel} style={submitBtnStyle}>Yuklash</button>
        </Modal>
      )}

      {/* STORY MODALI */}
      {storyComposerOpen && (
        <Modal onClose={() => setStoryComposerOpen(false)} title="Hikoya qo'shish (24 soat)">
          {storyMedia ? (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <img src={storyMedia} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 8 }} />
              <button onClick={() => setStoryMedia("")} style={removeMediaBtnStyle}><X size={14} /></button>
            </div>
          ) : (
            <label style={{ ...fileLabelStyle, width: "100%", justifyContent: "center", padding: 30, marginBottom: 12 }}>
              <ImageIcon size={18} /> Rasm tanlash
              <input type="file" accept="image/*" onChange={handleStoryFile} style={{ display: "none" }} />
            </label>
          )}
          <button onClick={submitStory} style={submitBtnStyle}>Ulashish</button>
        </Modal>
      )}

      {/* STORY KO'RISH OYNASI */}
      {storyViewer && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4 }}>
            {storyViewer.items.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= storyViewer.idx ? "#fff" : "rgba(255,255,255,0.3)" }} />
            ))}
          </div>
          <div style={{ position: "absolute", top: 22, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={storyViewer.username} color={users[storyViewer.username]?.color} avatar={users[storyViewer.username]?.avatar} size={30} />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{storyViewer.username}</span>
          </div>
          <button onClick={() => setStoryViewer(null)} style={{ position: "absolute", top: 18, right: 14, background: "none", border: "none", color: "#fff", cursor: "pointer" }}><X size={24} /></button>
          <img src={storyViewer.items[storyViewer.idx].media} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setStoryViewer((v) => v.idx > 0 ? { ...v, idx: v.idx - 1 } : null)} />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setStoryViewer((v) => v.idx < v.items.length - 1 ? { ...v, idx: v.idx + 1 } : null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Kichik komponentlar / uslublar ----------
function NameTag({ name, verified, size = 14 }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{name}{verified && <BadgeCheck size={size} color={C.blue} fill="#0d2b33" />}</span>;
}
function Avatar({ name, color, avatar, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: color || C.pink, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0d0d0f", fontSize: size * 0.42, fontFamily: FONT, overflow: "hidden" }}>
      {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (name || "?")[0]?.toUpperCase()}
    </div>
  );
}
function IconTab({ active, onClick, Icon, badge }) {
  return (
    <button onClick={onClick} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 8, color: active ? C.pink : C.inkDim, display: "flex", alignItems: "center" }}>
      <Icon size={22} fill={active ? C.pink : "none"} strokeWidth={active ? 2.4 : 2} />
      {badge && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: C.pink }} />}
    </button>
  );
}
function EmptyState({ text }) { return <p style={{ color: C.inkDim, textAlign: "center", padding: "50px 20px", fontSize: 14 }}>{text}</p>; }
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 20 }}>
      <div style={{ background: C.card, width: "100%", maxWidth: 400, borderRadius: 14, padding: 18, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkDim, cursor: "pointer" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const inputStyle = { width: "100%", boxSizing: "border-box", background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.ink, fontSize: 14, outline: "none", marginBottom: 12, fontFamily: FONT };
const submitBtnStyle = { width: "100%", background: C.pink, color: "#1a0810", border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" };
const fileLabelStyle = { cursor: "pointer", background: C.bg, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: C.inkDim };
const removeMediaBtnStyle = { position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
function likeBtnStyle(active) { return { background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, color: active ? C.pink : C.inkDim, cursor: "pointer", fontSize: 13, fontWeight: 600 }; }
function followBtnStyle(f) { return { background: f ? C.card : C.pink, color: f ? C.ink : "#1a0810", border: f ? `1px solid ${C.border}` : "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }; }
