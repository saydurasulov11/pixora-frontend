import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, Grid3x3, User, Home, Loader2, X,
  MessagesSquare, ArrowLeft, BadgeCheck, Search, Clapperboard, UserPlus,
  UserCheck, Bell, PlusSquare, Image as ImageIcon, Video as VideoIcon,
} from "lucide-react";

/**
 * SARDOGRAM
 * To'liq mustaqil, serversiz ijtimoiy tarmoq ilovasi.
 */

// ---------- Ranglar va shrift ----------
const C = {
  bg: "#0d0e12",
  card: "#17181d",
  cardAlt: "#1e2027",
  border: "#262832",
  pink: "#ff3d6e",
  blue: "#3ddbff",
  ink: "#f5f4f2",
  inkDim: "#8f8d99",
};
const FONT = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const AVATAR_COLORS = ["#ff3d6e", "#3ddbff", "#ffb84d", "#8b6bff", "#4dd48a", "#ff7a5c"];
const STORAGE_PREFIX = "sardogram_";
const key = (name) => `${STORAGE_PREFIX}${name}`;

// Faqat shu nikliklar avtomatik tasdiqlash belgisini oladi
const VERIFIED_ALLOWED = ["sardor", "davlat", "shuxrat"];
// Parol tizimi joriy qilingani uchun bir martalik migratsiya kaliti
const MIGRATION_KEY = key("migrated_password_v2");

// ---------- Stil yordamchilari ----------
const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.card,
  color: C.ink,
  fontSize: 14,
  outline: "none",
  fontFamily: FONT,
  marginBottom: 12,
  boxSizing: "border-box",
};

function likeBtnStyle(liked) {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: liked ? C.pink : C.inkDim,
    fontWeight: 600,
    fontSize: 13,
    padding: 0,
  };
}

function followBtnStyle(isFollowing) {
  return {
    background: isFollowing ? "transparent" : C.pink,
    color: isFollowing ? C.ink : "#1a0810",
    border: isFollowing ? `1px solid ${C.border}` : "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  };
}

// ---------- Yordamchi funksiyalar ----------
function readLS(name, fallback) {
  try {
    const raw = localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(name, value) {
  localStorage.setItem(key(name), JSON.stringify(value));
}
function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "hozir";
  if (d < 3600) return `${Math.floor(d / 60)} daqiqa oldin`;
  if (d < 86400) return `${Math.floor(d / 3600)} soat oldin`;
  return `${Math.floor(d / 86400)} kun oldin`;
}
function convoKey(a, b) {
  return [a, b].sort().join("::");
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function findUserKey(usersObj, name) {
  return Object.keys(usersObj).find((u) => u.toLowerCase() === name.toLowerCase());
}

// ---------- Kichik komponentlar ----------
function NameTag({ name, verified, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {name}
      {verified && <BadgeCheck size={size} color={C.blue} fill="#0d2b33" style={{ flexShrink: 0 }} />}
    </span>
  );
}

function Avatar({ name, color, avatar, size = 36 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: color || C.pink, display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 700, color: "#0d0d0f",
        fontSize: size * 0.42, fontFamily: FONT, overflow: "hidden",
      }}
    >
      {avatar
        ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (name || "?")[0]?.toUpperCase()}
    </div>
  );
}

function IconTab({ active, onClick, Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 8,
        color: active ? C.pink : C.inkDim, display: "flex", alignItems: "center",
        transition: "color 0.15s",
      }}
    >
      <Icon size={22} fill={active ? C.pink : "none"} strokeWidth={active ? 2.4 : 2} />
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: C.inkDim, fontSize: 14 }}>
      {text}
    </div>
  );
}

