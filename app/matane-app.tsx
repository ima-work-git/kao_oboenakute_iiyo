"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type MataneUser = {
  id: string;
  publicCode: string;
  name: string;
  reading: string;
  org: string;
  locationEnabled: boolean;
  lastSeen: string | null;
  createdAt: string;
};

type Contact = {
  contactUserId: string;
  name: string;
  reading: string;
  org: string;
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

type Tab = "nearby" | "memory" | "exchange";
type Coordinates = { latitude: number; longitude: number; accuracy: number };

const TOKEN_KEY = "matane_device_token";

function initials(name: string) {
  return name.replace(/\s+/g, "").slice(0, 1) || "ま";
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
  const [tab, setTab] = useState<Tab>("nearby");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const [locationLabel, setLocationLabel] = useState("位置共有はオフです");
  const [lastCoordinates, setLastCoordinates] = useState<Coordinates | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hudContact, setHudContact] = useState<Contact | null>(null);
  const [memo, setMemo] = useState("");
  const [exchangeCode, setExchangeCode] = useState("");
  const [toast, setToast] = useState("");
  const [portraits, setPortraits] = useState<Record<string, { dataUrl: string; disclaimer: string }>>({});
  const [portraitBusyId, setPortraitBusyId] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  const api = useCallback(
    async (path: string, init: RequestInit = {}, explicitToken?: string) => {
      const authToken = explicitToken ?? token;
      const headers = new Headers(init.headers);
      headers.set("Content-Type", "application/json");
      if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
      return readJson(await fetch(path, { ...init, headers }));
    },
    [token]
  );

  const refreshSession = useCallback(
    async (sessionToken: string) => {
      const body = await api("/api/session", {}, sessionToken);
      setUser(body.user as MataneUser);
      setContacts(body.contacts as Contact[]);
    },
    [api]
  );

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
        }),
      }, "");
      const nextToken = String(body.token);
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(body.user as MataneUser);
      setContacts([]);
      setToast("MATANEを始めました");
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
      const body = await api("/api/exchange", {
        method: "POST",
        body: JSON.stringify({ code: exchangeCode }),
      });
      setContacts(body.contacts as Contact[]);
      setExchangeCode("");
      setToast("交換しました。次から近くにいると分かります");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "交換できませんでした。");
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
        },
      }));
      setToast("OpenAIが想像ポートレートを描きました");
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
    const text = `MATANEで一度だけ交換しよう。交換コード: ${user.publicCode}`;
    if (navigator.share) {
      await navigator.share({ title: "MATANE 交換コード", text }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(user.publicCode);
      setToast("交換コードをコピーしました");
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
            一度だけ交換。次の会場では、交換済みの人が近くにいることをスマホが知らせます。
          </p>
          <div className="privacy-note">
            <span className="privacy-dot" />
            顔認証なし。座標は相手に見せません。
          </div>
        </section>
        <form className="onboarding-card" onSubmit={createProfile}>
          <p className="step-label">01 — あなたのプロフィール</p>
          <label>名前<input name="name" required placeholder="山田 花子" autoComplete="name" /></label>
          <label>ふりがな<input name="reading" placeholder="やまだ はなこ" /></label>
          <label>所属<input name="org" placeholder="OpenAI Build Week" autoComplete="organization" /></label>
          <button className="primary-button" disabled={busy}>{busy ? "作成中…" : "MATANEをはじめる"}<span>→</span></button>
          <p className="fine-print">プロフィールは交換した相手にだけ表示されます。</p>
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
          <p className="header-caption">{user.name}さんの記憶</p>
        </div>
        <button className={`status-pill ${locationActive ? "is-live" : ""}`} onClick={locationActive ? disableLocation : enableLocation}>
          <span /> {locationActive ? "探索中" : "停止中"}
        </button>
      </header>

      <div className="app-content">
        {tab === "nearby" && (
          <section className="screen nearby-screen">
            <div className="hero-panel">
              <p className="hero-kicker">REUNION RADAR</p>
              <h1>{nearbyContacts.length ? `${nearbyContacts.length}人が近くにいます` : "近くの人を探す"}</h1>
              <p>{locationActive ? locationLabel : "位置共有は1時間で失効。座標そのものは相手に表示されません。"}</p>
              <button className="radar-button" onClick={locationActive ? disableLocation : enableLocation}>
                <span className="radar-icon"><i /><i /><b /></span>
                <strong>{locationActive ? "探索を止める" : "探索をはじめる"}</strong>
                <small>{locationActive ? "別タブ中は更新が遅くなる場合があります" : "位置情報の許可が必要です"}</small>
              </button>
            </div>

            <div className="section-heading">
              <div><p>NEAR YOU</p><h2>交換済みの人</h2></div>
              <span>{nearbyContacts.length.toString().padStart(2, "0")}</span>
            </div>

            {nearbyContacts.length ? (
              <div className="nearby-list">
                {nearbyContacts.map((contact) => (
                  <article className={`person-card ${contact.alertLevel === "caution" ? "is-caution" : ""}`} key={contact.contactUserId}>
                    <div className="avatar">{initials(contact.name)}<span /></div>
                    <div className="person-main">
                      <div className="person-title">
                        <div><h3>{contact.name}</h3><p>{contact.org || "所属未登録"}</p></div>
                        <span className="distance">{contact.distanceMeters ?? "—"}m</span>
                      </div>
                      <div className="memory-preview">
                        {contact.hudText.split("\n").map((line) => <span key={line}>{line}</span>)}
                      </div>
                      <button onClick={() => setHudContact(contact)}>
                        {contact.alertLevel === "caution" ? "注意を確認" : "再会メモを表示"}<span>↗</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-orbit"><span /></div>
                <h3>{locationActive ? "交換済みの人を探しています" : "探索をはじめると、ここに表示されます"}</h3>
                <p>実機が1台でも、体験モードで再会通知を試せます。</p>
                <button className="secondary-button" onClick={addDemo} disabled={busy}>{busy ? "準備中…" : "30秒で体験する"}</button>
              </div>
            )}

            <div className="privacy-strip"><span>⌁</span><p><strong>Privacy by design</strong>交換していない人は表示されません。</p></div>
          </section>
        )}

        {tab === "memory" && (
          <section className="screen memory-screen">
            <div className="screen-intro"><p>YOUR MEMORY</p><h1>人の記憶</h1><span>{contacts.length}人</span></div>
            {!contacts.length ? (
              <div className="empty-state compact"><h3>まだ交換した人がいません</h3><p>交換コードを入力すると、ここに記憶が育ちます。</p><button className="secondary-button" onClick={() => setTab("exchange")}>交換する</button></div>
            ) : (
              <div className="contact-grid">
                {contacts.map((contact) => (
                  <button className={`contact-row ${selectedId === contact.contactUserId ? "is-selected" : ""}`} key={contact.contactUserId} onClick={() => setSelectedId(contact.contactUserId)}>
                    <span className="mini-avatar">{initials(contact.name)}</span>
                    <span className="contact-copy"><strong>{contact.name}</strong><small>{contact.org || "所属未登録"}</small><span>{contact.tags.slice(0, 3).join(" · ") || "メモを追加"}</span></span>
                    {contact.alertSuggested && <i className="suggestion-dot" title="注意候補あり" />}
                    <b>›</b>
                  </button>
                ))}
              </div>
            )}

            {selectedContact && (
              <div className="memory-editor">
                <div className="editor-header"><div className="avatar large">{initials(selectedContact.name)}</div><div><p>MEMORY FOR</p><h2>{selectedContact.name}</h2><span>{selectedContact.org}</span></div><button onClick={() => setSelectedId(null)} aria-label="閉じる">×</button></div>
                {selectedContact.facts.length > 0 && <div className="fact-list">{selectedContact.facts.map((fact) => <span key={fact}>{fact}</span>)}</div>}
                <section className="portrait-studio" aria-label="AI想像ポートレート">
                  <div className="portrait-heading"><div><p>AI IMAGINED PORTRAIT</p><h3>記憶の中の雰囲気</h3></div><span>OPENAI</span></div>
                  {portraits[selectedContact.contactUserId] ? (
                    <div className="portrait-result">
                      <Image src={portraits[selectedContact.contactUserId].dataUrl} alt={`${selectedContact.name}さんのメモから作ったAI想像ポートレート`} fill unoptimized sizes="260px" />
                      <span>AIの想像</span>
                    </div>
                  ) : (
                    <div className="portrait-placeholder"><span>{initials(selectedContact.name)}</span><i /><i /></div>
                  )}
                  {selectedContact.visualTraits.length > 0 ? (
                    <div className="trait-list">{selectedContact.visualTraits.map((trait) => <span key={trait}>{trait}</span>)}</div>
                  ) : (
                    <p className="portrait-hint">服・髪型・メガネ・表情・雰囲気をメモすると描けます。</p>
                  )}
                  <button
                    type="button"
                    className="portrait-button"
                    onClick={() => generatePortrait(selectedContact)}
                    disabled={portraitBusyId === selectedContact.contactUserId || !selectedContact.visualTraits.length}
                  >
                    <span>✦</span>{portraitBusyId === selectedContact.contactUserId ? "OpenAIが描いています…" : portraits[selectedContact.contactUserId] ? "もう一度想像して描く" : "メモから想像して描く"}
                  </button>
                  <small>{portraits[selectedContact.contactUserId]?.disclaimer || "本人の顔を再現・特定するものではありません。"}</small>
                </section>
                {selectedContact.alertSuggested && (
                  <div className="alert-suggestion">
                    <p><strong>AIからの注意候補</strong>{selectedContact.alertReason || "メモに注意が必要な内容があります"}</p>
                    <div><button onClick={() => decideAlert(selectedContact, false)}>今回は見送る</button><button onClick={() => decideAlert(selectedContact, true)}>注意人物にする</button></div>
                  </div>
                )}
                <form onSubmit={saveMemory}>
                  <label>会った後のメモ<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="例：猫を2匹飼っている。Pythonが得意。" rows={4} required /></label>
                  <p className="ai-caption"><span>✦</span> OpenAIが事実・タグ・次の話題を整理します</p>
                  <button className="primary-button" disabled={busy || !memo.trim()}>{busy ? "記憶化中…" : "AIで記憶にする"}<span>→</span></button>
                </form>
              </div>
            )}
          </section>
        )}

        {tab === "exchange" && (
          <section className="screen exchange-screen">
            <div className="screen-intro"><p>ONE-TIME EXCHANGE</p><h1>一度だけ交換</h1></div>
            <div className="code-card">
              <p>あなたの交換コード</p>
              <strong>{user.publicCode}</strong>
              <span>相手のMATANEで、この6文字を入力してもらいます。</span>
              <button onClick={shareCode}>コードを共有する <b>↗</b></button>
            </div>
            <form className="exchange-form" onSubmit={exchange}>
              <p className="step-label">相手のコードを入力</p>
              <input value={exchangeCode} onChange={(event) => setExchangeCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" spellCheck={false} />
              <button className="primary-button" disabled={busy || exchangeCode.length < 6}>{busy ? "交換中…" : "この人と交換する"}<span>→</span></button>
            </form>
            <div className="how-it-works"><p>交換後は</p><ol><li><span>1</span>会場でMATANEを開く</li><li><span>2</span>近くの人を探すをON</li><li><span>3</span>交換済みの人だけ通知</li></ol></div>
          </section>
        )}
      </div>

      <nav className="bottom-nav" aria-label="メインメニュー">
        <button className={tab === "nearby" ? "active" : ""} onClick={() => setTab("nearby")}><span className="nav-radar" /><b>近く</b></button>
        <button className={tab === "memory" ? "active" : ""} onClick={() => setTab("memory")}><span className="nav-memory">◫</span><b>記憶</b></button>
        <button className={tab === "exchange" ? "active" : ""} onClick={() => setTab("exchange")}><span className="nav-exchange">＋</span><b>交換</b></button>
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
