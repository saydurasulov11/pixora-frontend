import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Grid3x3,
  User,
  Home,
  Loader2,
  X,
  MessagesSquare,
  ArrowLeft,
  BadgeCheck,
  Search,
  Clapperboard,
  UserPlus,
  UserCheck,
  Bell,
  PlusSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Settings,
  Edit3,
} from "lucide-react";

/*
 * SARDOGRAM
 * Frontend-only social network.
 * Data: localStorage
 * Session: sessionStorage
 */

const C = {
  bg: "#0d0e12",
  card: "#17181d",
  cardAlt: "#1e2027",
  border: "#292b35",
  pink: "#ff3d6e",
  blue: "#3ddbff",
  green: "#4dd48a",
  ink: "#f5f4f2",
  inkDim: "#8f8d99",
  danger: "#ff526f",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const AVATAR_COLORS = [
  "#ff3d6e",
  "#3ddbff",
  "#ffb84d",
  "#8b6bff",
  "#4dd48a",
  "#ff7a5c",
];

const STORAGE_PREFIX = "sardogram_";
const MIGRATION_KEY = `${STORAGE_PREFIX}migration_v3`;

const VERIFIED_ALLOWED = ["sardor", "davlat", "shuxrat"];

const key = (name) => `${STORAGE_PREFIX}${name}`;

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

function readLS(name, fallback) {
  try {
    const raw = localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch (err) {
    console.error("localStorage error:", err);
  }
}

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);

  if (seconds < 60) return "hozir";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiqa oldin`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} soat oldin`;

  return `${Math.floor(seconds / 86400)} kun oldin`;
}

function convoKey(a, b) {
  return [a, b].sort().join("::");
}

function findUserKey(usersObj, name) {
  return Object.keys(usersObj).find(
    (u) => u.toLowerCase() === name.toLowerCase()
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function NameTag({ name, verified, size = 14 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {name}

      {verified && (
        <BadgeCheck
          size={size}
          color={C.blue}
          fill="#0d2b33"
          style={{ flexShrink: 0 }}
        />
      )}
    </span>
  );
}

function Avatar({ name, color, avatar, size = 38 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: color || C.pink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontWeight: 800,
        color: "#0d0d0f",
        fontSize: size * 0.42,
        fontFamily: FONT,
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        (name || "?")[0]?.toUpperCase()
      )}
    </div>
  );
}

