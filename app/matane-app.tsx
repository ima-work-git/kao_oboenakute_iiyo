"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type MataneUser = {
  id: string;
  publicCode: string;
  name: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
  locationEnabled: boolean;
  lastSeen: string | null;
  createdAt: string;
};

type Contact = {
  contactUserId: string;
  name: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
  tags: string[];
  memos: Array<{ date: string; text: string }>;
  facts: string[];
  visualTraits: string[];
  alertLevel: "normal" | "caution";
  alertSuggested: boolean;
  alertReason: string | null;
  hudText: string;
  lastSeen: string | null;
  nearby: boolean;
  distanceMeters: number | null;
  createdAt: string;
  updatedAt: string;
};

type Tab = "exchange" | "nearby" | "friends";
type Coordinates = { latitude: number; longitude: number; accuracy: number };

const TOKEN_KEY = "matane_device_token";

async function avatarFromFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選んでください。 / Choose an image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("画像は8MB以内にしてください。 / Image must be under 8MB.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("画像を読み込めませんでした。 / Could not read image."));
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("画像を処理できませんでした。");
    const scale = Math.max(256 / image.naturalWidth, 256 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (256 - width) / 2, (256 - height) / 2, width, height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function initials(name: string) {
  return name.replace(/\s+/g, "").slice(0, 1) || "ま";
}

function PersonAvatar({ name, src, className = "", live = false }: { name: string; src: string; className?: string; live?: boolean }) {
  return (
    <span className={`avatar-visual ${className}`}>
      {src ? <Image src={src} alt="" fill unoptimized sizes="64px" /> : <b>{initials(name)}</b>}
      {live && <i aria-hidden="true" />}
    </span>
  );
}

function relativeTime(value: string | null) {
  if (!value) return "位置共有オフ";
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 20) return "たった今";
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  return `${Math.floor(minutes / 60)}時間前`;
}

async function readJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.error || "通信に失敗しました。"));
  return body;
}

