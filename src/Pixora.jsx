import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart, MessageCircle, Send, Bookmark, Grid3x3, User, Home, Loader2, X,
  MessagesSquare, ArrowLeft, BadgeCheck, Search, Clapperboard, UserPlus,
  UserCheck, Bell, PlusSquare, Image as ImageIcon, Video as VideoIcon,
} from "lucide-react";

/**
 * SARDOGRAM
 * To'liq mustaqil, serversiz ijtimoiy tarmoq ilovasi.
 * Hech qanday tashqi backend (API_URL) talab qilmaydi — barcha ma'lumot
 * brauzerning localStorage'ida saqlanadi.
 */

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

const VERIFIED_ALLOWED = ["sardor", "davlat", "shuxrat"];
const MIGRATION_KEY = key("migrated_password_v2");

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

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authColor, setAuthColor] = useState(AVATAR_COLORS[0]);
  const [authAvatar, setAuthAvatar] = useState("");
  const [authError, setAuthError] = useState("");

  const [composerOpen, setComposerOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftMedia, setDraftMedia] = useState("");
  const [draftIsVideo, setDraftIsVideo] = useState(false);

  const [reelComposerOpen, setReelComposerOpen] = useState(false);
  const [reelMedia, setReelMedia] = useState("");
  const [reelCaption, setReelCaption] = useState("");

  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});

  const [dmTarget, setDmTarget] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const chatEndRef = useRef(null);

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
    persistDms({ ...dms, [k]: [...thread, { from: me.username, text, ts: Date.now() }] });
    setMessageDraft("");
  };

  if (booting) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={30} color={C.pink} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!me) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0 }}>
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
                  fontWeight: 700, fontSize: 13, background: authMode === m ? C.pink : "transparent",
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
            placeholder="Foydalanuvchi nomi"
            style={inputStyle}
          />

          <input
            type="password"
            value={authPassword}
            onChange={(e) => { setAuthPassword(e.target.value); if (authError) setAuthError(""); }}
            placeholder="Parol"
            style={inputStyle}
          />

          {authError && <div style={{ color: C.pink, fontSize: 12, marginBottom: 10 }}>{authError}</div>}

          <button
            onClick={submitAuth}
            style={{
              width: "100%", padding: 14, borderRadius: 10, border: "none",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              background: C.pink, color: "#1a0810",
            }}
          >
            {authMode === "login" ? "Kirish" : "Akkaunt ochish"}
          </button>
        </div>
      </div>
    );
  }

  const storyUsers = Object.entries(users);
  const otherUsers = Object.keys(users).filter((u) => u !== me.username);
  const filteredUsers = Object.entries(users).filter(([u]) => u.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: FONT }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(13,14,18,0.9)",
        backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`,
        padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0 }}>
          <span style={{ color: C.pink }}>Sardo</span>
          <span style={{ color: C.blue }}>gram</span>
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 76 }}>
        {tab === "feed" && (
          <>
            <div style={{ display: "flex", gap: 14, padding: "14px 16px", overflowX: "auto", borderBottom: `1px solid ${C.border}` }}>
              {storyUsers.map(([name, u]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Avatar name={name} color={u.color} avatar={u.avatar} size={48} />
                  <span style={{ fontSize: 11, color: C.inkDim }}>{name}</span>
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
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "search" && (
          <div style={{ padding: 16 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Akkauntlarni qidirish..."
              style={inputStyle}
            />
            {filteredUsers.map(([username, u]) => (
              <div key={username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={username} color={u.color} avatar={u.avatar} size={42} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}><NameTag name={username} verified={u.verified} /></div>
                  </div>
                </div>
                {username !== me.username && (
                  <button onClick={() => toggleFollow(username)} style={followBtnStyle(following.includes(username))}>
                    {following.includes(username) ? "Obunadasiz" : "Obuna bo'lish"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "reels" && (
          <div style={{ padding: 16 }}>
            <button onClick={() => setReelComposerOpen(true)} style={{ background: C.pink, color: "#1a0810", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, marginBottom: 14, cursor: "pointer" }}>
              + Reel yuklash
            </button>
            {reels.map((reel) => (
              <div key={reel.id} style={{ background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
                <video src={reel.videoUrl} controls style={{ width: "100%", maxHeight: 550, display: "block" }} />
                <div style={{ padding: 12, background: C.card }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{reel.author}</span>
                  {reel.caption && <p style={{ margin: 0, fontSize: 13, color: C.inkDim }}>{reel.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "messages" && (
          <div style={{ padding: 16 }}>
            {!dmTarget ? (
              otherUsers.map((username) => (
                <div key={username} onClick={() => setDmTarget(username)} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={username} size={40} />
                  <span style={{ fontWeight: 700 }}>{username}</span>
                </div>
              ))
            ) : (
              <div>
                <button onClick={() => setDmTarget(null)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", marginBottom: 10 }}>
                  <ArrowLeft size={20} /> Orqaga
                </button>
                <div style={{ height: 300, overflowY: "auto", marginBottom: 10 }}>
                  {(dms[convoKey(me.username, dmTarget)] || []).map((m, idx) => (
                    <div key={idx} style={{ padding: "6px 10px", margin: "4px 0", background: m.from === me.username ? C.pink : C.card, borderRadius: 8 }}>
                      {m.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Xabar..." style={{ ...inputStyle, marginBottom: 0 }} />
                  <button onClick={sendMessage} style={{ background: C.pink, border: "none", borderRadius: 8, padding: "0 14px", cursor: "pointer" }}><Send size={16} /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Avatar name={me.username} color={me.color} avatar={me.avatar} size={70} />
            <h2 style={{ margin: "10px 0 4px" }}>{me.username}</h2>
            <button onClick={logout} style={{ background: C.pink, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>
              Chiqish
            </button>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0", zIndex: 10 }}>
        <IconTab active={tab === "feed"} onClick={() => setTab("feed")} Icon={Home} />
        <IconTab active={tab === "search"} onClick={() => setTab("search")} Icon={Search} />
        <IconTab active={tab === "reels"} onClick={() => setTab("reels")} Icon={Clapperboard} />
        <IconTab active={tab === "messages"} onClick={() => setTab("messages")} Icon={MessagesSquare} />
        <IconTab active={tab === "profile"} onClick={() => setTab("profile")} Icon={User} />
      </div>

      {composerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 400, padding: 20 }}>
            <h3>Yangi post</h3>
            <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Nima gaplar?" style={{ ...inputStyle, height: 80 }} />
            <input type="file" onChange={(e) => handleDraftFile(e, false)} style={{ marginBottom: 12 }} />
            <button onClick={submitPost} style={{ width: "100%", background: C.pink, color: "#fff", border: "none", borderRadius: 8, padding: 10, fontWeight: 700, cursor: "pointer" }}>Ulashish</button>
            <button onClick={() => setComposerOpen(false)} style={{ width: "100%", background: "transparent", color: C.ink, border: "none", marginTop: 8, cursor: "pointer" }}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
