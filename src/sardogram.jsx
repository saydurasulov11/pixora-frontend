import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, Grid3x3, User, Home, Loader2, X,
  MessagesSquare, ArrowLeft, BadgeCheck, Search, Clapperboard, UserPlus,
  UserCheck, Bell, PlusSquare, Image as ImageIcon, Video as VideoIcon,
  Check, CheckCheck, Plus, Volume2, VolumeX, Phone, PhoneOff, Users,
  Palette, Trash2, Mic, MicOff, VideoOff, Eye, Lock,
} from "lucide-react";

/**
 * ============================================================================
 * SARDOGRAM — Instagram + TikTok + WhatsApp uslublari birlashtirilgan ilova
 * ============================================================================
 * Real vaqtli ko'p qurilmali sinxronizatsiya uchun Firebase Firestore ishlatiladi.
 * Sozlash: https://console.firebase.google.com — loyiha yarating, Firestore'ni
 * yoqing ("test mode"), Web ilova qo'shib config'ni pastga joylang.
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
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Faqat shu foydalanuvchi nomlariga ko'k tasdiqlash belgisi beriladi — boshqa
// hech kim (hatto so'rov bilan ham) buni ololmaydi.
const VERIFIED_USERNAMES = ["shuxrat", "davlat", "sardor", "saydurasulov", "xasanov", "amirullayev"];
function isVerified(username) {
  return VERIFIED_USERNAMES.includes((username || "").trim().toLowerCase());
}
// Faqat shu foydalanuvchi admin panelga (bazani tozalash) kira oladi.
const ADMIN_USERNAME = "sardor";
function isAdmin(username) {
  return (username || "").trim().toLowerCase() === ADMIN_USERNAME;
}

// ---------- Ranglar va shrift ----------
const C = {
  bg: "#0a0b0e", card: "#15161b", cardAlt: "#1c1e25", border: "#252730",
  pink: "#ff3d6e", blue: "#3ddbff", green: "#25d366", ink: "#f5f4f2", inkDim: "#8f8d99",
};
const FONT = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const AVATAR_COLORS = ["#ff3d6e", "#3ddbff", "#ffb84d", "#8b6bff", "#4dd48a", "#ff7a5c"];
const LS_PREFIX = "sardogram_";
const lsKey = (n) => `${LS_PREFIX}${n}`;
const STORY_TTL = 24 * 60 * 60 * 1000;

const CHAT_THEMES = {
  default: { name: "Standart", bg: "radial-gradient(circle at 20% 20%, #131418 0%, #0a0b0e 70%)" },
  ocean: { name: "Okean", bg: "linear-gradient(160deg, #0a1f2b, #06101a)" },
  sunset: { name: "Quyosh botishi", bg: "linear-gradient(160deg, #2b0f1f, #1a0a12)" },
  forest: { name: "O'rmon", bg: "linear-gradient(160deg, #0f2b18, #0a1a10)" },
  royal: { name: "Qirollik", bg: "linear-gradient(160deg, #1a0f2b, #0f0a1a)" },
};

// ---------- localStorage yordamchilari (zaxira rejim) ----------
function readLS(name, fallback) {
  try { const raw = localStorage.getItem(lsKey(name)); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
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
function threadIdFor(thread) {
  return thread.type === "group" ? `group_${thread.id}` : convoKey(thread.me, thread.peer);
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// FIREBASE QATLAMI
// ============================================================================
function useFirestoreBackend() {
  const [db, setDb] = useState(null);
  const [ready, setReady] = useState(!FIREBASE_READY);
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
  const [groups, setGroups] = useState([]);
  const [following, setFollowing] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dms, setDms] = useState({});

  const [tab, setTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [storyViewer, setStoryViewer] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
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
  const [groupComposerOpen, setGroupComposerOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);

  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});

  const [activeThread, setActiveThread] = useState(null); // {type:"dm",peer} | {type:"group",id,name,members}
  const [messageDraft, setMessageDraft] = useState("");
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [chatTheme, setChatTheme] = useState(() => readLS("chatTheme", "default"));
  const chatEndRef = useRef(null);
  const [reelMuted, setReelMuted] = useState(true);

  // ---- Video qo'ng'iroq holati ----
  const [callState, setCallState] = useState({ status: "idle" }); // idle | calling | in-call
  const [incomingCall, setIncomingCall] = useState(null); // {id, caller}
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // -------------------- localStorage zaxira: bir brauzerdagi tablar --------------------
  useEffect(() => {
    if (enabled) return;
    const sync = () => {
      setUsers(readLS("users", {}));
      setPosts(readLS("posts", []));
      setReels(readLS("reels", []));
      setStories(readLS("stories", []));
      setGroups(readLS("groups", []));
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
    const poll = setInterval(sync, 1500);
    return () => { window.removeEventListener("storage", onStorage); if (bc) bc.close(); clearInterval(poll); };
  }, [enabled]);

  const pingTabs = () => { if ("BroadcastChannel" in window) new BroadcastChannel("sardogram").postMessage("update"); };

  // -------------------- Firebase: real-time obunalar --------------------
  useEffect(() => {
    if (!enabled || !ready || !db || !fns) return;
    const { collection, onSnapshot, query, orderBy } = fns;
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const next = {}; snap.forEach((d) => { next[d.id] = d.data(); }); setUsers(next);
    });
    const unsubPosts = onSnapshot(query(collection(db, "posts"), orderBy("ts", "desc")), (snap) => setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubReels = onSnapshot(query(collection(db, "reels"), orderBy("ts", "desc")), (snap) => setReels(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubStories = onSnapshot(query(collection(db, "stories"), orderBy("ts", "desc")), (snap) => {
      const now = Date.now();
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => now - s.ts < STORY_TTL));
    });
    setBooting(false);
    const savedMe = readLS("me", null);
    if (savedMe) setMe(savedMe);
    return () => { unsubUsers(); unsubPosts(); unsubReels(); unsubStories(); };
  }, [enabled, ready, db, fns]);

  // Men uchun: following, bildirishnoma, guruhlar, kiruvchi qo'ng'iroqlar
  useEffect(() => {
    if (!me) return;
    if (!enabled || !ready || !db || !fns) {
      setFollowing(readLS("following_" + me.username, []));
      setNotifications(readLS("notifs_" + me.username, []));
      setGroups(readLS("groups", []).filter((g) => g.members.includes(me.username)));
      return;
    }
    const { doc, onSnapshot, collection, query, orderBy, where } = fns;
    const unsubFollow = onSnapshot(doc(db, "follows", me.username), (d) => setFollowing(d.exists() ? d.data().following || [] : []));
    const unsubNotif = onSnapshot(query(collection(db, "notifications", me.username, "items"), orderBy("ts", "desc")), (snap) => setNotifications(snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }))));
    const unsubGroups = onSnapshot(query(collection(db, "groups"), where("members", "array-contains", me.username)), (snap) => setGroups(snap.docs.map((d2) => ({ id: d2.id, ...d2.data() }))));
    const unsubIncoming = onSnapshot(query(collection(db, "calls"), where("callee", "==", me.username), where("status", "==", "ringing")), (snap) => {
      if (callStateRef.current.status !== "idle") return;
      const doc0 = snap.docs[0];
      if (doc0) setIncomingCall({ id: doc0.id, caller: doc0.data().caller }); else setIncomingCall(null);
    });
    return () => { unsubFollow(); unsubNotif(); unsubGroups(); unsubIncoming(); };
  }, [me, enabled, ready, db, fns]);

  // Ochiq suhbat uchun real-time xabarlar + o'qildi belgisi
  useEffect(() => {
    if (!me || !activeThread) return;
    const tid = threadIdFor({ ...activeThread, me: me.username });
    if (!enabled || !ready || !db || !fns) {
      const sync = () => setDms((prev) => ({ ...prev, [tid]: readLS("dms", {})[tid] || [] }));
      sync();
      const poll = setInterval(sync, 1200);
      return () => clearInterval(poll);
    }
    const { collection, onSnapshot, query, orderBy, updateDoc, doc } = fns;
    const unsub = onSnapshot(query(collection(db, "messages", tid, "thread"), orderBy("ts", "asc")), (snap) => {
      setDms((prev) => ({ ...prev, [tid]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
      if (activeThread.type === "dm") {
        snap.docs.filter((d) => d.data().from !== me.username && d.data().read !== true)
          .forEach((d) => updateDoc(doc(db, "messages", tid, "thread", d.id), { read: true }).catch(() => {}));
      }
    });
    return () => unsub();
  }, [me, activeThread, enabled, ready, db, fns]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dms, activeThread]);
  useEffect(() => { writeLS("chatTheme", chatTheme); }, [chatTheme]);
  useEffect(() => { if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current; }, [callState.status]);
  useEffect(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);

  // -------------------- Yozish (Firebase yoki localStorage'ga) --------------------
  const writeUser = async (username, data) => {
    if (enabled && db && fns) await fns.setDoc(fns.doc(db, "users", username), data, { merge: true });
    else { const next = { ...readLS("users", {}), [username]: data }; writeLS("users", next); setUsers(next); pingTabs(); }
  };
  const addPost = async (post) => {
    if (enabled && db && fns) await fns.addDoc(fns.collection(db, "posts"), post);
    else { const next = [{ id: `p_${Date.now()}`, ...post }, ...readLS("posts", [])]; writeLS("posts", next); setPosts(next); pingTabs(); }
  };
  const addReel = async (reel) => {
    if (enabled && db && fns) await fns.addDoc(fns.collection(db, "reels"), reel);
    else { const next = [{ id: `r_${Date.now()}`, ...reel }, ...readLS("reels", [])]; writeLS("reels", next); setReels(next); pingTabs(); }
  };
  const addStory = async (story) => {
    if (enabled && db && fns) await fns.addDoc(fns.collection(db, "stories"), story);
    else { const next = [{ id: `s_${Date.now()}`, ...story }, ...readLS("stories", [])]; writeLS("stories", next); setStories(next); pingTabs(); }
  };
  const createGroup = async (group) => {
    if (enabled && db && fns) return (await fns.addDoc(fns.collection(db, "groups"), group)).id;
    const id = `g_${Date.now()}`;
    const next = [{ id, ...group }, ...readLS("groups", [])];
    writeLS("groups", next); setGroups(next); pingTabs();
    return id;
  };
  const updatePost = async (id, data) => {
    if (enabled && db && fns) await fns.updateDoc(fns.doc(db, "posts", id), data);
    else { const next = posts.map((p) => (p.id === id ? { ...p, ...data } : p)); writeLS("posts", next); setPosts(next); pingTabs(); }
  };
  const updateReel = async (id, data) => {
    if (enabled && db && fns) await fns.updateDoc(fns.doc(db, "reels", id), data);
    else { const next = reels.map((r) => (r.id === id ? { ...r, ...data } : r)); writeLS("reels", next); setReels(next); pingTabs(); }
  };
  const setFollowingRemote = async (username, list) => {
    if (enabled && db && fns) await fns.setDoc(fns.doc(db, "follows", username), { following: list }, { merge: true });
    else { writeLS("following_" + username, list); setFollowing(list); pingTabs(); }
  };
  const pushNotification = async (toUser, fromUser, text) => {
    const item = { from: fromUser, text, ts: Date.now() };
    if (enabled && db && fns) await fns.addDoc(fns.collection(db, "notifications", toUser, "items"), item);
    else {
      const listKey = "notifs_" + toUser;
      const next = [{ id: Date.now(), ...item }, ...readLS(listKey, [])];
      writeLS(listKey, next);
      if (me && toUser === me.username) setNotifications(next);
      pingTabs();
    }
  };
  const sendMessageRemote = async (tid, msg) => {
    if (enabled && db && fns) await fns.addDoc(fns.collection(db, "messages", tid, "thread"), msg);
    else {
      const all = readLS("dms", {});
      const next = { ...all, [tid]: [...(all[tid] || []), { id: Date.now(), ...msg }] };
      writeLS("dms", next); setDms(next); pingTabs();
    }
  };

  // -------------------- Auth --------------------
  const submitAuth = async () => {
    const name = authName.trim();
    const pass = authPassword;
    if (!name) { setAuthError("Ismingizni kiriting"); return; }
    if (!pass) { setAuthError("Parolingizni kiriting"); return; }
    if (authMode === "register" && pass.length < 4) { setAuthError("Parol kamida 4 ta belgidan iborat bo'lsin"); return; }
    setAuthBusy(true);
    try {
      let existing = users[name];
      if (!existing && enabled && db && fns) {
        const snap = await fns.getDoc(fns.doc(db, "users", name));
        existing = snap.exists() ? snap.data() : null;
      }
      if (authMode === "register") {
        if (existing) { setAuthError(`"${name}" nomi band. Boshqasini tanlang.`); setAuthBusy(false); return; }
        const profile = { bio: "", color: authColor, avatar: authAvatar.trim(), password: pass, createdAt: Date.now() };
        await writeUser(name, profile);
        const meProfile = { username: name, ...profile };
        setMe(meProfile); writeLS("me", meProfile);
      } else {
        if (!existing) { setAuthError(`"${name}" nomli akkaunt topilmadi.`); setAuthBusy(false); return; }
        if ((existing.password || "") !== pass) { setAuthError("Parol noto'g'ri."); setAuthBusy(false); return; }
        const meProfile = { username: name, ...existing };
        setMe(meProfile); writeLS("me", meProfile);
      }
      setAuthError("");
      setAuthPassword("");
    } catch (e) { setAuthError("Xatolik yuz berdi, qayta urinib ko'ring."); }
    setAuthBusy(false);
  };
  const logout = () => { setMe(null); localStorage.removeItem(lsKey("me")); setActiveThread(null); };

  // -------------------- Media --------------------
  const handleDraftFile = async (e, isVideo) => { const f = e.target.files[0]; if (!f) return; setDraftMedia(await fileToDataUrl(f)); setDraftIsVideo(isVideo); };
  const handleReelFile = async (e) => { const f = e.target.files[0]; if (!f) return; setReelMedia(await fileToDataUrl(f)); };
  const handleStoryFile = async (e) => { const f = e.target.files[0]; if (!f) return; setStoryMedia(await fileToDataUrl(f)); };

  // -------------------- Aksiyalar --------------------
  const submitPost = async () => {
    if ((!draftText.trim() && !draftMedia) || !me) return;
    await addPost({ author: me.username, text: draftText.trim(), media: draftMedia, isVideo: draftIsVideo, ts: Date.now(), likes: [], comments: [] });
    setDraftText(""); setDraftMedia(""); setDraftIsVideo(false); setComposerOpen(false);
  };
  const submitReel = async () => {
    if (!reelMedia || !me) return;
    await addReel({ author: me.username, videoUrl: reelMedia, caption: reelCaption.trim(), ts: Date.now(), likes: [], views: [] });
    setReelMedia(""); setReelCaption(""); setReelComposerOpen(false);
  };
  const registerReelView = async (reel) => {
    if (!me) return;
    const seen = reel.views || [];
    if (seen.includes(me.username)) return;
    await updateReel(reel.id, { views: [...seen, me.username] });
  };
  const submitStory = async () => {
    if (!storyMedia || !me) return;
    await addStory({ author: me.username, media: storyMedia, ts: Date.now() });
    setStoryMedia(""); setStoryComposerOpen(false);
  };
  const submitGroup = async () => {
    const name = groupName.trim();
    if (!name || groupMembers.length === 0 || !me) return;
    const members = Array.from(new Set([...groupMembers, me.username]));
    const id = await createGroup({ name, members, createdBy: me.username, createdAt: Date.now() });
    setGroupName(""); setGroupMembers([]); setGroupComposerOpen(false);
    setActiveThread({ type: "group", id, name, members });
    setTab("messages");
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
    const isF = following.includes(username);
    const next = isF ? following.filter((u) => u !== username) : [...following, username];
    await setFollowingRemote(me.username, next);
    if (!isF) pushNotification(username, me.username, "sizga obuna bo'ldi 👋");
  };
  const sendMessage = async () => {
    const text = messageDraft.trim();
    if (!text || !me || !activeThread) return;
    const tid = threadIdFor({ ...activeThread, me: me.username });
    await sendMessageRemote(tid, { from: me.username, text, ts: Date.now(), read: false });
    if (activeThread.type === "dm" && activeThread.peer !== me.username) pushNotification(activeThread.peer, me.username, "sizga xabar yubordi 💬");
    setMessageDraft("");
  };

  // -------------------- VIDEO QO'NG'IROQ (WebRTC + Firestore signalizatsiya) --------------------
  const cleanupCall = () => {
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    callIdRef.current = null;
    setRemoteStream(null);
    setCallState({ status: "idle" });
  };
  const hangUp = async () => {
    if (callIdRef.current && enabled && db && fns) {
      try { await fns.updateDoc(fns.doc(db, "calls", callIdRef.current), { status: "ended" }); } catch {}
    }
    cleanupCall();
  };
  const startCall = async () => {
    if (!activeThread || activeThread.type !== "dm" || !enabled || !db || !fns) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setCallState({ status: "calling", peer: activeThread.peer });
      const { collection, addDoc, doc, updateDoc, onSnapshot, setDoc } = fns;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => setRemoteStream(e.streams[0]);
      const callRef = await addDoc(collection(db, "calls"), { caller: me.username, callee: activeThread.peer, status: "ringing", createdAt: Date.now() });
      callIdRef.current = callRef.id;
      pc.onicecandidate = (e) => { if (e.candidate) addDoc(collection(db, "calls", callRef.id, "callerCandidates"), e.candidate.toJSON()); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateDoc(callRef, { offer: { type: offer.type, sdp: offer.sdp } });
      onSnapshot(callRef, async (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.answer && pc.signalingState !== "stable" && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState({ status: "in-call", peer: activeThread.peer });
        }
        if (data.status === "declined" || data.status === "ended") cleanupCall();
      });
      onSnapshot(collection(db, "calls", callRef.id, "calleeCandidates"), (snap) => {
        snap.docChanges().forEach((c) => { if (c.type === "added") pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {}); });
      });
    } catch (e) { alert("Kamera/mikrofonga ruxsat berilmadi yoki xatolik yuz berdi."); cleanupCall(); }
  };
  const answerIncoming = async () => {
    if (!incomingCall || !enabled || !db || !fns) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      const { doc, getDoc, collection, addDoc, updateDoc, onSnapshot } = fns;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => setRemoteStream(e.streams[0]);
      const callRef = doc(db, "calls", incomingCall.id);
      const snap = await getDoc(callRef);
      const data = snap.data();
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      pc.onicecandidate = (e) => { if (e.candidate) addDoc(collection(db, "calls", incomingCall.id, "calleeCandidates"), e.candidate.toJSON()); };
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp }, status: "connected" });
      onSnapshot(collection(db, "calls", incomingCall.id, "callerCandidates"), (snap2) => {
        snap2.docChanges().forEach((c) => { if (c.type === "added") pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {}); });
      });
      onSnapshot(callRef, (snap3) => { const d3 = snap3.data(); if (d3?.status === "ended") cleanupCall(); });
      callIdRef.current = incomingCall.id;
      setCallState({ status: "in-call", peer: incomingCall.caller });
      setIncomingCall(null);
    } catch (e) { alert("Kamera/mikrofonga ruxsat berilmadi."); setIncomingCall(null); }
  };
  const declineIncoming = async () => {
    if (!incomingCall || !enabled || !db || !fns) { setIncomingCall(null); return; }
    try { await fns.updateDoc(fns.doc(db, "calls", incomingCall.id), { status: "declined" }); } catch {}
    setIncomingCall(null);
  };
  const toggleMic = () => { if (localStreamRef.current) { localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micOn)); setMicOn((v) => !v); } };
  const toggleCam = () => { if (localStreamRef.current) { localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !camOn)); setCamOn((v) => !v); } };

  // -------------------- Admin: bazani tozalash --------------------
  const resetEverything = async () => {
    if (!window.confirm("DIQQAT! Barcha foydalanuvchilar, postlar, reels, guruh va xabarlar butunlay o'chadi. Davom etasizmi?")) return;
    if (!enabled || !db || !fns) { localStorage.clear(); window.location.reload(); return; }
    try {
      const { collection, getDocs, deleteDoc, doc } = fns;
      const wipe = async (path) => { const snap = await getDocs(collection(db, path)); await Promise.all(snap.docs.map((d) => deleteDoc(d.ref))); return snap.docs; };
      await wipe("posts"); await wipe("reels"); await wipe("stories"); await wipe("follows");
      const userDocs = await getDocs(collection(db, "users"));
      for (const u of userDocs.docs) {
        const notifSnap = await getDocs(collection(db, "notifications", u.id, "items"));
        await Promise.all(notifSnap.docs.map((d) => deleteDoc(d.ref)));
      }
      await wipe("users");
      const groupDocs = await getDocs(collection(db, "groups"));
      for (const g of groupDocs.docs) {
        const thread = await getDocs(collection(db, "messages", "group_" + g.id, "thread"));
        await Promise.all(thread.docs.map((d) => deleteDoc(d.ref)));
      }
      await wipe("groups");
      localStorage.clear();
      alert("Baza tozalandi. Sahifa qayta yuklanadi.");
      window.location.reload();
    } catch (e) { alert("Tozalashda xatolik: " + e.message); }
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
            {!enabled && <p style={{ color: "#ffb84d", fontSize: 11.5, marginTop: 10, lineHeight: 1.5, background: "#2a2210", padding: "8px 12px", borderRadius: 8 }}>⚠️ Firebase ulanmagan — hozir faqat shu qurilmada ishlaydi.</p>}
          </div>

          <div style={{ display: "flex", background: C.card, borderRadius: 10, padding: 3, marginBottom: 18, border: `1px solid ${C.border}` }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); setAuthPassword(""); }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, background: authMode === m ? C.pink : "transparent", color: authMode === m ? "#1a0810" : C.inkDim }}>
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

          <div style={{ position: "relative" }}>
            <Lock size={15} color={C.inkDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input type="password" value={authPassword} onChange={(e) => { setAuthPassword(e.target.value); if (authError) setAuthError(""); }} onKeyDown={(e) => e.key === "Enter" && submitAuth()} placeholder="Parol" style={{ ...inputStyle, borderColor: authError ? C.pink : C.border, padding: "12px 14px 12px 38px" }} />
          </div>

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
  const groupPreview = (g) => { const t = dms[`group_${g.id}`] || []; return t[t.length - 1]; };
  const storiesByUser = {}; stories.forEach((s) => { (storiesByUser[s.author] ||= []).push(s); });
  const activeTid = activeThread ? threadIdFor({ ...activeThread, me: me.username }) : null;
  const activeMessages = activeTid ? (dms[activeTid] || []) : [];

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
        {/* LENTA */}
        {tab === "feed" && (
          <>
            <div style={{ display: "flex", gap: 14, padding: "14px 16px", overflowX: "auto", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => setStoryComposerOpen(true)} style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer", background: "none", padding: 0 }}>
                  <Avatar name={me.username} color={me.color} avatar={me.avatar} size={52} />
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bg}` }}><Plus size={12} color="#001a1f" strokeWidth={3} /></div>
                </button>
                <span style={{ fontSize: 11, color: C.inkDim }}>Siz</span>
              </div>
              {storyUsers.filter(([name]) => storiesByUser[name]?.length).map(([name, u]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setStoryViewer({ username: name, items: storiesByUser[name], idx: 0 })} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: "50%", backgroundImage: `linear-gradient(45deg, ${C.pink}, ${C.blue})` }}>
                    <div style={{ background: C.bg, borderRadius: "50%", padding: 2 }}><Avatar name={name} color={u.color} avatar={u.avatar} size={48} /></div>
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
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={post.author} /></div><div style={{ fontSize: 11, color: C.inkDim }}>{timeAgo(post.ts)}</div></div>
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
                        <div key={i} style={{ fontSize: 13, marginBottom: 6 }}><span style={{ fontWeight: 700 }}>{c.author}</span> <span style={{ color: C.inkDim, fontSize: 11 }}>{timeAgo(c.ts)}</span><div>{c.text}</div></div>
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

        {/* QIDIRUV */}
        {tab === "search" && (
          <div style={{ padding: 16 }}>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={18} color={C.inkDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Akkauntlarni qidirish..." style={{ ...inputStyle, marginBottom: 16, padding: "10px 10px 10px 38px" }} />
            </div>
            {searchQuery === "" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginBottom: 16 }}>
                {posts.filter((p) => p.media && !p.isVideo).slice(0, 21).map((p) => (
                  <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}><img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></div>
                ))}
              </div>
            )}
            {searchQuery !== "" && (filteredUsers.length === 0 ? <EmptyState text="Akkaunt topilmadi" /> : filteredUsers.map(([username, u]) => {
              const isMe = username === me.username, isF = following.includes(username);
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={username} color={u.color} avatar={u.avatar} size={42} />
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={username} /></div><div style={{ fontSize: 12, color: C.inkDim }}>{u.bio || "Foydalanuvchi"}</div></div>
                  </div>
                  {!isMe && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setViewingProfile(username); setTab("profile"); }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.ink, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><User size={14} /> Profil</button>
                      <button onClick={() => toggleFollow(username)} style={followBtnStyle(isF)}>{isF ? <UserCheck size={14} /> : <UserPlus size={14} />}{isF ? "Obunadasiz" : "Obuna bo'lish"}</button>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        )}

        {/* REELS */}
        {tab === "reels" && (
          <div style={{ height: "calc(100vh - 130px)", overflowY: "auto", scrollSnapType: "y mandatory" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Reels</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReelMuted((m) => !m)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, color: C.inkDim, cursor: "pointer" }}>{reelMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
                <button onClick={() => setReelComposerOpen(true)} style={{ background: C.pink, color: "#1a0810", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Reel</button>
              </div>
            </div>
            {reels.length === 0 ? <EmptyState text="Hozircha Reels yo'q" /> : reels.map((reel) => {
              const liked = reel.likes.includes(me.username);
              const u = users[reel.author] || {};
              return (
                <div key={reel.id} style={{ scrollSnapAlign: "start", position: "relative", height: "calc(100vh - 172px)", background: "#000", borderRadius: 16, overflow: "hidden", marginBottom: 14, marginLeft: 16, marginRight: 16, width: "calc(100% - 32px)" }}>
                  <video src={reel.videoUrl} autoPlay loop muted={reelMuted} playsInline onPlay={() => registerReelView(reel)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", right: 10, bottom: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                    <button onClick={() => toggleReelLike(reel)} style={{ background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Heart size={22} color={liked ? C.pink : "#fff"} fill={liked ? C.pink : "none"} /></button>
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, marginTop: -12 }}>{reel.likes.length}</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 4 }}>
                      <Eye size={20} color="#fff" />
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{(reel.views || []).length}</span>
                    </div>
                  </div>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Avatar name={reel.author} color={u.color} avatar={u.avatar} size={30} /><span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}><NameTag name={reel.author} /></span></div>
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

        {/* XABARLAR */}
        {tab === "messages" && (
          <div style={{ padding: activeThread ? 0 : 16 }}>
            {!activeThread ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Xabarlar</h2>
                  <button onClick={() => setGroupComposerOpen(true)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.ink, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Users size={14} /> Guruh</button>
                </div>
                {groups.map((g) => {
                  const lastMsg = groupPreview(g);
                  return (
                    <div key={g.id} onClick={() => setActiveThread({ type: "group", id: g.id, name: g.name, members: g.members })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                      <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.pink})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Users size={20} color="#001a1f" /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, display: "flex", justifyContent: "space-between" }}><span>{g.name}</span>{lastMsg && <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 400 }}>{timeAgo(lastMsg.ts)}</span>}</div>
                        <div style={{ fontSize: 13, color: C.inkDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastMsg ? `${lastMsg.from}: ${lastMsg.text}` : `${g.members.length} a'zo`}</div>
                      </div>
                    </div>
                  );
                })}
                {otherUsers.length === 0 && groups.length === 0 ? <EmptyState text="Boshqa foydalanuvchilar yo'q" /> : otherUsers.map((username) => {
                  const u = users[username] || {}, lastMsg = conversationPreview(username);
                  return (
                    <div key={username} onClick={() => setActiveThread({ type: "dm", peer: username })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                      <Avatar name={username} color={u.color} avatar={u.avatar} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, display: "flex", justifyContent: "space-between" }}><NameTag name={username} />{lastMsg && <span style={{ fontSize: 11, color: C.inkDim, fontWeight: 400 }}>{timeAgo(lastMsg.ts)}</span>}</div>
                        <div style={{ fontSize: 13, color: C.inkDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                          {lastMsg?.from === me.username && (lastMsg.read ? <CheckCheck size={13} color={C.blue} /> : <Check size={13} color={C.inkDim} />)}
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
                  <button onClick={() => setActiveThread(null)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "flex" }}><ArrowLeft size={20} /></button>
                  {activeThread.type === "group" ? (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.pink})`, display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={16} color="#001a1f" /></div>
                  ) : (
                    <Avatar name={activeThread.peer} color={users[activeThread.peer]?.color} avatar={users[activeThread.peer]?.avatar} size={32} />
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{activeThread.type === "group" ? activeThread.name : <NameTag name={activeThread.peer} />}</span>
                  {activeThread.type === "dm" && enabled && (
                    <button onClick={startCall} title="Video qo'ng'iroq" style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", display: "flex" }}><VideoIcon size={19} /></button>
                  )}
                  <button onClick={() => setThemePickerOpen(true)} title="Mavzu" style={{ background: "none", border: "none", color: C.inkDim, cursor: "pointer", display: "flex" }}><Palette size={17} /></button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 6, background: CHAT_THEMES[chatTheme].bg }}>
                  {activeMessages.map((m, idx) => {
                    const isMe = m.from === me.username;
                    return (
                      <div key={m.id || idx} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "78%", display: "flex", flexDirection: "column" }}>
                        {activeThread.type === "group" && !isMe && <span style={{ fontSize: 11, color: C.blue, marginBottom: 2, marginLeft: 4 }}>{m.from}</span>}
                        <div style={{ background: isMe ? "#1f5a3a" : C.card, color: C.ink, padding: "8px 12px 6px", borderRadius: isMe ? "14px 14px 3px 14px" : "14px 14px 14px 3px", fontSize: 14, lineHeight: 1.4 }}>
                          {m.text}
                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: C.inkDim }}>{new Date(m.ts).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
                            {isMe && activeThread.type === "dm" && (m.read ? <CheckCheck size={13} color={C.blue} /> : <Check size={13} color={C.inkDim} />)}
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
        {tab === "profile" && (() => {
          const profileUser = viewingProfile || me.username;
          const isMine = profileUser === me.username;
          const u = isMine ? me : (users[profileUser] || {});
          const userPosts = posts.filter((p) => p.author === profileUser);
          const isF = following.includes(profileUser);
          return (
            <div style={{ padding: 16 }}>
              {!isMine && (
                <button onClick={() => setViewingProfile(null)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 14, padding: 0, fontSize: 13, fontWeight: 600 }}>
                  <ArrowLeft size={18} /> Orqaga
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <Avatar name={profileUser} color={u.color} avatar={u.avatar} size={64} />
                <div><div style={{ fontSize: 16, fontWeight: 800 }}><NameTag name={profileUser} size={16} /></div><div style={{ fontSize: 13, color: C.inkDim, marginTop: 2 }}>{userPosts.length} ta post</div></div>
              </div>
              {!isMine && (
                <button onClick={() => toggleFollow(profileUser)} style={{ ...followBtnStyle(isF), width: "100%", justifyContent: "center", padding: 10, marginBottom: 16 }}>
                  {isF ? <UserCheck size={16} /> : <UserPlus size={16} />} {isF ? "Obunadasiz" : "Obuna bo'lish"}
                </button>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginBottom: 20 }}>
                {userPosts.map((p) => (
                  <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}>
                    {p.media ? (p.isVideo ? <video src={p.media} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />) : <div style={{ position: "absolute", inset: 0, padding: 8, fontSize: 11, background: C.card, overflow: "hidden" }}>{p.text}</div>}
                  </div>
                ))}
                {userPosts.length === 0 && <div style={{ gridColumn: "span 3" }}><EmptyState text="Postlar yo'q" /></div>}
              </div>
              {isMine && isAdmin(me.username) && (
                <button onClick={resetEverything} style={{ width: "100%", background: "#2a0f14", border: "1px solid #5a1a24", color: "#ff6b81", borderRadius: 8, padding: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Trash2 size={14} /> Admin: barcha ma'lumotlarni tozalash
                </button>
              )}
            </div>
          );
        })()}

        {/* BILDIRISHNOMALAR */}
        {tab === "notifs" && (
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>Bildirishnomalar</h2>
            {notifications.length === 0 ? <EmptyState text="Bildirishnomalar yo'q" /> : notifications.map((n) => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><div><span style={{ fontWeight: 700 }}>{n.from}</span> {n.text}</div><span style={{ color: C.inkDim, fontSize: 11 }}>{timeAgo(n.ts)}</span></div>
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
        <IconTab active={tab === "messages"} onClick={() => { setTab("messages"); setActiveThread(null); }} Icon={MessagesSquare} />
        <IconTab active={tab === "profile"} onClick={() => { setViewingProfile(null); setTab("profile"); }} Icon={User} />
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
            <div style={{ position: "relative", marginBottom: 10 }}><video src={reelMedia} controls style={{ width: "100%", maxHeight: 220, borderRadius: 8 }} /><button onClick={() => setReelMedia("")} style={removeMediaBtnStyle}><X size={14} /></button></div>
          ) : (
            <label style={{ ...fileLabelStyle, width: "100%", justifyContent: "center", padding: 22, marginBottom: 12 }}><VideoIcon size={18} /> Video tanlash<input type="file" accept="video/*" onChange={handleReelFile} style={{ display: "none" }} /></label>
          )}
          <textarea value={reelCaption} onChange={(e) => setReelCaption(e.target.value)} placeholder="Izoh yozing..." style={{ ...inputStyle, height: 60, resize: "none" }} />
          <button onClick={submitReel} style={submitBtnStyle}>Yuklash</button>
        </Modal>
      )}

      {/* STORY MODALI */}
      {storyComposerOpen && (
        <Modal onClose={() => setStoryComposerOpen(false)} title="Hikoya qo'shish (24 soat)">
          {storyMedia ? (
            <div style={{ position: "relative", marginBottom: 12 }}><img src={storyMedia} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 8 }} /><button onClick={() => setStoryMedia("")} style={removeMediaBtnStyle}><X size={14} /></button></div>
          ) : (
            <label style={{ ...fileLabelStyle, width: "100%", justifyContent: "center", padding: 30, marginBottom: 12 }}><ImageIcon size={18} /> Rasm tanlash<input type="file" accept="image/*" onChange={handleStoryFile} style={{ display: "none" }} /></label>
          )}
          <button onClick={submitStory} style={submitBtnStyle}>Ulashish</button>
        </Modal>
      )}

      {/* GURUH MODALI */}
      {groupComposerOpen && (
        <Modal onClose={() => setGroupComposerOpen(false)} title="Yangi guruh yaratish">
          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Guruh nomi" style={inputStyle} />
          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 14 }}>
            {otherUsers.length === 0 && <p style={{ color: C.inkDim, fontSize: 13 }}>Boshqa foydalanuvchi yo'q</p>}
            {otherUsers.map((u) => {
              const checked = groupMembers.includes(u);
              return (
                <label key={u} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                  <input type="checkbox" checked={checked} onChange={() => setGroupMembers((prev) => checked ? prev.filter((x) => x !== u) : [...prev, u])} />
                  <Avatar name={u} color={users[u]?.color} avatar={users[u]?.avatar} size={30} />
                  <span style={{ fontSize: 13 }}><NameTag name={u} /></span>
                </label>
              );
            })}
          </div>
          <button onClick={submitGroup} disabled={!groupName.trim() || groupMembers.length === 0} style={{ ...submitBtnStyle, opacity: !groupName.trim() || groupMembers.length === 0 ? 0.5 : 1 }}>Guruh yaratish</button>
        </Modal>
      )}

      {/* MAVZU TANLASH MODALI */}
      {themePickerOpen && (
        <Modal onClose={() => setThemePickerOpen(false)} title="Chat mavzusi">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(CHAT_THEMES).map(([key, t]) => (
              <button key={key} onClick={() => { setChatTheme(key); setThemePickerOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 10, border: chatTheme === key ? `2px solid ${C.pink}` : `1px solid ${C.border}`, cursor: "pointer", background: C.cardAlt }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: t.bg }} />
                <span style={{ color: C.ink, fontSize: 14, fontWeight: 600 }}>{t.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* STORY KO'RISH OYNASI */}
      {storyViewer && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", gap: 4 }}>
            {storyViewer.items.map((_, i) => (<div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= storyViewer.idx ? "#fff" : "rgba(255,255,255,0.3)" }} />))}
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

      {/* KIRUVCHI QO'NG'IROQ */}
      {incomingCall && callState.status === "idle" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <Avatar name={incomingCall.caller} color={users[incomingCall.caller]?.color} avatar={users[incomingCall.caller]?.avatar} size={90} />
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{incomingCall.caller}</div>
          <div style={{ color: C.inkDim, fontSize: 14 }}>video qo'ng'iroq qilyapti...</div>
          <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
            <button onClick={declineIncoming} style={{ width: 58, height: 58, borderRadius: "50%", background: "#ff3d6e", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneOff size={24} color="#fff" /></button>
            <button onClick={answerIncoming} style={{ width: 58, height: 58, borderRadius: "50%", background: "#25d366", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={24} color="#fff" /></button>
          </div>
        </div>
      )}

      {/* QO'NG'IROQ OYNASI (calling / in-call) */}
      {(callState.status === "calling" || callState.status === "in-call") && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 40, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, position: "relative" }}>
            {remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <Avatar name={callState.peer} color={users[callState.peer]?.color} avatar={users[callState.peer]?.avatar} size={90} />
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{callState.peer}</div>
                <div style={{ color: C.inkDim, fontSize: 14 }}>{callState.status === "calling" ? "chaqirilmoqda..." : "ulanmoqda..."}</div>
              </div>
            )}
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 100, right: 16, width: 110, height: 150, objectFit: "cover", borderRadius: 12, border: `2px solid ${C.border}`, background: "#111" }} />
          </div>
          <div style={{ padding: "18px 0 30px", display: "flex", justifyContent: "center", gap: 20, background: "rgba(0,0,0,0.6)" }}>
            <button onClick={toggleMic} style={{ width: 50, height: 50, borderRadius: "50%", background: micOn ? C.cardAlt : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{micOn ? <Mic size={20} color="#fff" /> : <MicOff size={20} color="#000" />}</button>
            <button onClick={hangUp} style={{ width: 58, height: 58, borderRadius: "50%", background: "#ff3d6e", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneOff size={24} color="#fff" /></button>
            <button onClick={toggleCam} style={{ width: 50, height: 50, borderRadius: "50%", background: camOn ? C.cardAlt : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{camOn ? <VideoIcon size={20} color="#fff" /> : <VideoOff size={20} color="#000" />}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Kichik komponentlar / uslublar ----------
function NameTag({ name, size = 14 }) {
  const v = isVerified(name);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{name}{v && <BadgeCheck size={size} color={C.blue} fill="#0d2b33" />}</span>;
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