function IconTab({ active, onClick, Icon, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 8,
        color: active ? C.pink : C.inkDim,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Icon
        size={22}
        fill={active ? C.pink : "none"}
        strokeWidth={active ? 2.4 : 2}
      />

      {badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 1,
            right: 0,
            minWidth: 15,
            height: 15,
            padding: "0 4px",
            borderRadius: 99,
            background: C.pink,
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "50px 20px",
        color: C.inkDim,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "90vh",
          overflowY: "auto",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 20,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: C.cardAlt,
            border: "none",
            borderRadius: 8,
            color: C.inkDim,
            cursor: "pointer",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={18} />
        </button>

        {children}
      </div>
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

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileColor, setProfileColor] = useState(C.pink);

  useEffect(() => {
    const migrated = localStorage.getItem(MIGRATION_KEY);

    if (!migrated) {
      localStorage.setItem(MIGRATION_KEY, "1");
    }

    setUsers(readLS("users", {}));
    setPosts(readLS("posts", []));
    setReels(readLS("reels", []));
    setFollowing(readLS("following", []));
    setNotifications(readLS("notifs", []));
    setDms(readLS("dms", {}));

    const savedMe = sessionStorage.getItem("sardogram_me");

    if (savedMe) {
      try {
        setMe(JSON.parse(savedMe));
      } catch {
        sessionStorage.removeItem("sardogram_me");
      }
    }

    setBooting(false);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [dms, dmTarget]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const persistUsers = (next) => {
    setUsers(next);
    writeLS("users", next);
  };

  const persistPosts = (next) => {
    setPosts(next);
    writeLS("posts", next);
  };

  const persistReels = (next) => {
    setReels(next);
    writeLS("reels", next);
  };

  const persistFollowing = (next) => {
    setFollowing(next);
    writeLS("following", next);
  };

  const persistNotifs = (next) => {
    setNotifications(next);
    writeLS("notifs", next);
  };

  const persistDms = (next) => {
    setDms(next);
    writeLS("dms", next);
  };

  const addNotification = (toUser, fromUser, text) => {
    if (!toUser || !fromUser || toUser === fromUser) return;

    const current = readLS("notifs", []);

    const item = {
      id: `n_${Date.now()}_${Math.random()}`,
      to: toUser,
      from: fromUser,
      text,
      ts: Date.now(),
      read: false,
    };

    const next = [item, ...current];

    writeLS("notifs", next);
    setNotifications(next);
  };

  const submitAuth = () => {
    const name = authName.trim();
    const password = authPassword;

    setAuthError("");

    if (!name) {
      setAuthError("Foydalanuvchi nomini kiriting.");
      return;
    }

    if (name.length < 3) {
      setAuthError("Username kamida 3 ta belgidan iborat bo‘lsin.");
      return;
    }

    if (!password) {
      setAuthError("Parolni kiriting.");
      return;
    }

    if (authMode === "register" && password.length < 6) {
      setAuthError("Parol kamida 6 ta belgidan iborat bo‘lsin.");
      return;
    }

    const latestUsers = readLS("users", {});

    if (authMode === "register") {
      const taken = findUserKey(latestUsers, name);

      if (taken) {
        setAuthError(`"${name}" nomi band.`);
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

      const nextUsers = {
        ...latestUsers,
        [name]: userRecord,
      };

      persistUsers(nextUsers);

      const profile = {
        username: name,
        ...userRecord,
      };

      setMe(profile);
      sessionStorage.setItem(
        "sardogram_me",
        JSON.stringify(profile)
      );
    } else {
      const existingKey = findUserKey(latestUsers, name);
      const existing = existingKey
        ? latestUsers[existingKey]
        : null;

      if (!existing) {
        setAuthError(
          `"${name}" nomli akkaunt topilmadi.`
        );
        return;
      }

      if (existing.password !== password) {
        setAuthError("Parol noto‘g‘ri.");
        return;
      }

      const profile = {
        username: existingKey,
        ...existing,
      };

      setUsers(latestUsers);
      setMe(profile);

      sessionStorage.setItem(
        "sardogram_me",
        JSON.stringify(profile)
      );
    }

    setAuthPassword("");
  };

  const logout = () => {
    setMe(null);
    sessionStorage.removeItem("sardogram_me");
    setTab("feed");
  };

  const handleDraftFile = async (e, isVideo) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert("Demo versiyada fayl 12 MB dan katta bo‘lmasin.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);

      setDraftMedia(dataUrl);
      setDraftIsVideo(isVideo);
    } catch {
      alert("Faylni o‘qishda xatolik.");
    }
  };

  const handleReelFile = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("Demo versiyada reel 20 MB dan katta bo‘lmasin.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setReelMedia(dataUrl);
    } catch {
      alert("Videoni o‘qishda xatolik.");
    }
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setDraftText("");
    setDraftMedia("");
    setDraftIsVideo(false);
  };

  const submitPost = () => {
    if ((!draftText.trim() && !draftMedia) || !me) {
      return;
    }

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

    closeComposer();
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

    setReelMedia("");
    setReelCaption("");
    setReelComposerOpen(false);
  };

  const toggleLike = (id) => {
    if (!me) return;

    const currentPosts = readLS("posts", []);

    const target = currentPosts.find((p) => p.id === id);

    if (!target) return;

    const has = target.likes.includes(me.username);

    const next = currentPosts.map((p) => {
      if (p.id !== id) return p;

      return {
        ...p,
        likes: has
          ? p.likes.filter((u) => u !== me.username)
          : [...p.likes, me.username],
      };
    });

    persistPosts(next);

    if (!has) {
      addNotification(
        target.author,
        me.username,
        "postingizni yoqtirdi ❤️"
      );
    }
  };

  const toggleReelLike = (id) => {
    if (!me) return;

    const currentReels = readLS("reels", []);
    const target = currentReels.find((r) => r.id === id);

    if (!target) return;

    const has = target.likes.includes(me.username);

    const next = currentReels.map((r) => {
      if (r.id !== id) return r;

      return {
        ...r,
        likes: has
          ? r.likes.filter((u) => u !== me.username)
          : [...r.likes, me.username],
      };
    });

    persistReels(next);

    if (!has) {
      addNotification(
        target.author,
        me.username,
        "reelingizni yoqtirdi ❤️"
      );
    }
  };

  const submitComment = (id) => {
    const text = (commentDrafts[id] || "").trim();

    if (!text || !me) return;

    const currentPosts = readLS("posts", []);
    const target = currentPosts.find((p) => p.id === id);

    if (!target) return;

    const comment = {
      id: `c_${Date.now()}_${Math.random()}`,
      author: me.username,
      text,
      ts: Date.now(),
    };

    const next = currentPosts.map((p) => {
      if (p.id !== id) return p;

      return {
        ...p,
        comments: [...(p.comments || []), comment],
      };
    });

    persistPosts(next);

    setCommentDrafts((prev) => ({
      ...prev,
      [id]: "",
    }));

    setOpenComments((prev) => ({
      ...prev,
      [id]: true,
    }));

    addNotification(
      target.author,
      me.username,
      `izoh qoldirdi: "${text}"`
    );
  };

  const deletePost = (id) => {
    const post = posts.find((p) => p.id === id);

    if (!post || post.author !== me.username) return;

    if (!window.confirm("Bu postni o‘chirmoqchimisiz?")) {
      return;
    }

    persistPosts(posts.filter((p) => p.id !== id));
  };

  const toggleFollow = (username) => {
    if (!me || username === me.username) return;

    const isFollowing = following.includes(username);

    if (isFollowing) {
      persistFollowing(
        following.filter((u) => u !== username)
      );
    } else {
      persistFollowing([...following, username]);

      addNotification(
        username,
        me.username,
        "sizga obuna bo‘ldi 👤"
      );
    }
  };

  const sendMessage = () => {
    const text = messageDraft.trim();

    if (!text || !me || !dmTarget) return;

    const currentDms = readLS("dms", {});
    const k = convoKey(me.username, dmTarget);
    const thread = currentDms[k] || [];

    const message = {
      id: `m_${Date.now()}_${Math.random()}`,
      from: me.username,
      text,
      ts: Date.now(),
    };

    const next = {
      ...currentDms,
      [k]: [...thread, message],
    };

    persistDms(next);
    setMessageDraft("");
  };

  const openProfileEditor = () => {
    setProfileName(me.username);
    setProfileBio(me.bio || "");
    setProfileAvatar(me.avatar || "");
    setProfileColor(me.color || C.pink);
    setProfileEditOpen(true);
  };

  const saveProfile = () => {
    if (!profileName.trim()) return;

    const oldUsername = me.username;
    const newUsername = profileName.trim();

    if (
      newUsername !== oldUsername &&
      findUserKey(users, newUsername)
    ) {
      alert("Bu username band.");
      return;
    }

    const latestUsers = readLS("users", {});

    const oldRecord = latestUsers[oldUsername] || {};

    const updatedRecord = {
      ...oldRecord,
      bio: profileBio.trim(),
      avatar: profileAvatar.trim(),
      color: profileColor,
      password: oldRecord.password,
      verified: VERIFIED_ALLOWED.includes(
        newUsername.toLowerCase()
      ),
    };

    const nextUsers = {
      ...latestUsers,
    };

    delete nextUsers[oldUsername];
    nextUsers[newUsername] = updatedRecord;

    persistUsers(nextUsers);

    let nextPosts = readLS("posts", []);

    nextPosts = nextPosts.map((p) =>
      p.author === oldUsername
        ? { ...p, author: newUsername }
        : p
    );

    persistPosts(nextPosts);

    let nextReels = readLS("reels", []);

    nextReels = nextReels.map((r) =>
      r.author === oldUsername
        ? { ...r, author: newUsername }
        : r
    );

    persistReels(nextReels);

    const profile = {
      username: newUsername,
      ...updatedRecord,
    };

    setMe(profile);

    sessionStorage.setItem(
      "sardogram_me",
      JSON.stringify(profile)
    );

    setProfileEditOpen(false);
  };

  const markNotificationsRead = () => {
    const current = readLS("notifs", []);

    const next = current.map((n) =>
      n.to === me.username
        ? { ...n, read: true }
        : n
    );

    persistNotifs(next);
  };

  const clearNotifications = () => {
    const current = readLS("notifs", []);

    const next = current.filter(
      (n) => n.to !== me.username
    );

    persistNotifs(next);
  };

  const storyUsers = Object.entries(users);

  const otherUsers = Object.keys(users).filter(
    (u) => u !== me.username
  );

  const filteredUsers = Object.entries(users).filter(
    ([username]) =>
      username
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const myNotifications = notifications.filter(
    (n) => n.to === me.username
  );

  if (booting) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={30}
          color={C.pink}
          style={{
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!me) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.ink,
          fontFamily: FONT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 380,
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <h1
              style={{
                fontSize: 36,
                fontWeight: 900,
                margin: 0,
                letterSpacing: -1.5,
              }}
            >
              <span style={{ color: C.pink }}>
                Sardo
              </span>
              <span style={{ color: C.blue }}>
                gram
              </span>
            </h1>

            <p
              style={{
                color: C.inkDim,
                fontSize: 14,
                marginTop: 7,
              }}
            >
              Rasm, video va xabarlaringizni ulashing.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              background: C.card,
              borderRadius: 10,
              padding: 3,
              marginBottom: 18,
              border: `1px solid ${C.border}`,
            }}
          >
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setAuthMode(m);
                  setAuthError("");
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  background:
                    authMode === m
                      ? C.pink
                      : "transparent",
                  color:
                    authMode === m
                      ? "#1a0810"
                      : C.inkDim,
                }}
              >
                {m === "login"
                  ? "Kirish"
                  : "Ro‘yxatdan o‘tish"}
              </button>
            ))}
          </div>

          {authMode === "register" && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 14,
                  justifyContent: "center",
                }}
              >
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAuthColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border:
                        authColor === c
                          ? `2px solid ${C.ink}`
                          : "2px solid transparent",
                    }}
                  />
                ))}
              </div>

              <input
                value={authAvatar}
                onChange={(e) =>
                  setAuthAvatar(e.target.value)
                }
                placeholder="Avatar rasm URL (ixtiyoriy)"
                style={inputStyle}
              />
            </>
          )}

          <input
            value={authName}
            onChange={(e) => {
              setAuthName(e.target.value);

              if (authError) {
                setAuthError("");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAuth();
            }}
            placeholder="Foydalanuvchi nomi"
            style={inputStyle}
          />

          <input
            type="password"
            value={authPassword}
            onChange={(e) => {
              setAuthPassword(e.target.value);

              if (authError) {
                setAuthError("");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAuth();
            }}
            placeholder="Parol"
            style={inputStyle}
          />

          {authError && (
            <div
              style={{
                color: C.pink,
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              {authError}
            </div>
          )}

          <button
            onClick={submitAuth}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 10,
              border: "none",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              background: C.pink,
              color: "#1a0810",
            }}
          >
            {authMode === "login"
              ? "Kirish"
              : "Akkaunt ochish"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.ink,
        fontFamily: FONT,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(13,14,18,.9)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            fontSize: 21,
            fontWeight: 900,
            margin: 0,
            letterSpacing: -0.8,
          }}
        >
          <span style={{ color: C.pink }}>
            Sardo
          </span>
          <span style={{ color: C.blue }}>
            gram
          </span>
        </h1>

        <div
          style={{
            display: "flex",
            gap: 7,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              setNotificationsOpen(true);
              markNotificationsRead();
            }}
            style={{
              position: "relative",
              width: 38,
              height: 38,
              borderRadius: 9,
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.ink,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={18} />

            {unreadNotifications > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  padding: "0 3px",
                  borderRadius: 99,
                  background: C.pink,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadNotifications > 9
                  ? "9+"
                  : unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={() => setComposerOpen(true)}
            style={{
              background: C.pink,
              border: "none",
              borderRadius: 8,
              padding: "8px 13px",
              color: "#1a0810",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <PlusSquare size={15} />
            Post
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 500,
          margin: "0 auto",
          paddingBottom: 78,
        }}
      >
        {/* FEED */}
        {tab === "feed" && (
          <>
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: "14px 16px",
                overflowX: "auto",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {storyUsers.map(([name, u]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      padding: 2,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg,#ff3d6e,#8b6bff,#3ddbff)",
                    }}
                  >
                    <div
                      style={{
                        padding: 2,
                        background: C.bg,
                        borderRadius: "50%",
                      }}
                    >
                      <Avatar
                        name={name}
                        color={u.color}
                        avatar={u.avatar}
                        size={47}
                      />
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      color:
                        name === me.username
                          ? C.ink
                          : C.inkDim,
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {posts.length === 0 ? (
              <EmptyState text="Hali postlar yo‘q. Birinchi bo‘lib ulashing!" />
            ) : (
              posts.map((post) => {
                const u = users[post.author] || {};
                const liked = (post.likes || []).includes(
                  me.username
                );
                const comments = post.comments || [];
                const isMine =
                  post.author === me.username;

                return (
                  <div
                    key={post.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      padding: "15px 16px",
                    }}
                  >
                    {/* AUTHOR */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 11,
                      }}
                    >
                      <Avatar
                        name={post.author}
                        color={u.color}
                        avatar={u.avatar}
                        size={39}
                      />

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          <NameTag
                            name={post.author}
                            verified={u.verified}
                          />
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: C.inkDim,
                            marginTop: 2,
                          }}
                        >
                          {timeAgo(post.ts)}
                        </div>
                      </div>

                      {isMine && (
                        <button
                          onClick={() =>
                            deletePost(post.id)
                          }
                          title="Postni o‘chirish"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: C.inkDim,
                            cursor: "pointer",
                            padding: 5,
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>

                    {/* MEDIA */}
                    {post.media && (
                      <div
                        style={{
                          borderRadius: 13,
                          overflow: "hidden",
                          marginBottom: 10,
                          background: "#000",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {post.isVideo ? (
                          <video
                            src={post.media}
                            controls
                            playsInline
                            style={{
                              width: "100%",
                              maxHeight: 500,
                              display: "block",
                            }}
                          />
                        ) : (
                          <img
                            src={post.media}
                            alt=""
                            style={{
                              width: "100%",
                              maxHeight: 500,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* TEXT */}
                    {post.text && (
                      <p
                        style={{
                          margin: "0 0 11px",
                          fontSize: 14,
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {post.text}
                      </p>
                    )}

                    {/* ACTIONS */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 18,
                      }}
                    >
                      <button
                        onClick={() =>
                          toggleLike(post.id)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: liked
                            ? C.pink
                            : C.inkDim,
                          fontWeight: 700,
                          fontSize: 13,
                          padding: 0,
                        }}
                      >
                        <Heart
                          size={19}
                          fill={
                            liked ? C.pink : "none"
                          }
                        />
                        {post.likes?.length || 0}
                      </button>

                      <button
                        onClick={() =>
                          setOpenComments((prev) => ({
                            ...prev,
                            [post.id]:
                              !prev[post.id],
                          }))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: C.inkDim,
                          fontWeight: 700,
                          fontSize: 13,
                          padding: 0,
                        }}
                      >
                        <MessageCircle size={19} />
                        {comments.length}
                      </button>
                    </div>

                    {/* COMMENTS */}
                    {openComments[post.id] && (
                      <div
                        style={{
                          marginTop: 13,
                          paddingTop: 12,
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        {comments.length === 0 ? (
                          <div
                            style={{
                              color: C.inkDim,
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            Hali izohlar yo‘q.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              marginBottom: 12,
                            }}
                          >
                            {comments.map((comment) => {
                              const cu =
                                users[
                                  comment.author
                                ] || {};

                              return (
                                <div
                                  key={
                                    comment.id ||
                                    `${comment.author}-${comment.ts}`
                                  }
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                  }}
                                >
                                  <Avatar
                                    name={
                                      comment.author
                                    }
                                    color={cu.color}
                                    avatar={cu.avatar}
                                    size={28}
                                  />

                                  <div
                                    style={{
                                      background:
                                        C.cardAlt,
                                      borderRadius: 10,
                                      padding:
                                        "7px 10px",
                                      flex: 1,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        marginBottom: 2,
                                      }}
                                    >
                                      <NameTag
                                        name={
                                          comment.author
                                        }
                                        verified={
                                          cu.verified
                                        }
                                        size={11}
                                      />
                                    </div>

                                    <div
                                      style={{
                                        fontSize: 13,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {comment.text}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: 7,
                          }}
                        >
                          <input
                            value={
                              commentDrafts[
                                post.id
                              ] || ""
                            }
                            onChange={(e) =>
                              setCommentDrafts(
                                (prev) => ({
                                  ...prev,
                                  [post.id]:
                                    e.target.value,
                                })
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter"
                              ) {
                                submitComment(
                                  post.id
                                );
                              }
                            }}
                            placeholder="Izoh yozing..."
                            style={{
                              ...inputStyle,
                              marginBottom: 0,
                              flex: 1,
                            }}
                          />

                          <button
                            onClick={() =>
                              submitComment(
                                post.id
                              )
                            }
                            style={{
                              width: 43,
                              border: "none",
                              borderRadius: 9,
                              background: C.pink,
                              color: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent:
                                "center",
                            }}
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* SEARCH */}
        {tab === "search" && (
          <div style={{ padding: 16 }}>
            <div
              style={{
                position: "relative",
                marginBottom: 14,
              }}
            >
              <Search
                size={17}
                color={C.inkDim}
                style={{
                  position: "absolute",
                  left: 13,
                  top: 13,
                }}
              />

              <input
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Akkauntlarni qidirish..."
                style={{
                  ...inputStyle,
                  paddingLeft: 40,
                  marginBottom: 0,
                }}
              />
            </div>

            {filteredUsers.length === 0 ? (
              <EmptyState text="Foydalanuvchi topilmadi." />
            ) : (
              filteredUsers.map(([username, u]) => {
                const isFollowing =
                  following.includes(username);

                return (
                  <div
                    key={username}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 0",
                      borderBottom: `1px solid ${C.border}`,
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <Avatar
                        name={username}
                        color={u.color}
                        avatar={u.avatar}
                        size={43}
                      />

                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          <NameTag
                            name={username}
                            verified={u.verified}
                          />
                        </div>

                        {u.bio && (
                          <div
                            style={{
                              fontSize: 11,
                              color: C.inkDim,
                              marginTop: 3,
                            }}
                          >
                            {u.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    {username !== me.username && (
                      <button
                        onClick={() =>
                          toggleFollow(username)
                        }
                        style={{
                          background: isFollowing
                            ? "transparent"
                            : C.pink,
                          color: isFollowing
                            ? C.ink
                            : "#1a0810",
                          border: isFollowing
                            ? `1px solid ${C.border}`
                            : "none",
                          borderRadius: 8,
                          padding: "7px 10px",
                          fontWeight: 800,
                          fontSize: 11,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck size={14} />
                            Obunadasiz
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Obuna
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* REELS */}
        {tab === "reels" && (
          <div style={{ padding: 16 }}>
            <button
              onClick={() =>
                setReelComposerOpen(true)
              }
              style={{
                background: C.pink,
                color: "#1a0810",
                border: "none",
                borderRadius: 9,
                padding: "9px 13px",
                fontWeight: 800,
                marginBottom: 15,
                cursor: "pointer",
              }}
            >
              + Reel yuklash
            </button>

            {reels.length === 0 ? (
              <EmptyState text="Hali reel yo‘q." />
            ) : (
              reels.map((reel) => {
                const u = users[reel.author] || {};
                const liked =
                  reel.likes?.includes(
                    me.username
                  );

                return (
                  <div
                    key={reel.id}
                    style={{
                      background: "#000",
                      borderRadius: 14,
                      overflow: "hidden",
                      marginBottom: 18,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <video
                      src={reel.videoUrl}
                      controls
                      playsInline
                      style={{
                        width: "100%",
                        maxHeight: 580,
                        display: "block",
                      }}
                    />

                    <div
                      style={{
                        padding: 12,
                        background: C.card,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom:
                            reel.caption ? 7 : 0,
                        }}
                      >
                        <Avatar
                          name={reel.author}
                          color={u.color}
                          avatar={u.avatar}
                          size={30}
                        />

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          <NameTag
                            name={reel.author}
                            verified={u.verified}
                            size={12}
                          />
                        </span>

                        <span
                          style={{
                            marginLeft: "auto",
                            color: C.inkDim,
                            fontSize: 10,
                          }}
                        >
                          {timeAgo(reel.ts)}
                        </span>
                      </div>

                      {reel.caption && (
                        <p
                          style={{
                            margin: "0 0 9px",
                            fontSize: 13,
                            color: C.inkDim,
                          }}
                        >
                          {reel.caption}
                        </p>
                      )}

                      <button
                        onClick={() =>
                          toggleReelLike(reel.id)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: liked
                            ? C.pink
                            : C.inkDim,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 700,
                        }}
                      >
                        <Heart
                          size={18}
                          fill={
                            liked ? C.pink : "none"
                          }
                        />
                        {reel.likes?.length || 0}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* MESSAGES */}
        {tab === "messages" && (
          <div style={{ padding: 16 }}>
            {!dmTarget ? (
              <>
                <h3
                  style={{
                    margin: "2px 0 14px",
                  }}
                >
                  Xabarlar
                </h3>

                {otherUsers.length === 0 ? (
                  <EmptyState text="Xabar yozish uchun boshqa foydalanuvchi kerak." />
                ) : (
                  otherUsers.map((username) => {
                    const u =
                      users[username] || {};

                    const thread =
                      dms[
                        convoKey(
                          me.username,
                          username
                        )
                      ] || [];

                    const last =
                      thread[thread.length - 1];

                    return (
                      <div
                        key={username}
                        onClick={() =>
                          setDmTarget(username)
                        }
                        style={{
                          padding: "12px 0",
                          borderBottom: `1px solid ${C.border}`,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <Avatar
                          name={username}
                          color={u.color}
                          avatar={u.avatar}
                          size={42}
                        />

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            <NameTag
                              name={username}
                              verified={u.verified}
                            />
                          </div>

                          {last && (
                            <div
                              style={{
                                fontSize: 11,
                                color: C.inkDim,
                                marginTop: 3,
                                overflow: "hidden",
                                whiteSpace:
                                  "nowrap",
                                textOverflow:
                                  "ellipsis",
                              }}
                            >
                              {last.text}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              <div>
                <button
                  onClick={() =>
                    setDmTarget(null)
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: C.ink,
                    cursor: "pointer",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={19} />
                  Orqaga
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    paddingBottom: 10,
                    borderBottom: `1px solid ${C.border}`,
                    marginBottom: 10,
                  }}
                >
                  <Avatar
                    name={dmTarget}
                    color={
                      users[dmTarget]?.color
                    }
                    avatar={
                      users[dmTarget]?.avatar
                    }
                    size={34}
                  />

                  <NameTag
                    name={dmTarget}
                    verified={
                      users[dmTarget]?.verified
                    }
                  />
                </div>

                <div
                  style={{
                    height: 340,
                    overflowY: "auto",
                    marginBottom: 10,
                    paddingRight: 3,
                  }}
                >
                  {(
                    dms[
                      convoKey(
                        me.username,
                        dmTarget
                      )
                    ] || []
                  ).map((m) => (
                    <div
                      key={
                        m.id ||
                        `${m.from}-${m.ts}`
                      }
                      style={{
                        display: "flex",
                        justifyContent:
                          m.from === me.username
                            ? "flex-end"
                            : "flex-start",
                        margin: "6px 0",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "78%",
                          padding: "8px 11px",
                          background:
                            m.from ===
                            me.username
                              ? C.pink
                              : C.cardAlt,
                          color:
                            m.from ===
                            me.username
                              ? "#18070c"
                              : C.ink,
                          borderRadius: 10,
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  <div ref={chatEndRef} />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    value={messageDraft}
                    onChange={(e) =>
                      setMessageDraft(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendMessage();
                      }
                    }}
                    placeholder="Xabar..."
                    style={{
                      ...inputStyle,
                      marginBottom: 0,
                    }}
                  />

                  <button
                    onClick={sendMessage}
                    style={{
                      background: C.pink,
                      color: "#18070c",
                      border: "none",
                      borderRadius: 9,
                      padding: "0 14px",
                      cursor: "pointer",
                    }}
                  >
                    <Send size={17} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <div style={{ padding: 16 }}>
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <Avatar
                name={me.username}
                color={me.color}
                avatar={me.avatar}
                size={82}
              />

              <h2
                style={{
                  margin: "12px 0 4px",
                  fontSize: 21,
                }}
              >
                <NameTag
                  name={me.username}
                  verified={me.verified}
                  size={17}
                />
              </h2>

              {me.bio && (
                <p
                  style={{
                    color: C.inkDim,
                    fontSize: 13,
                    margin: "6px auto 15px",
                    maxWidth: 350,
                  }}
                >
                  {me.bio}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 25,
                  margin: "16px 0 20px",
                }}
              >
                <div>
                  <strong>
                    {
                      posts.filter(
                        (p) =>
                          p.author ===
                          me.username
                      ).length
                    }
                  </strong>

                  <div
                    style={{
                      color: C.inkDim,
                      fontSize: 11,
                      marginTop: 3,
                    }}
                  >
                    Post
                  </div>
                </div>

                <div>
                  <strong>
                    {following.length}
                  </strong>

                  <div
                    style={{
                      color: C.inkDim,
                      fontSize: 11,
                      marginTop: 3,
                    }}
                  >
                    Obuna
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  onClick={openProfileEditor}
                  style={{
                    flex: 1,
                    background: C.cardAlt,
                    color: C.ink,
                    border: `1px solid ${C.border}`,
                    borderRadius: 9,
                    padding: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    gap: 6,
                  }}
                >
                  <Edit3 size={15} />
                  Profilni tahrirlash
                </button>

                <button
                  onClick={logout}
                  style={{
                    background: C.pink,
                    color: "#fff",
                    border: "none",
                    borderRadius: 9,
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Chiqish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(23,24,29,.96)",
          backdropFilter: "blur(12px)",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "9px 0 calc(9px + env(safe-area-inset-bottom))",
          zIndex: 50,
        }}
      >
        <IconTab
          active={tab === "feed"}
          onClick={() => setTab("feed")}
          Icon={Home}
        />

        <IconTab
          active={tab === "search"}
          onClick={() => setTab("search")}
          Icon={Search}
        />

        <IconTab
          active={tab === "reels"}
          onClick={() => setTab("reels")}
          Icon={Clapperboard}
        />

        <IconTab
          active={tab === "messages"}
          onClick={() => setTab("messages")}
          Icon={MessagesSquare}
        />

        <IconTab
          active={tab === "profile"}
          onClick={() => setTab("profile")}
          Icon={User}
        />
      </div>

      {/* CREATE POST */}
      {composerOpen && (
        <Modal onClose={closeComposer}>
          <h3
            style={{
              margin: "0 0 17px",
            }}
          >
            Yangi post
          </h3>

          <textarea
            value={draftText}
            onChange={(e) =>
              setDraftText(e.target.value)
            }
            placeholder="Nima gaplar?"
            style={{
              ...inputStyle,
              height: 90,
              resize: "vertical",
            }}
          />

          {draftMedia && (
            <div
              style={{
                borderRadius: 11,
                overflow: "hidden",
                background: "#000",
                marginBottom: 12,
                position: "relative",
              }}
            >
              {draftIsVideo ? (
                <video
                  src={draftMedia}
                  controls
                  style={{
                    width: "100%",
                    maxHeight: 250,
                  }}
                />
              ) : (
                <img
                  src={draftMedia}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: 250,
                    objectFit: "cover",
                  }}
                />
              )}

              <button
                onClick={() => {
                  setDraftMedia("");
                  setDraftIsVideo(false);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 30,
                  height: 30,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,.7)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <label
              style={{
                flex: 1,
                background: C.cardAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                padding: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                gap: 6,
                color: C.inkDim,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <ImageIcon size={16} />
              Rasm
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  handleDraftFile(
                    e,
                    false
                  )
                }
              />
            </label>

            <label
              style={{
                flex: 1,
                background: C.cardAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                padding: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                gap: 6,
                color: C.inkDim,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <VideoIcon size={16} />
              Video
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={(e) =>
                  handleDraftFile(
                    e,
                    true
                  )
                }
              />
            </label>
          </div>

          <button
            onClick={submitPost}
            style={{
              width: "100%",
              background: C.pink,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Ulashish
          </button>
        </Modal>
      )}

      {/* CREATE REEL */}
      {reelComposerOpen && (
        <Modal
          onClose={() =>
            setReelComposerOpen(false)
          }
        >
          <h3
            style={{
              margin: "0 0 17px",
            }}
          >
            Yangi Reel
          </h3>

          {!reelMedia && (
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 150,
                border: `1px dashed ${C.border}`,
                borderRadius: 12,
                color: C.inkDim,
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              <VideoIcon size={30} />
              <span
                style={{
                  marginTop: 8,
                  fontSize: 13,
                }}
              >
                Video tanlang
              </span>

              <input
                type="file"
                accept="video/*"
                hidden
                onChange={handleReelFile}
              />
            </label>
          )}

          {reelMedia && (
            <div
              style={{
                position: "relative",
                background: "#000",
                borderRadius: 11,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <video
                src={reelMedia}
                controls
                style={{
                  width: "100%",
                  maxHeight: 300,
                  display: "block",
                }}
              />

              <button
                onClick={() =>
                  setReelMedia("")
                }
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 30,
                  height: 30,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,.7)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          <input
            value={reelCaption}
            onChange={(e) =>
              setReelCaption(e.target.value)
            }
            placeholder="Izoh..."
            style={inputStyle}
          />

          <button
            onClick={submitReel}
            style={{
              width: "100%",
              background: C.pink,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Yuklash
          </button>
        </Modal>
      )}

      {/* NOTIFICATIONS */}
      {notificationsOpen && (
        <Modal
          onClose={() =>
            setNotificationsOpen(false)
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h3 style={{ margin: 0 }}>
              Bildirishnomalar
            </h3>

            {myNotifications.length > 0 && (
              <button
                onClick={clearNotifications}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.pink,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Tozalash
              </button>
            )}
          </div>

          {myNotifications.length === 0 ? (
            <EmptyState text="Hali bildirishnomalar yo‘q." />
          ) : (
            <div>
              {myNotifications.map((n) => {
                const u =
                  users[n.from] || {};

                return (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "11px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <Avatar
                      name={n.from}
                      color={u.color}
                      avatar={u.avatar}
                      size={37}
                    />

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.45,
                        }}
                      >
                        <strong>
                          <NameTag
                            name={n.from}
                            verified={u.verified}
                            size={11}
                          />
                        </strong>{" "}
                        {n.text}
                      </div>

                      <div
                        style={{
                          color: C.inkDim,
                          fontSize: 10,
                          marginTop: 3,
                        }}
                      >
                        {timeAgo(n.ts)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* PROFILE EDIT */}
      {profileEditOpen && (
        <Modal
          onClose={() =>
            setProfileEditOpen(false)
          }
        >
          <h3
            style={{
              margin: "0 0 17px",
            }}
          >
            Profilni tahrirlash
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 17,
            }}
          >
            <Avatar
              name={profileName}
              color={profileColor}
              avatar={profileAvatar}
              size={76}
            />
          </div>

          <input
            value={profileName}
            onChange={(e) =>
              setProfileName(e.target.value)
            }
            placeholder="Username"
            style={inputStyle}
          />

          <input
            value={profileAvatar}
            onChange={(e) =>
              setProfileAvatar(e.target.value)
            }
            placeholder="Avatar URL"
            style={inputStyle}
          />

          <textarea
            value={profileBio}
            onChange={(e) =>
              setProfileBio(e.target.value)
            }
            placeholder="Bio"
            style={{
              ...inputStyle,
              height: 85,
              resize: "vertical",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 9,
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() =>
                  setProfileColor(c)
                }
                style={{
                  width: 27,
                  height: 27,
                  borderRadius: "50%",
                  background: c,
                  border:
                    profileColor === c
                      ? `2px solid ${C.ink}`
                      : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          <button
            onClick={saveProfile}
            style={{
              width: "100%",
              background: C.pink,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Saqlash
          </button>
        </Modal>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          background: #0d0e12;
        }

        body {
          margin: 0;
          background: #0d0e12;
        }

        button,
        input,
        textarea {
          font-family: inherit;
        }

        button:active {
          transform: scale(.98);
        }

        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: #30323c;
          border-radius: 10px;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