// ---------- Asosiy komponent ----------
export default function Sardogram() {
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState({});
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [following, setFollowing] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dms, setDms] = useState({});

  const [tab, setTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");

  // Auth holati
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authColor, setAuthColor] = useState(AVATAR_COLORS[0]);
  const [authAvatar, setAuthAvatar] = useState("");
  const [authError, setAuthError] = useState("");

  // Post/Reel yaratish modal/oynalari
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftMedia, setDraftMedia] = useState("");
  const [draftIsVideo, setDraftIsVideo] = useState(false);

  const [reelComposerOpen, setReelComposerOpen] = useState(false);
  const [reelMedia, setReelMedia] = useState("");
  const [reelCaption, setReelCaption] = useState("");

  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});

  // DM
  const [dmTarget, setDmTarget] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const chatEndRef = useRef(null);

  // ---------- Boshlang'ich yuklash ----------
  useEffect(() => {
    const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
    if (!alreadyMigrated) {
      ["posts", "reels", "users", "following", "notifs", "dms", "me"].forEach((name) =>
        localStorage.removeItem(key(name))
      );
      localStorage.setItem(MIGRATION_KEY, "1");
    }

    setPosts(readLS("posts", []));
    setReels(readLS("reels", []));
    setUsers(readLS("users", {}));
    setFollowing(readLS("following", []));
    setNotifications(readLS("notifs", []));
    setDms(readLS("dms", {}));
    const savedMe = readLS("me", null);
    if (savedMe) setMe(savedMe);
    setBooting(false);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dms, dmTarget]);

  // ---------- Persist funksiyalar ----------
  const persistPosts = useCallback((next) => { setPosts(next); writeLS("posts", next); }, []);
  const persistReels = useCallback((next) => { setReels(next); writeLS("reels", next); }, []);
  const persistUsers = useCallback((next) => { setUsers(next); writeLS("users", next); }, []);
  const persistFollowing = useCallback((next) => { setFollowing(next); writeLS("following", next); }, []);
  const persistNotifs = useCallback((next) => { setNotifications(next); writeLS("notifs", next); }, []);
  const persistDms = useCallback((next) => { setDms(next); writeLS("dms", next); }, []);

  const addNotification = (fromUser, text) => {
    const item = { id: Date.now(), from: fromUser, text, ts: Date.now() };
    persistNotifs([item, ...notifications]);
  };

  // ---------- Auth ----------
  const submitAuth = () => {
    const name = authName.trim();
    const password = authPassword;
    if (!name) {
      setAuthError("Ismingizni kiriting");
      return;
    }
    if (!password) {
      setAuthError("Parolni kiriting");
      return;
    }
    const latestUsers = readLS("users", {});
    if (authMode === "register") {
      const taken = findUserKey(latestUsers, name);
      if (taken) {
        setAuthError(`"${name}" nomi band. Boshqasini tanlang.`);
        return;
      }
      const autoVerified = VERIFIED_ALLOWED.includes(name.toLowerCase());
      const userRecord = {
        bio: "",
        color: authColor,
        avatar: authAvatar.trim(),
        verified: autoVerified,
        password,
      };
      const nextUsers = { ...latestUsers, [name]: userRecord };
      persistUsers(nextUsers);
      const profile = { username: name, ...userRecord };
      setMe(profile);
      writeLS("me", profile);
    } else {
      const existingKey = findUserKey(latestUsers, name);
      const existing = existingKey ? latestUsers[existingKey] : null;
      if (!existing) {
        setAuthError(`"${name}" nomli akkaunt topilmadi. Ro'yxatdan o'ting.`);
        return;
      }
      if (existing.password !== password) {
        setAuthError("Parol noto'g'ri");
        return;
      }
      const profile = { username: existingKey, ...existing };
      setUsers(latestUsers);
      setMe(profile);
      writeLS("me", profile);
    }
    setAuthError("");
    setAuthPassword("");
  };

  const logout = () => {
    setMe(null);
    localStorage.removeItem(key("me"));
  };

  // ---------- Media yuklash ----------
  const handleDraftFile = async (e, isVideo) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setDraftMedia(dataUrl);
    setDraftIsVideo(isVideo);
  };
  const handleReelFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setReelMedia(dataUrl);
  };

  // ---------- Post / Reel / Like / Comment ----------
  const submitPost = () => {
    if ((!draftText.trim() && !draftMedia) || !me) return;
    const newPost = {
      id: `p_${Date.now()}`,
      author: me.username,
      text: draftText.trim(),
      media: draftMedia,
      isVideo: draftIsVideo,
      ts: Date.now(),
      likes: [],
      comments: [],
    };
    persistPosts([newPost, ...posts]);
    setDraftText(""); setDraftMedia(""); setDraftIsVideo(false); setComposerOpen(false);
  };

  const submitReel = () => {
    if (!reelMedia || !me) return;
    const newReel = {
      id: `r_${Date.now()}`,
      author: me.username,
      videoUrl: reelMedia,
      caption: reelCaption.trim(),
      ts: Date.now(),
      likes: [],
    };
    persistReels([newReel, ...reels]);
    setReelMedia(""); setReelCaption(""); setReelComposerOpen(false);
  };

  const toggleLike = (id) => {
    if (!me) return;
    persistPosts(posts.map((p) => {
      if (p.id !== id) return p;
      const has = p.likes.includes(me.username);
      if (!has) addNotification(p.author, "postingizni yoqtirdi");
      return { ...p, likes: has ? p.likes.filter((u) => u !== me.username) : [...p.likes, me.username] };
    }));
  };

  const toggleReelLike = (id) => {
    if (!me) return;
    persistReels(reels.map((r) => {
      if (r.id !== id) return r;
      const has = r.likes.includes(me.username);
      return { ...r, likes: has ? r.likes.filter((u) => u !== me.username) : [...r.likes, me.username] };
    }));
  };

  const submitComment = (id) => {
    const text = (commentDrafts[id] || "").trim();
    if (!text || !me) return;
    persistPosts(posts.map((p) => {
      if (p.id !== id) return p;
      addNotification(p.author, `izoh qoldirdi: "${text}"`);
      return { ...p, comments: [...p.comments, { author: me.username, text, ts: Date.now() }] };
    }));
    setCommentDrafts((d) => ({ ...d, [id]: "" }));
  };

  const toggleFollow = (username) => {
    if (following.includes(username)) {
      persistFollowing(following.filter((u) => u !== username));
    } else {
      persistFollowing([...following, username]);
      addNotification(username, "sizga obuna bo'ldi");
    }
  };

  const sendMessage = () => {
    const text = messageDraft.trim();
    if (!text || !me || !dmTarget) return;
    const k = convoKey(me.username, dmTarget);
    const thread = dms[k] || [];
    persistDms({ ...dms, [k]: [...thread, { from: me.username, text, ts: Date.now() }] }]);
    setMessageDraft("");
  };

  // ---------- Yuklanish holati ----------
  if (booting) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={30} color={C.pink} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---------- Kirish / Ro'yxatdan o'tish ekrani ----------
  if (!me) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp 0.5s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20, margin: "0 auto 14px", display: "flex",
              alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${C.pink}, #ff7e5f)`,
              boxShadow: `0 0 34px ${C.pink}55`, animation: "pulseGlow 2.4s ease-in-out infinite alternate",
            }}>
              <span style={{ fontWeight: 900, fontSize: 30, color: "#fff" }}>S</span>
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
              <span style={{ color: C.pink }}>Sardo</span>
              <span style={{ color: C.blue }}>gram</span>
            </h1>
            <p style={{ color: C.inkDim, fontSize: 14, marginTop: 6 }}>
              Rasm, video va xabarlaringizni ulashing.
            </p>
          </div>

          <div style={{ display: "flex", background: C.card, borderRadius: 10, padding: 3, marginBottom: 18, border: `1px solid ${C.border}` }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => { setAuthMode(m); setAuthError(""); }}
                style={{
                  flex: 1, padding: 10, border: "none", borderRadius: 8, cursor: "pointer",
                  fontWeight: 700, fontSize: 13, transition: "background 0.15s",
                  background: authMode === m ? C.pink : "transparent",
                  color: authMode === m ? "#1a0810" : C.inkDim,
                }}
              >
                {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
              </button>
            ))}
          </div>

          {authMode === "register" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: "center" }}>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAuthColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                      border: authColor === c ? `2px solid ${C.ink}` : "2px solid transparent",
                    }}
                  />
                ))}
              </div>
              <input
                value={authAvatar}
                onChange={(e) => setAuthAvatar(e.target.value)}
                placeholder="Avatar rasm havolasi (ixtiyoriy)"
                style={inputStyle}
              />
            </>
          )}

          <input
            value={authName}
            onChange={(e) => { setAuthName(e.target.value); if (authError) setAuthError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submitAuth()}
            placeholder="Foydalanuvchi nomi"
            style={{ ...inputStyle, borderColor: authError ? C.pink : C.border }}
          />

          <input
            type="password"
            value={authPassword}
            onChange={(e) => { setAuthPassword(e.target.value); if (authError) setAuthError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submitAuth()}
            placeholder="Parol"
            style={{ ...inputStyle, borderColor: authError ? C.pink : C.border }}
          />

          {authError && <div style={{ color: C.pink, fontSize: 12, marginTop: -6, marginBottom: 10 }}>{authError}</div>}

          <button
            onClick={submitAuth}
            disabled={!authName.trim() || !authPassword}
            style={{
              width: "100%", padding: 14, borderRadius: 10, border: "none", marginTop: 4,
              fontWeight: 700, fontSize: 15, cursor: (authName.trim() && authPassword) ? "pointer" : "default",
              background: (authName.trim() && authPassword) ? C.pink : C.border,
              color: (authName.trim() && authPassword) ? "#1a0810" : C.inkDim,
              boxShadow: (authName.trim() && authPassword) ? `0 6px 20px ${C.pink}55` : "none",
              transition: "all 0.15s",
            }}
          >
            {authMode === "login" ? "Kirish" : "Akkaunt ochish"}
          </button>
        </div>

        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulseGlow { from { transform: scale(1); } to { transform: scale(1.06); } }
        `}</style>
      </div>
    );
  }

  // ---------- Hisoblangan qiymatlar ----------
  const storyUsers = Object.entries(users);
  const otherUsers = Object.keys(users).filter((u) => u !== me.username);
  const filteredUsers = Object.entries(users).filter(([u]) => u.toLowerCase().includes(searchQuery.toLowerCase()));
  const conversationPreview = (otherUser) => {
    const thread = dms[convoKey(me.username, otherUser)] || [];
    return thread[thread.length - 1];
  };

  // ---------- Asosiy interfeys ----------
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(13,14,18,0.9)",
        backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`,
        padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          <span style={{ color: C.pink }}>Sardo</span>
          <span style={{ color: C.blue }}>gram</span>
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconTab active={tab === "notifs"} onClick={() => setTab("notifs")} Icon={Bell} />
          <button
            onClick={() => setComposerOpen(true)}
            style={{
              background: C.pink, border: "none", borderRadius: 8, padding: "8px 14px",
              color: "#1a0810", fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <PlusSquare size={15} /> Post
          </button>
          <button
            onClick={logout}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 12px", color: C.inkDim, fontWeight: 600, fontSize: 12, cursor: "pointer",
            }}
          >
            Chiqish
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 76 }}>
        {/* LENTA */}
        {tab === "feed" && (
          <>
            <div style={{ display: "flex", gap: 14, padding: "14px 16px", overflowX: "auto", borderBottom: `1px solid ${C.border}` }}>
              {storyUsers.map(([name, u]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <div style={{ padding: 2, borderRadius: "50%", background: `linear-gradient(45deg, ${C.pink}, ${C.blue})` }}>
                    <div style={{ background: C.bg, borderRadius: "50%", padding: 2 }}>
                      <Avatar name={name} color={u.color} avatar={u.avatar} size={48} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: C.inkDim, maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 2 }}>
                    {name}
                    {u.verified && <BadgeCheck size={11} color={C.blue} fill="#0d2b33" />}
                  </span>
                </div>
              ))}
            </div>

            {posts.length === 0 ? (
              <EmptyState text="Hali postlar yo'q. Birinchi bo'lib ulashing!" />
            ) : posts.map((post) => {
              const liked = post.likes.includes(me.username);
              const u = users[post.author] || {};
              return (
                <div key={post.id} style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar name={post.author} color={u.color} avatar={u.avatar} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        <NameTag name={post.author} verified={u.verified} />
                      </div>
                      <div style={{ fontSize: 11, color: C.inkDim }}>{timeAgo(post.ts)}</div>
                    </div>
                  </div>

                  {post.media && (
                    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 10, background: "#000" }}>
                      {post.isVideo
                        ? <video src={post.media} controls style={{ width: "100%", maxHeight: 480, display: "block" }} />
                        : <img src={post.media} alt="" style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }} />}
                    </div>
                  )}

                  {post.text && <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.5 }}>{post.text}</p>}

                  <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    <button onClick={() => toggleLike(post.id)} style={likeBtnStyle(liked)}>
                      <Heart size={18} fill={liked ? C.pink : "none"} />
                      {post.likes.length > 0 && post.likes.length}
                    </button>
                    <button onClick={() => setOpenComments((o) => ({ ...o, [post.id]: !o[post.id] }))} style={likeBtnStyle(false)}>
                      <MessageCircle size={18} />
                      {post.comments.length > 0 && post.comments.length}
                    </button>
                    <Bookmark size={18} color={C.inkDim} style={{ marginLeft: "auto" }} />
                  </div>

                  {openComments[post.id] && (
                    <div style={{ marginTop: 10 }}>
                      {post.comments.map((c, i) => (
                        <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>{c.author}</span>{" "}
                          <span style={{ color: C.inkDim, fontSize: 11 }}>{timeAgo(c.ts)}</span>
                          <div>{c.text}</div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <input
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                          placeholder="Izoh yozing..."
                          style={{ ...inputStyle, marginBottom: 0, padding: "8px 10px", fontSize: 13, flex: 1 }}
                        />
                        <button onClick={() => submitComment(post.id)} style={{ background: "none", border: "none", color: C.pink, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                          Yuborish
                        </button>
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
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Akkauntlarni qidirish..."
                style={{ ...inputStyle, marginBottom: 0, padding: "10px 10px 10px 38px" }}
              />
            </div>
            {filteredUsers.length === 0 ? (
              <EmptyState text="Akkaunt topilmadi" />
            ) : filteredUsers.map(([username, u]) => {
              const isMe = username === me.username;
              const isFollowing = following.includes(username);
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={username} color={u.color} avatar={u.avatar} size={42} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={username} verified={u.verified} /></div>
                      <div style={{ fontSize: 12, color: C.inkDim }}>{u.bio || "Foydalanuvchi"}</div>
                    </div>
                  </div>
                  {!isMe && (
                    <button onClick={() => toggleFollow(username)} style={followBtnStyle(isFollowing)}>
                      {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                      {isFollowing ? "Obunadasiz" : "Obuna bo'lish"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* REELS */}
        {tab === "reels" && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Reels</h2>
              <button onClick={() => setReelComposerOpen(true)} style={{ background: C.pink, color: "#1a0810", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                + Reel
              </button>
            </div>
            {reels.length === 0 ? (
              <EmptyState text="Hozircha Reels yo'q" />
            ) : reels.map((reel) => {
              const liked = reel.likes.includes(me.username);
              const u = users[reel.author] || {};
              return (
                <div key={reel.id} style={{ background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
                  <video src={reel.videoUrl} controls style={{ width: "100%", maxHeight: 550, display: "block" }} />
                  <div style={{ padding: 12, background: C.card }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={reel.author} color={u.color} avatar={u.avatar} size={28} />
                        <span style={{ fontSize: 13, fontWeight: 700 }}><NameTag name={reel.author} verified={u.verified} /></span>
                      </div>
                      <button onClick={() => toggleReelLike(reel.id)} style={likeBtnStyle(liked)}>
                        <Heart size={19} fill={liked ? C.pink : "none"} />
                        <span style={{ fontSize: 12 }}>{reel.likes.length}</span>
                      </button>
                    </div>
                    {reel.caption && <p style={{ margin: 0, fontSize: 13, color: C.inkDim }}>{reel.caption}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GRID / MENING POSTLARIM */}
        {tab === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: 2 }}>
            {posts.filter((p) => p.media).map((p) => (
              <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}>
                {p.isVideo
                  ? <video src={p.media} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  : <img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
            ))}
            {posts.filter((p) => p.media).length === 0 && (
              <div style={{ gridColumn: "span 3" }}><EmptyState text="Media postlar yo'q" /></div>
            )}
          </div>
        )}

        {/* XABARLAR */}
        {tab === "messages" && (
          <div style={{ padding: 16 }}>
            {!dmTarget ? (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>Xabarlar</h2>
                {otherUsers.length === 0 ? (
                  <EmptyState text="Boshqa foydalanuvchilar yo'q" />
                ) : otherUsers.map((username) => {
                  const u = users[username] || {};
                  const lastMsg = conversationPreview(username);
                  return (
                    <div key={username} onClick={() => setDmTarget(username)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                      <Avatar name={username} color={u.color} avatar={u.avatar} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={username} verified={u.verified} /></div>
                        <div style={{ fontSize: 12, color: C.inkDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lastMsg ? `${lastMsg.from === me.username ? "Siz: " : ""}${lastMsg.text}` : "Suhbatni boshlash"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
                  <button onClick={() => setDmTarget(null)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", padding: 0, display: "flex" }}>
                    <ArrowLeft size={20} />
                  </button>
                  <Avatar name={dmTarget} color={users[dmTarget]?.color} avatar={users[dmTarget]?.avatar} size={34} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    <NameTag name={dmTarget} verified={users[dmTarget]?.verified} />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 }}>
                  {(dms[convoKey(me.username, dmTarget)] || []).map((m, i) => {
                    const isMe = m.from === me.username;
                    return (
                      <div key={i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%", background: isMe ? C.pink : C.card, color: isMe ? "#1a0810" : C.ink, padding: "8px 12px", borderRadius: 12, fontSize: 13 }}>
                        <div>{m.text}</div>
                        <div style={{ fontSize: 10, color: isMe ? "rgba(26,8,16,0.6)" : C.inkDim, textAlign: "right", marginTop: 2 }}>{timeAgo(m.ts)}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                  <input
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Xabar yozing..."
                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                  />
                  <button onClick={sendMessage} style={{ background: C.pink, border: "none", borderRadius: 10, width: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Send size={18} color="#1a0810" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BILDIRISHNOMALAR */}
        {tab === "notifs" && (
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>Bildirishnomalar</h2>
            {notifications.length === 0 ? (
              <EmptyState text="Bildirishnomalar yo'q" />
            ) : notifications.map((n) => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{n.from}</span> {n.text}
                </div>
                <div style={{ fontSize: 11, color: C.inkDim }}>{timeAgo(n.ts)}</div>
              </div>
            ))}
          </div>
        )}

        {/* PROFIL */}
        {tab === "profile" && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <Avatar name={me.username} color={me.color} avatar={me.avatar} size={72} />
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 4 }}>
                  <NameTag name={me.username} verified={me.verified} size={16} />
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: C.inkDim }}>{me.bio || "Biografiya kiritilmagan"}</p>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Mening postlarim</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                {posts.filter((p) => p.author === me.username && p.media).map((p) => (
                  <div key={p.id} style={{ position: "relative", paddingTop: "100%", background: "#000" }}>
                    {p.isVideo
                      ? <video src={p.media} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      : <img src={p.media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PASTKI NAVIGATSIYA */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 5,
        background: "rgba(13,14,18,0.95)", backdropFilter: "blur(14px)",
        borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around",
        padding: "10px 0", maxWidth: 480, margin: "0 auto",
      }}>
        <IconTab active={tab === "feed"} onClick={() => setTab("feed")} Icon={Home} />
        <IconTab active={tab === "search"} onClick={() => setTab("search")} Icon={Search} />
        <IconTab active={tab === "reels"} onClick={() => setTab("reels")} Icon={Clapperboard} />
        <IconTab active={tab === "grid"} onClick={() => setTab("grid")} Icon={Grid3x3} />
        <IconTab active={tab === "messages"} onClick={() => setTab("messages")} Icon={MessagesSquare} />
        <IconTab active={tab === "profile"} onClick={() => setTab("profile")} Icon={User} />
      </div>

      {/* POST YARATISH MODALI */}
      {composerOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{ background: C.card, width: "100%", maxWidth: 400, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Yangi post yaratish</h3>
              <button onClick={() => setComposerOpen(false)} style={{ background: "none", border: "none", color: C.inkDim, cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Nima gaplar?"
              style={{ ...inputStyle, height: 90, resize: "none", marginBottom: 12 }}
            />
            {draftMedia && (
              <div style={{ position: "relative", marginBottom: 12, borderRadius: 8, overflow: "hidden", background: "#000" }}>
                {draftIsVideo ? (
                  <video src={draftMedia} style={{ width: "100%", maxHeight: 200, display: "block" }} />
                ) : (
                  <img src={draftMedia} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                )}
                <button onClick={() => setDraftMedia("")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} />
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.pink, cursor: "pointer", background: C.cardAlt, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <ImageIcon size={16} /> Rasm
                <input type="file" accept="image/*" onChange={(e) => handleDraftFile(e, false)} style={{ display: "none" }} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.blue, cursor: "pointer", background: C.cardAlt, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <VideoIcon size={16} /> Video
                <input type="file" accept="video/*" onChange={(e) => handleDraftFile(e, true)} style={{ display: "none" }} />
              </label>
            </div>
            <button
              onClick={submitPost}
              disabled={!draftText.trim() && !draftMedia}
              style={{
                width: "100%", padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14,
                background: (draftText.trim() || draftMedia) ? C.pink : C.border,
                color: (draftText.trim() || draftMedia) ? "#1a0810" : C.inkDim,
                cursor: (draftText.trim() || draftMedia) ? "pointer" : "default",
              }}
            >
              Ulashish
            </button>
          </div>
        </div>
      )}

      {/* REEL YARATISH MODALI */}
      {reelComposerOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{ background: C.card, width: "100%", maxWidth: 400, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Yangi Reel yaratish</h3>
              <button onClick={() => setReelComposerOpen(false)} style={{ background: "none", border: "none", color: C.inkDim, cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            {!reelMedia ? (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 160, border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", color: C.inkDim, marginBottom: 16 }}>
                <VideoIcon size={32} color={C.pink} />
                <span>Reel videosini tanlang</span>
                <input type="file" accept="video/*" onChange={handleReelFile} style={{ display: "none" }} />
              </label>
            ) : (
              <div style={{ position: "relative", marginBottom: 12, borderRadius: 8, overflow: "hidden", background: "#000" }}>
                <video src={reelMedia} style={{ width: "100%", maxHeight: 200, display: "block" }} controls />
                <button onClick={() => setReelMedia("")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size5={16} />
                </button>
              </div>
            )}
            <input
              value={reelCaption}
              onChange={(e) => setReelCaption(e.target.value)}
              placeholder="Izoh yozing..."
              style={inputStyle}
            />
            <button
              onClick={submitReel}
              disabled={!reelMedia}
              style={{
                width: "100%", padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14,
                background: reelMedia ? C.pink : C.border,
                color: reelMedia ? "#1a0810" : C.inkDim,
                cursor: reelMedia ? "pointer" : "default",
              }}
            >
              Yuklash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
