import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Search,
  Clapperboard,
  MessagesSquare,
  User,
  Heart,
  MessageCircle,
  Send,
  PlusSquare,
  Bell,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  X,
} from "lucide-react";

// --- DIZAYN VA RANGLAR (DARK UI 10/10) ---
const C = {
  bg: "#0B0C10",
  card: "#12141C",
  cardAlt: "#1C1F2E",
  border: "#2A2E45",
  pink: "#FF2A85",
  cyan: "#00F2FE",
  ink: "#F0F2F8",
  inkDim: "#8A8FAD",
  danger: "#FF4757",
};

// --- DEFAULT DATA ---
const INITIAL_USERS = {
  sardor: {
    verified: true,
    color: "linear-gradient(135deg, #FF2A85, #FF7300)",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    bio: "Full-Stack Developer | Content Creator 🚀",
  },
  malika: {
    verified: false,
    color: "linear-gradient(135deg, #00F2FE, #4FACFE)",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    bio: "UI/UX Designer ✨ | Photography",
  },
  jasur: {
    verified: true,
    color: "linear-gradient(135deg, #43E97B, #38F9D7)",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    bio: "React & Next.js Enthusiast 💻",
  },
};

const INITIAL_POSTS = [
  {
    id: "p1",
    author: "sardor",
    text: "Yangi loyiham tayyor! 10/10 darajadagi React Ijtimoiy Tarmoq dasturi 🔥 Qanday chiqibdi?",
    media: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    isVideo: false,
    ts: Date.now() - 3600000,
    likes: ["malika", "jasur"],
  },
  {
    id: "p2",
    author: "malika",
    text: "Bugungi dizayn ustida ishlash jarayonidan kichik lavha ✨",
    media: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800",
    isVideo: false,
    ts: Date.now() - 7200000,
    likes: ["sardor"],
  },
];

const INITIAL_REELS = [
  {
    id: "r1",
    author: "jasur",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-leaves-26522-large.mp4",
    caption: "Kuz faslining ajoyib manzarasi 🍂",
    likes: ["sardor", "malika"],
  },
];

// --- YORDAMCHI KOMPONENTLAR ---
const Avatar = ({ name, color, avatar, size = 42 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color || C.pink,
      padding: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <img
      src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
      alt={name}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  </div>
);

const NameTag = ({ name, verified, size = 14 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: size, color: C.ink }}>
    {name}
    {verified && <CheckCircle2 size={size - 1} color={C.cyan} fill={C.cyan} style={{ color: "#000" }} />}
  </span>
);

const timeAgo = (ts) => {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
};