export function MataneApp() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<MataneUser | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<Tab>("exchange");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const [locationLabel, setLocationLabel] = useState("位置共有はオフです");
  const [lastCoordinates, setLastCoordinates] = useState<Coordinates | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hudContact, setHudContact] = useState<Contact | null>(null);
  const [memo, setMemo] = useState("");
  const [exchangeCode, setExchangeCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState("");
  const [toast, setToast] = useState("");
  const [portraits, setPortraits] = useState<Record<string, { dataUrl: string; disclaimer: string; mode: "openai" | "fallback" }>>({});
  const [portraitBusyId, setPortraitBusyId] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const memoTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoExchangeRef = useRef("");

  const api = useCallback(
    async (path: string, init: RequestInit = {}, explicitToken?: string) => {
      const authToken = explicitToken ?? token;
      const headers = new Headers(init.headers);
      if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
      if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
      return readJson(await fetch(path, { ...init, headers }));
    },
    [token]
  );

  const refreshSession = useCallback(
    async (sessionToken: string) => {
      const body = await api("/api/session", {}, sessionToken);
      const nextUser = body.user as MataneUser;
      setUser(nextUser);
      setAvatarDraft(nextUser.avatarDataUrl);
      setContacts(body.contacts as Contact[]);
    },
    [api]
  );

  const performExchange = useCallback(async (code: string, explicitToken?: string) => {
    const body = await api("/api/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    }, explicitToken);
    const nextContacts = body.contacts as Contact[];
    const exchanged = body.contact as Contact | null;
    setContacts(nextContacts);
    setExchangeCode("");
    if (exchanged) {
      setSelectedId(exchanged.contactUserId);
      setMemo("");
      setTab("friends");
    }
    setToast("交換しました。どんな人だったかメモしましょう。 / Exchanged — add a note.");
  }, [api]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(TOKEN_KEY) || "";
      if (!stored) {
        setLoading(false);
        return;
      }
      setToken(stored);
      refreshSession(stored)
        .catch(() => window.localStorage.removeItem(TOKEN_KEY))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  useEffect(() => {
    if (!user) return;
    const exchangeUrl = new URL("/", window.location.origin);
    exchangeUrl.searchParams.set("exchange", user.publicCode);
    QRCode.toDataURL(exchangeUrl.toString(), {
      width: 360,
      margin: 1,
      color: { dark: "#13211e", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [user]);

  useEffect(() => {
    if (!user || !token) return;
    const code = new URLSearchParams(window.location.search).get("exchange")?.trim().toUpperCase() || "";
    if (!code || code === user.publicCode || autoExchangeRef.current === code) return;
    autoExchangeRef.current = code;
    performExchange(code)
      .catch((error: Error) => setToast(error.message))
      .finally(() => window.history.replaceState({}, "", window.location.pathname));
  }, [performExchange, token, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const postLocation = useCallback(
    async (coords: Coordinates, force = false) => {
      if (!force && Date.now() - lastSentAt.current < 20_000) return;
      lastSentAt.current = Date.now();
      const body = await api("/api/location", {
        method: "POST",
        body: JSON.stringify({ ...coords, enabled: true }),
      });
      setContacts(body.contacts as Contact[]);
      setLocationLabel(`更新 ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`);
    },
    [api]
  );

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setLastCoordinates(coords);
      setLocationActive(true);
      setLocationLabel(`位置精度 約${Math.round(coords.accuracy)}m`);
      postLocation(coords).catch((error: Error) => setToast(error.message));
    },
    [postLocation]
  );

  const enableLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setToast("このブラウザは位置情報に対応していません。");
      return;
    }
    setLocationLabel("位置情報を確認中…");
    navigator.geolocation.getCurrentPosition(onPosition, () => {
      setLocationLabel("位置情報を許可してください");
      setToast("位置情報が使えません。体験モードでも試せます。");
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 30_000 });
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(onPosition, () => {
      setLocationLabel("位置更新を待っています");
    }, { enableHighAccuracy: false, timeout: 20_000, maximumAge: 30_000 });
  }, [onPosition]);

  const disableLocation = useCallback(async () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setLocationActive(false);
    setLocationLabel("位置共有はオフです");
    try {
      const body = await api("/api/location", {
        method: "POST",
        body: JSON.stringify({ enabled: false }),
      });
      setContacts(body.contacts as Contact[]);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "位置共有を停止できませんでした。");
    }
  }, [api]);

  useEffect(() => {
    if (!token || !locationActive) return;
    const poll = window.setInterval(() => {
      api("/api/nearby")
        .then((body) => setContacts(body.contacts as Contact[]))
        .catch(() => undefined);
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (lastCoordinates) postLocation(lastCoordinates, true).catch(() => undefined);
      else enableLocation();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api, enableLocation, lastCoordinates, locationActive, postLocation, token]);

  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const nearbyContacts = useMemo(
    () => contacts.filter((contact) => contact.nearby).sort((a, b) => {
      if (a.alertLevel !== b.alertLevel) return a.alertLevel === "caution" ? -1 : 1;
      return (a.distanceMeters ?? 9999) - (b.distanceMeters ?? 9999);
    }),
    [contacts]
  );
  const selectedContact = contacts.find((contact) => contact.contactUserId === selectedId) ?? null;

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const body = await api("/api/session", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          reading: data.get("reading"),
          org: data.get("org"),
          avatarDataUrl: avatarDraft,
        }),
      }, "");
      const nextToken = String(body.token);
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      const createdUser = body.user as MataneUser;
      setUser(createdUser);
      setAvatarDraft(createdUser.avatarDataUrl);
      setContacts([]);
      const pendingCode = new URLSearchParams(window.location.search).get("exchange")?.trim().toUpperCase() || "";
      if (pendingCode && pendingCode !== createdUser.publicCode) {
        autoExchangeRef.current = pendingCode;
        await performExchange(pendingCode, nextToken);
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setTab("exchange");
        setToast("MATANEを始めました。 / Welcome to MATANE.");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "プロフィールを作成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function exchange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await performExchange(exchangeCode);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "交換できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar(file: File | undefined) {
    if (!file) return;
    try {
      setAvatarDraft(await avatarFromFile(file));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "画像を読み込めませんでした。");
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const body = await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: data.get("name"),
          reading: data.get("reading"),
          org: data.get("org"),
          avatarDataUrl: avatarDraft,
        }),
      });
      const updated = body.user as MataneUser;
      setUser(updated);
      setAvatarDraft(updated.avatarDataUrl);
      setProfileEditing(false);
      setToast("プロフィールを更新しました。 / Profile updated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "プロフィールを更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !memo.trim()) return;
    setBusy(true);
    try {
      const body = await api("/api/memory", {
        method: "POST",
        body: JSON.stringify({ contactUserId: selectedContact.contactUserId, memo }),
      });
      const updated = body.contact as Contact;
      setContacts((current) => current.map((item) => item.contactUserId === updated.contactUserId ? updated : item));
      setMemo("");
      setToast(body.aiMode === "openai" ? "OpenAIが記憶を整理しました" : "デモAIが記憶を整理しました");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "記憶を保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function decideAlert(contact: Contact, approved: boolean) {
    setBusy(true);
    try {
      const body = await api("/api/alert", {
        method: "POST",
        body: JSON.stringify({ contactUserId: contact.contactUserId, approved }),
      });
      const updated = body.contact as Contact;
      setContacts((current) => current.map((item) => item.contactUserId === updated.contactUserId ? updated : item));
      setToast(approved ? "注意人物として保存しました" : "注意候補を却下しました");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "設定を更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function generatePortrait(contact: Contact) {
    setPortraitBusyId(contact.contactUserId);
    try {
      const body = await api("/api/portrait", {
        method: "POST",
        body: JSON.stringify({ contactUserId: contact.contactUserId }),
      });
      setPortraits((current) => ({
        ...current,
        [contact.contactUserId]: {
          dataUrl: String(body.dataUrl),
          disclaimer: String(body.disclaimer),
          mode: body.mode === "openai" ? "openai" : "fallback",
        },
      }));
      setToast(body.mode === "openai" ? "OpenAIが想像ポートレートを描きました" : "デモスケッチを描きました。APIキー設定後はOpenAIで生成します");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "想像ポートレートを生成できませんでした。");
    } finally {
      setPortraitBusyId(null);
    }
  }

  async function addDemo() {
    setBusy(true);
    try {
      const coords = lastCoordinates ?? { latitude: 35.681236, longitude: 139.767125, accuracy: 20 };
      const body = await api("/api/demo", {
        method: "POST",
        body: JSON.stringify(coords),
      });
      setContacts(body.contacts as Contact[]);
      setLocationActive(true);
      setLocationLabel(lastCoordinates ? "現在地で体験中" : "東京駅付近の体験モード");
      setToast("近くにいる2人を追加しました");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "体験モードを開始できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function shareCode() {
    if (!user) return;
    const exchangeUrl = new URL("/", window.location.origin);
    exchangeUrl.searchParams.set("exchange", user.publicCode);
    const text = `MATANEで一度だけ交換しよう。 / Let's exchange once on MATANE. Code: ${user.publicCode}`;
    if (navigator.share) {
      await navigator.share({ title: "MATANE Exchange", text, url: exchangeUrl.toString() }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(exchangeUrl.toString());
      setToast("交換リンクをコピーしました。 / Link copied.");
    }
  }

  if (loading) {
    return (
      <main className="loading-screen" aria-live="polite">
        <div className="brand-mark">ま</div>
        <p>MATANEを準備しています</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="onboarding-shell">
        <section className="onboarding-copy">
          <div className="eyebrow"><span /> CAMERALESS CONNECTION</div>
          <p className="wordmark">MATANE <small>またね</small></p>
          <h1>名前を思い出す前に、<br />近くにいるとわかる。</h1>
          <p className="lead">
            一度だけ交換。次の会場では、交換済みの人が近くにいることをスマホが知らせます。<br />
            <small>Exchange once. Your phone tells you when a friend is nearby.</small>
          </p>
          <div className="privacy-note">
            <span className="privacy-dot" />
            顔認証なし。座標は相手に見せません。 / No face recognition or shared coordinates.
          </div>
        </section>
        <form className="onboarding-card" onSubmit={createProfile}>
          <p className="step-label">01 — あなたのプロフィール / YOUR PROFILE</p>
          <label className="avatar-upload">
            <PersonAvatar name="あなた" src={avatarDraft} className="avatar-preview" />
            <span><strong>アイコン画像</strong><small>Profile photo · Optional</small></span>
            <b>選ぶ / Choose</b>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
          </label>
          <label>名前 / Name<input name="name" required placeholder="山田 花子" autoComplete="name" /></label>
          <label>ふりがな / Reading <small>任意 / Optional</small><input name="reading" placeholder="やまだ はなこ" /></label>
          <label>所属 / Organization<input name="org" placeholder="OpenAI Build Week" autoComplete="organization" /></label>
          <button className="primary-button" disabled={busy}>{busy ? "作成中… / Creating…" : "MATANEをはじめる / Get started"}<span>→</span></button>
          <p className="fine-print">プロフィールは交換した相手にだけ表示されます。<br />Only people you exchange with can see it.</p>
        </form>
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="app-header">
        <div>
          <p className="app-wordmark">MATANE <span>またね</span></p>
          <p className="header-caption">{user.name} · My profile</p>
        </div>
        <div className="header-actions">
          <button className={`status-pill ${locationActive ? "is-live" : ""}`} onClick={locationActive ? disableLocation : enableLocation}>
            <span /> {locationActive ? "探索中 / Live" : "停止中 / Off"}
          </button>
          <button className="profile-button" onClick={() => { setAvatarDraft(user.avatarDataUrl); setProfileEditing(true); setTab("exchange"); }} aria-label="プロフィールを編集 / Edit profile">
            <PersonAvatar name={user.name} src={user.avatarDataUrl} className="header-avatar" />
          </button>
        </div>
      </header>

      <div className="app-content">
        {tab === "nearby" && (
          <section className="screen nearby-screen">
            <div className="hero-panel">
              <p className="hero-kicker">REUNION RADAR</p>
              <h1>{nearbyContacts.length ? `${nearbyContacts.length}人が近くにいます` : "近くの友達を探す"}<small>{nearbyContacts.length ? `${nearbyContacts.length} friends nearby` : "Find nearby friends"}</small></h1>
              <p>{locationActive ? locationLabel : "位置共有は1時間で失効。座標そのものは相手に表示されません。 / Location expires in one hour."}</p>
              <button className="radar-button" onClick={locationActive ? disableLocation : enableLocation}>
                <span className="radar-icon"><i /><i /><b /></span>
                <strong>{locationActive ? "探索を止める / Stop" : "探索をはじめる / Start"}</strong>
                <small>{locationActive ? "別タブ中は更新が遅くなる場合があります" : "位置情報の許可が必要です / Location required"}</small>
              </button>
            </div>

            <div className="section-heading">
              <div><p>NEAR YOU</p><h2>近くの友達 <small>Nearby friends</small></h2></div>
              <span>{nearbyContacts.length.toString().padStart(2, "0")}</span>
            </div>

            {nearbyContacts.length ? (
              <div className="nearby-list">
                {nearbyContacts.map((contact) => (
                  <article className={`person-card ${contact.alertLevel === "caution" ? "is-caution" : ""}`} key={contact.contactUserId}>
                    <PersonAvatar name={contact.name} src={contact.avatarDataUrl} className="avatar" live />
                    <div className="person-main">
                      <div className="person-title">
                        <div><h3>{contact.name}</h3><p>{contact.reading && `${contact.reading} · `}{contact.org || "所属未登録 / No organization"}</p></div>
                        <span className="distance">{contact.distanceMeters ?? "—"}m</span>
                      </div>
                      <div className="memory-preview">
                        {contact.hudText.split("\n").map((line) => <span key={line}>{line}</span>)}
                      </div>
                      <button onClick={() => setHudContact(contact)}>
                        {contact.alertLevel === "caution" ? "注意を確認 / View caution" : "再会メモ / Reunion note"}<span>↗</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-orbit"><span /></div>
                <h3>{locationActive ? "友達を探しています / Searching…" : "探索を始めると、ここに表示されます"}</h3>
                <p>実機が1台でも、体験モードで再会通知を試せます。 / Try with one phone.</p>
                <button className="secondary-button" onClick={addDemo} disabled={busy}>{busy ? "準備中…" : "30秒で体験 / Try demo"}</button>
              </div>
            )}

            <div className="privacy-strip"><span>⌁</span><p><strong>Privacy by design</strong>交換していない人は表示されません。 / Only exchanged friends appear.</p></div>
          </section>
        )}

        {tab === "friends" && (
          <section className="screen memory-screen">
            <div className="screen-intro"><p>FRIENDS</p><h1>友達 <small>Friends</small></h1><span>{contacts.length}人</span></div>
            {!contacts.length ? (
              <div className="empty-state compact"><h3>まだ友達がいません / No friends yet</h3><p>QRか交換コードで一度だけ交換しましょう。</p><button className="secondary-button" onClick={() => setTab("exchange")}>交換する / Exchange</button></div>
            ) : (
              <div className="contact-grid">
                {contacts.map((contact) => (
                  <button className={`contact-row ${selectedId === contact.contactUserId ? "is-selected" : ""}`} key={contact.contactUserId} onClick={() => setSelectedId(contact.contactUserId)}>
                    <PersonAvatar name={contact.name} src={contact.avatarDataUrl} className="mini-avatar" />
                    <span className="contact-copy"><strong>{contact.name}</strong><small>{contact.reading && `${contact.reading} · `}{contact.org || "所属未登録 / No organization"}</small><span>{contact.tags.slice(0, 3).join(" · ") || "メモを追加 / Add a note"}</span></span>
                    {contact.alertSuggested && <i className="suggestion-dot" title="注意候補あり" />}
                    <b>›</b>
                  </button>
                ))}
              </div>
            )}

            {selectedContact && (
              <div className="memory-editor">
                <div className="editor-header"><PersonAvatar name={selectedContact.name} src={selectedContact.avatarDataUrl} className="avatar large" /><div><p>FRIEND NOTE</p><h2>{selectedContact.name}</h2><span>{selectedContact.reading && `${selectedContact.reading} · `}{selectedContact.org}</span></div><button onClick={() => setSelectedId(null)} aria-label="閉じる / Close">×</button></div>
                {selectedContact.facts.length > 0 && <div className="fact-list">{selectedContact.facts.map((fact) => <span key={fact}>{fact}</span>)}</div>}
                <section className="portrait-studio" aria-label="AI想像ポートレート">
                  <div className="portrait-heading"><div><p>AI IMAGINED PORTRAIT</p><h3>メモに忠実な実写風イメージ</h3><small>Faithful photorealistic impression</small></div><span>{portraits[selectedContact.contactUserId]?.mode === "fallback" ? "DEMO" : "OPENAI"}</span></div>
                  {portraits[selectedContact.contactUserId] ? (
                    <div className="portrait-result">
                      <Image src={portraits[selectedContact.contactUserId].dataUrl} alt={`${selectedContact.name}さんのメモから作ったAI想像ポートレート`} fill unoptimized sizes="260px" />
                      <span>{portraits[selectedContact.contactUserId].mode === "openai" ? "AIの想像 / IMAGINED" : "DEMO"}</span>
                    </div>
                  ) : (
                    <div className="portrait-placeholder"><span>{initials(selectedContact.name)}</span><i /><i /></div>
                  )}
                  {selectedContact.visualTraits.length > 0 ? (
                    <div className="trait-list">{selectedContact.visualTraits.map((trait) => <span key={trait}>{trait}</span>)}</div>
                  ) : (
                    <p className="portrait-hint">性別・年代・体型・服・髪型などを具体的にメモすると忠実に描けます。<br />Describe gender presentation, age, build, clothing and hair.</p>
                  )}
                  <button
                    type="button"
                    className="portrait-button"
                    onClick={() => generatePortrait(selectedContact)}
                    disabled={portraitBusyId === selectedContact.contactUserId || !selectedContact.visualTraits.length}
                  >
                    <span>✦</span>{portraitBusyId === selectedContact.contactUserId ? "OpenAIが描いています… / Generating…" : portraits[selectedContact.contactUserId] ? "実写風でもう一度描く / Regenerate" : "実写風に想像して描く / Imagine"}
                  </button>
                  <small>{portraits[selectedContact.contactUserId]?.disclaimer || "本人の顔を再現・特定するものではありません。"}</small>
                </section>
                {selectedContact.alertSuggested && (
                  <div className="alert-suggestion">
                    <p><strong>AIからの注意候補</strong>{selectedContact.alertReason || "メモに注意が必要な内容があります"}</p>
                    <div><button onClick={() => decideAlert(selectedContact, false)}>今回は見送る</button><button onClick={() => decideAlert(selectedContact, true)}>注意人物にする</button></div>
                  </div>
                )}
                <button
                  type="button"
                  className={`fear-toggle ${selectedContact.alertLevel === "caution" ? "is-active" : ""}`}
                  onClick={() => decideAlert(selectedContact, selectedContact.alertLevel !== "caution")}
                  disabled={busy}
                >
                  <span>{selectedContact.alertLevel === "caution" ? "!" : "○"}</span>
                  <b>{selectedContact.alertLevel === "caution" ? "怖いフラグを外す / Remove caution" : "怖いと記録する / Mark as caution"}</b>
                  <small>この記録は自分だけに表示 / Private to you</small>
                </button>
                <form onSubmit={saveMemory}>
                  <div className="dictation-row">
                    <label htmlFor="friend-memo">どんな人だった？ / Note about them</label>
                    <button type="button" onClick={() => { memoTextareaRef.current?.focus(); setToast("キーボードの🎙を押すと、話した内容がリアルタイム表示されます。 / Tap your keyboard mic."); }}>🎙 音声入力 / Dictate</button>
                  </div>
                  <textarea
                    id="friend-memo"
                    ref={memoTextareaRef}
                    value={memo}
                    onChange={(event) => setMemo(event.target.value)}
                    placeholder="例：男性、40代、ふくよかな体型。黒いパーカー。猫を2匹飼っている。 / e.g. A heavyset man in his 40s…"
                    rows={5}
                    inputMode="text"
                    autoCapitalize="sentences"
                    required
                  />
                  <p className="dictation-help">スマホ標準キーボードのマイクを使います。話した内容はこの欄にリアルタイム表示されます。<br />Uses your phone keyboard dictation; words appear here live.</p>
                  <p className="ai-caption"><span>✦</span> OpenAIが事実・外見・次の話題を整理 / Structures facts, appearance and topics</p>
                  <button className="primary-button" disabled={busy || !memo.trim()}>{busy ? "記憶化中… / Saving…" : "AIで記憶にする / Save memory"}<span>→</span></button>
                </form>
              </div>
            )}
          </section>
        )}

        {tab === "exchange" && (
          <section className="screen exchange-screen">
            <div className="screen-intro"><p>ONE-TIME EXCHANGE</p><h1>交換 <small>Exchange</small></h1></div>
            {profileEditing && (
              <form className="profile-editor" onSubmit={updateProfile}>
                <div className="profile-editor-heading"><div><p>MY PROFILE</p><h2>プロフィールを編集 <small>Edit profile</small></h2></div><button type="button" onClick={() => { setAvatarDraft(user.avatarDataUrl); setProfileEditing(false); }} aria-label="閉じる / Close">×</button></div>
                <label className="avatar-upload">
                  <PersonAvatar name={user.name} src={avatarDraft} className="avatar-preview" />
                  <span><strong>アイコン画像</strong><small>Profile photo · Optional</small></span>
                  <b>変更 / Change</b>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
                </label>
                {avatarDraft && <button type="button" className="remove-avatar" onClick={() => setAvatarDraft("")}>画像を外す / Remove photo</button>}
                <label>名前 / Name<input name="name" required defaultValue={user.name} autoComplete="name" /></label>
                <label>ふりがな / Reading <small>任意 / Optional</small><input name="reading" defaultValue={user.reading} /></label>
                <label>所属 / Organization<input name="org" defaultValue={user.org} autoComplete="organization" /></label>
                <button className="primary-button" disabled={busy}>{busy ? "保存中… / Saving…" : "変更を保存 / Save changes"}<span>→</span></button>
              </form>
            )}
            <div className="qr-card">
              <div className="qr-heading"><p>見せるだけで交換</p><span>SHOW &amp; SCAN</span></div>
              <div className="qr-frame">
                {qrDataUrl ? <Image className="qr-image" src={qrDataUrl} alt="MATANE交換用QRコード" width={360} height={360} unoptimized priority /> : <span>QRを作成中…</span>}
              </div>
              <h2>このQRを相手に見せる</h2>
              <p>読み取ると一度だけ自動交換します。<br /><small>They scan once to exchange automatically.</small></p>
              <div className="exchange-code-inline"><span>CODE</span><strong>{user.publicCode}</strong></div>
              <button onClick={shareCode}>交換リンクを共有 / Share link <b>↗</b></button>
            </div>
            <form className="exchange-form" onSubmit={exchange}>
              <p className="step-label">QRが読めないとき / ENTER A CODE</p>
              <input value={exchangeCode} onChange={(event) => setExchangeCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" spellCheck={false} />
              <button className="primary-button" disabled={busy || exchangeCode.length < 6}>{busy ? "交換中… / Exchanging…" : "この人と交換 / Exchange"}<span>→</span></button>
            </form>
            <div className="how-it-works"><p>交換後は / AFTER EXCHANGE</p><ol><li><span>1</span>どんな人だったかメモ / Add a note</li><li><span>2</span>会場で「近く」をON / Turn Nearby on</li><li><span>3</span>友達だけ再会通知 / Get friend alerts</li></ol></div>
          </section>
        )}
      </div>

      <nav className="bottom-nav" aria-label="メインメニュー / Main menu">
        <button className={tab === "exchange" ? "active" : ""} onClick={() => setTab("exchange")}><span className="nav-exchange">↔</span><b>交換<small>Exchange</small></b></button>
        <button className={tab === "nearby" ? "active" : ""} onClick={() => setTab("nearby")}><span className="nav-radar" /><b>近く<small>Nearby</small></b></button>
        <button className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}><span className="nav-memory">◎</span><b>友達<small>Friends</small></b></button>
      </nav>

      {hudContact && (
        <div className={`hud-overlay ${hudContact.alertLevel === "caution" ? "is-caution" : ""}`} role="dialog" aria-modal="true" aria-label={`${hudContact.name}さんの再会メモ`}>
          <button className="hud-close" onClick={() => setHudContact(null)} aria-label="閉じる">×</button>
          <div className="hud-frame"><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /><p>{hudContact.alertLevel === "caution" ? "CAUTION · NEAR YOU" : "MATANE · NEAR YOU"}</p><div>{hudContact.hudText.split("\n").map((line) => <strong key={line}>{line}</strong>)}</div><small>推定 {hudContact.distanceMeters ?? "—"}m · {relativeTime(hudContact.lastSeen)}</small></div>
          <p className="hud-footnote">このメモはあなたにしか見えません</p>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