// --- ASOSIY ILOVA ---
export default function SocialApp() {
  // State-lar (Local Storage bilan integratsiya)
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem("soc_users")) || INITIAL_USERS);
  const [me, setMe] = useState(() => JSON.parse(localStorage.getItem("soc_me")) || { username: "sardor", ...INITIAL_USERS.sardor });
  const [posts, setPosts] = useState(() => JSON.parse(localStorage.getItem("soc_posts")) || INITIAL_POSTS);
  const [reels, setReels] = useState(() => JSON.parse(localStorage.getItem("soc_reels")) || INITIAL_REELS);
  const [comments, setComments] = useState(() => JSON.parse(localStorage.getItem("soc_comments")) || {});
  const [dms, setDms] = useState(() => JSON.parse(localStorage.getItem("soc_dms")) || {});
  const [following, setFollowing] = useState(() => JSON.parse(localStorage.getItem("soc_following")) || ["malika", "jasur"]);
  const [notifications, setNotifications] = useState(() => JSON.parse(localStorage.getItem("soc_notifs")) || []);

  // UI State-lar
  const [tab, setTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [reelComposerOpen, setReelComposerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState(null);

  // Formalar state-lari
  const [draftText, setDraftText] = useState("");
  const [draftMedia, setDraftMedia] = useState(null);
  const [draftIsVideo, setDraftIsVideo] = useState(false);
  const [reelVideo, setReelVideo] = useState("");
  const [reelCaption, setReelCaption] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [messageDraft, setMessageDraft] = useState("");

  // Profil tahriri
  const [profileName, setProfileName] = useState(me.username);
  const [profileBio, setProfileBio] = useState(me.bio);
  const [profileAvatar, setProfileAvatar] = useState(me.avatar);

  const chatEndRef = useRef(null);

  // LocalStorage-ga saqlash
  useEffect(() => localStorage.setItem("soc_users", JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem("soc_me", JSON.stringify(me)), [me]);
  useEffect(() => localStorage.setItem("soc_posts", JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem("soc_reels", JSON.stringify(reels)), [reels]);
  useEffect(() => localStorage.setItem("soc_comments", JSON.stringify(comments)), [comments]);
  useEffect(() => localStorage.setItem("soc_dms", JSON.stringify(dms)), [dms]);
  useEffect(() => localStorage.setItem("soc_following", JSON.stringify(following)), [following]);
  useEffect(() => localStorage.setItem("soc_notifs", JSON.stringify(notifications)), [notifications]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dms, dmTarget]);

  // FUNKSIYALAR
  const addNotification = (to, text) => {
    setNotifications((prev) => [
      { id: "n_" + Date.now(), to, from: me.username, text, ts: Date.now() },
      ...prev,
    ]);
  };

  const handleDraftFile = (e, isReel = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (isReel) {
      setReelVideo(url);
    } else {
      setDraftMedia(url);
      setDraftIsVideo(file.type.startsWith("video/"));
    }
  };

  const submitPost = () => {
    if (!draftText && !draftMedia) return;
    const newPost = {
      id: "p_" + Date.now(),
      author: me.username,
      text: draftText,
      media: draftMedia,
      isVideo: draftIsVideo,
      ts: Date.now(),
      likes: [],
    };
    setPosts([newPost, ...posts]);
    setDraftText("");
    setDraftMedia(null);
    setComposerOpen(false);
  };

  const submitReel = () => {
    if (!reelVideo) return;
    const newReel = {
      id: "r_" + Date.now(),
      author: me.username,
      videoUrl: reelVideo,
      caption: reelCaption,
      likes: [],
    };
    setReels([newReel, ...reels]);
    setReelVideo("");
    setReelCaption("");
    setReelComposerOpen(false);
  };

  const toggleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const liked = p.likes.includes(me.username);
          if (!liked && p.author !== me.username) {
            addNotification(p.author, "postimga layk bosdi");
          }
          return {
            ...p,
            likes: liked ? p.likes.filter((u) => u !== me.username) : [...p.likes, me.username],
          };
        }
        return p;
      })
    );
  };

  const toggleReelLike = (reelId) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const liked = r.likes.includes(me.username);
          return {
            ...r,
            likes: liked ? r.likes.filter((u) => u !== me.username) : [...r.likes, me.username],
          };
        }
        return r;
      })
    );
  };

  const submitComment = (postId) => {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    const newComment = { id: "c_" + Date.now(), author: me.username, text, ts: Date.now() };
    setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
  };

  const deletePost = (id) => setPosts(posts.filter((p) => p.id !== id));

  const toggleFollow = (username) => {
    if (following.includes(username)) {
      setFollowing(following.filter((u) => u !== username));
    } else {
      setFollowing([...following, username]);
      addNotification(username, "sizga obuna bo‘ldi");
    }
  };

  const convoKey = (u1, u2) => [u1, u2].sort().join("__");

  const sendMessage = () => {
    if (!messageDraft.trim() || !dmTarget) return;
    const key = convoKey(me.username, dmTarget);
    const msg = { id: "m_" + Date.now(), from: me.username, text: messageDraft, ts: Date.now() };
    setDms((prev) => ({ ...prev, [key]: [...(prev[key] || []), msg] }));
    setMessageDraft("");
  };

  const saveProfile = () => {
    const updated = { ...me, username: profileName, bio: profileBio, avatar: profileAvatar };
    setMe(updated);
    setUsers((prev) => ({ ...prev, [profileName]: updated }));
    setProfileEditOpen(false);
  };

  const filteredUsers = Object.entries(users).filter(([uname]) =>
    uname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: C.cardAlt,
    color: C.ink,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 10,
  };

  const otherUsers = Object.keys(users).filter((u) => u !== me.username);
  const myNotifications = notifications.filter((n) => n.to === me.username);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "sans-serif", paddingBottom: 70 }}>
      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(11, 12, 16, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, background: `linear-gradient(45deg, ${C.pink}, ${C.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Sardorgram 🌟
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setComposerOpen(true)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer" }}>
            <PlusSquare size={24} />
          </button>
          <button onClick={() => setNotificationsOpen(true)} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", position: "relative" }}>
            <Bell size={24} />
            {myNotifications.length > 0 && (
              <span style={{ position: "absolute", top: -2, right: -2, background: C.pink, width: 8, height: 8, borderRadius: "50%" }} />
            )}
          </button>
        </div>
      </div>

      {/* FEED TAB */}
      {tab === "feed" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: 12 }}>
          {/* STORIES */}
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setComposerOpen(true)}>
              <Avatar name={me.username} color={me.color} avatar={me.avatar} size={56} />
              <div style={{ fontSize: 11, marginTop: 4, color: C.inkDim }}>Siznikiga+</div>
            </div>
            {Object.entries(users).map(([uname, u]) => (
              <div key={uname} style={{ textAlign: "center", cursor: "pointer" }}>
                <Avatar name={uname} color={u.color} avatar={u.avatar} size={56} />
                <div style={{ fontSize: 11, marginTop: 4, color: C.inkDim }}>{uname}</div>
              </div>
            ))}
          </div>

          {/* POSTS LIST */}
          {posts.map((post) => {
            const authorData = users[post.author] || {};
            const isMine = post.author === me.username;
            const liked = post.likes?.includes(me.username);
            const postComments = comments[post.id] || [];

            return (
              <div key={post.id} style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 16, border: `1px solid ${C.border}` }}>
                {/* POST HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={post.author} color={authorData.color} avatar={authorData.avatar} size={38} />
                    <div>
                      <NameTag name={post.author} verified={authorData.verified} />
                      <div style={{ fontSize: 11, color: C.inkDim }}>{timeAgo(post.ts)}</div>
                    </div>
                  </div>
                  {isMine && (
                    <button onClick={() => deletePost(post.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", padding: 5 }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* POST CONTENT */}
                {post.text && <p style={{ margin: "0 0 10px 0", fontSize: 14, lineHeight: 1.4 }}>{post.text}</p>}
                {post.media && (
                  <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 10, background: C.cardAlt }}>
                    {post.isVideo ? (
                      <video src={post.media} controls style={{ width: "100%", display: "block" }} />
                    ) : (
                      <img src={post.media} alt="" style={{ width: "100%", display: "block" }} />
                    )}
                  </div>
                )}

                {/* POST ACTIONS */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                  <button onClick={() => toggleLike(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: liked ? C.pink : C.inkDim, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                    <Heart size={20} fill={liked ? C.pink : "none"} />
                    <span style={{ fontSize: 13 }}>{post.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkDim, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                    <MessageCircle size={20} />
                    <span style={{ fontSize: 13 }}>{postComments.length}</span>
                  </button>
                </div>

                {/* COMMENTS SECTION */}
                {openComments[post.id] && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    {postComments.map((c) => (
                      <div key={c.id} style={{ fontSize: 13, marginBottom: 6 }}>
                        <strong>{c.author}: </strong>
                        <span>{c.text}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input
                        value={commentDrafts[post.id] || ""}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)}
                        placeholder="Izoh yozing..."
                        style={{ ...inputStyle, marginBottom: 0 }}
                      />
                      <button onClick={() => submitComment(post.id)} style={{ background: C.pink, border: "none", borderRadius: 8, padding: "0 12px", color: "#1a0810", fontWeight: 700, cursor: "pointer" }}>
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SEARCH TAB */}
      {tab === "search" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={18} color={C.inkDim} style={{ position: "absolute", left: 12, top: 13 }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Foydalanuvchilarni qidirish..." style={{ ...inputStyle, paddingLeft: 38, marginBottom: 0 }} />
          </div>
          {filteredUsers.map(([username, u]) => (
            <div key={username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={username} color={u.color} avatar={u.avatar} size={40} />
                <div>
                  <NameTag name={username} verified={u.verified} />
                  <div style={{ fontSize: 12, color: C.inkDim }}>{u.bio || "Bio yo‘q"}</div>
                </div>
              </div>
              {username !== me.username && (
                <button onClick={() => toggleFollow(username)} style={{ background: following.includes(username) ? C.cardAlt : C.pink, color: following.includes(username) ? C.ink : "#1a0810", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {following.includes(username) ? "Obunadasiz" : "Obuna bo‘lish"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REELS TAB */}
      {tab === "reels" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
          <button onClick={() => setReelComposerOpen(true)} style={{ width: "100%", padding: 12, background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, color: C.ink, fontWeight: 700, marginBottom: 16, cursor: "pointer" }}>
            + Yangi Reel joylash
          </button>
          {reels.map((r) => (
            <div key={r.id} style={{ background: C.card, borderRadius: 12, overflow: "hidden", marginBottom: 16, border: `1px solid ${C.border}` }}>
              <video src={r.videoUrl} controls style={{ width: "100%", maxHeight: 400 }} />
              <div style={{ padding: 12 }}>
                <strong>{r.author}</strong>
                <p style={{ margin: "4px 0", fontSize: 13 }}>{r.caption}</p>
                <button onClick={() => toggleReelLike(r.id)} style={{ background: "none", border: "none", color: r.likes?.includes(me.username) ? C.pink : C.inkDim, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <Heart size={18} fill={r.likes?.includes(me.username) ? C.pink : "none"} />
                  {r.likes?.length || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MESSAGES TAB */}
      {tab === "dms" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
          {!dmTarget ? (
            otherUsers.map((u) => (
              <div key={u} onClick={() => setDmTarget(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: C.card, borderRadius: 10, marginBottom: 8, cursor: "pointer" }}>
                <Avatar name={u} color={users[u]?.color} avatar={users[u]?.avatar} />
                <span style={{ fontWeight: 700 }}>{u}</span>
              </div>
            ))
          ) : (
            <div>
              <button onClick={() => setDmTarget(null)} style={{ background: "none", border: "none", color: C.pink, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                <ArrowLeft size={16} /> Orqaga
              </button>
              <h3 style={{ margin: "0 0 12px 0" }}>{dmTarget} bilan yozishmalar</h3>
              <div style={{ minHeight: 200, maxHeight: 350, overflowY: "auto", padding: 10, background: C.card, borderRadius: 10, marginBottom: 12, border: `1px solid ${C.border}` }}>
                {(dms[convoKey(me.username, dmTarget)] || []).map((m) => (
                  <div key={m.id} style={{ textAlign: m.from === me.username ? "right" : "left", marginBottom: 8 }}>
                    <span style={{ display: "inline-block", padding: "6px 12px", borderRadius: 10, background: m.from === me.username ? C.pink : C.cardAlt, color: m.from === me.username ? "#1a0810" : C.ink, fontSize: 13 }}>
                      {m.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Xabar yozing..." style={{ ...inputStyle, marginBottom: 0 }} />
                <button onClick={sendMessage} style={{ background: C.pink, border: "none", borderRadius: 8, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === "profile" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <Avatar name={me.username} color={me.color} avatar={me.avatar} size={64} />
            <div>
              <NameTag name={me.username} verified={me.verified} size={18} />
              <p style={{ margin: "4px 0", color: C.inkDim, fontSize: 13 }}>{me.bio || "Bio yo‘q"}</p>
              <button onClick={() => setProfileEditOpen(true)} style={{ background: C.cardAlt, color: C.ink, border: `1px solid ${C.border}`, padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", marginTop: 4 }}>
                Tahrirlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(13,14,18,.95)", backdropFilter: "blur(14px)", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0", zIndex: 20 }}>
        <button onClick={() => setTab("feed")} style={{ background: "none", border: "none", color: tab === "feed" ? C.pink : C.inkDim, cursor: "pointer" }}><Home size={22} /></button>
        <button onClick={() => setTab("search")} style={{ background: "none", border: "none", color: tab === "search" ? C.pink : C.inkDim, cursor: "pointer" }}><Search size={22} /></button>
        <button onClick={() => setTab("reels")} style={{ background: "none", border: "none", color: tab === "reels" ? C.pink : C.inkDim, cursor: "pointer" }}><Clapperboard size={22} /></button>
        <button onClick={() => setTab("dms")} style={{ background: "none", border: "none", color: tab === "dms" ? C.pink : C.inkDim, cursor: "pointer" }}><MessagesSquare size={22} /></button>
        <button onClick={() => setTab("profile")} style={{ background: "none", border: "none", color: tab === "profile" ? C.pink : C.inkDim, cursor: "pointer" }}><User size={22} /></button>
      </div>

      {/* MODALLAR */}
      {composerOpen && (
        <Modal onClose={() => setComposerOpen(false)}>
          <h3>Yangi post</h3>
          <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Nimalar haqida o‘ylayapsiz?" style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
          <input type="file" onChange={(e) => handleDraftFile(e, false)} accept="image/*,video/*" style={{ marginBottom: 12, color: C.inkDim }} />
          <button onClick={submitPost} style={{ width: "100%", padding: 12, background: C.pink, border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}>Ulashish</button>
        </Modal>
      )}

      {reelComposerOpen && (
        <Modal onClose={() => setReelComposerOpen(false)}>
          <h3>Yangi Reel</h3>
          <input type="file" onChange={(e) => handleDraftFile(e, true)} accept="video/*" style={{ marginBottom: 12, color: C.inkDim }} />
          <input value={reelCaption} onChange={(e) => setReelCaption(e.target.value)} placeholder="Izoh..." style={inputStyle} />
          <button onClick={submitReel} style={{ width: "100%", padding: 12, background: C.pink, border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}>Yuklash</button>
        </Modal>
      )}

      {notificationsOpen && (
        <Modal onClose={() => setNotificationsOpen(false)}>
          <h3>Bildirishnomalar</h3>
          {myNotifications.length === 0 ? (
            <p style={{ color: C.inkDim }}>Bildirishnomalar yo‘q</p>
          ) : (
            myNotifications.map((n) => (
              <div key={n.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <strong>{n.from}</strong> {n.text}
              </div>
            ))
          )}
        </Modal>
      )}

      {profileEditOpen && (
        <Modal onClose={() => setProfileEditOpen(false)}>
          <h3>Profilni tahrirlash</h3>
          <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Username" style={inputStyle} />
          <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="Bio" style={{ ...inputStyle, minHeight: 60 }} />
          <input value={profileAvatar} onChange={(e) => setProfileAvatar(e.target.value)} placeholder="Avatar URL" style={inputStyle} />
          <button onClick={saveProfile} style={{ width: "100%", padding: 12, background: C.pink, border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}>Saqlash</button>
        </Modal>
      )}
    </div>
  );
}

// MODAL OYNA KOMPONENTI
const Modal = ({ children, onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, width: "100%", maxWidth: 400, padding: 20, position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: C.inkDim, cursor: "pointer" }}>
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);
