"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import jsQR from "jsqr";
import QRCode from "qrcode";

type MataneUser = {
  id: string;
  publicCode: string;
  accountEmail: string | null;
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
  portraitAvailable: boolean;
  portraitMode: "openai" | "fallback" | null;
  portraitDisclaimer: string;
  portraitUpdatedAt: string | null;
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
type SettingsView = "menu" | "email" | "profile" | "logout";
type Coordinates = { latitude: number; longitude: number; accuracy: number };
type AccountIdentity = { email: string; displayName: string };

const TOKEN_KEY = "matane_device_token";
const SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2F";
const SIGN_OUT_PATH = "/signout-with-chatgpt?return_to=%2F";
const EMAIL_CHANGE_SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2F%3Femail_change%3D1";
const EMAIL_CHANGE_SIGN_OUT_PATH = "/signout-with-chatgpt?return_to=%2F%3Femail_change%3D1";
const PORTRAIT_WAITING_MESSAGES = [
  "メモの特徴を一つずつ絵にしています。少しだけお待ちください。",
  "トイレに篭って待つのも作戦です。戻るころには完成しているかも。",
  "名札を二度見するふりをしながら、のんびり待ちましょう。",
  "AIが髪型・服装・体型を慎重に描き分けています。",
  "お茶を一口どうぞ。急がせるより、メモへの忠実さを優先しています。",
  "次に話すひと言を考えている間に、ポートレートを仕上げます。",
  "会場を一周すると完成しているかもしれません。迷子にはご注意を。",
  "画像生成は文章より少しゆっくりです。この画面はそのままで大丈夫。",
] as const;

function randomPortraitWaitingMessage(previous = "") {
  const candidates = PORTRAIT_WAITING_MESSAGES.filter((message) => message !== previous);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? PORTRAIT_WAITING_MESSAGES[0];
}

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

function IdentityImages({
  name,
  avatarSrc,
  portraitSrc,
  live = false,
  compact = false,
}: {
  name: string;
  avatarSrc: string;
  portraitSrc?: string;
  live?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={`identity-images ${compact ? "is-compact" : ""} ${portraitSrc ? "has-portrait" : ""}`}>
      <PersonAvatar name={name} src={avatarSrc} className={compact ? "mini-avatar" : "avatar"} live={live} />
      {portraitSrc && (
        <span className="portrait-thumbnail">
          <Image src={portraitSrc} alt={`${name}さんのメモから作ったイメージ`} fill unoptimized sizes="64px" />
          <small>メモ</small>
        </span>
      )}
    </span>
  );
}

function exchangeCodeFromQr(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("exchange")?.trim().toUpperCase() || "";
    if (/^[A-Z0-9]{6}$/.test(code)) return code;
  } catch {
    // A plain six-character exchange code is also accepted.
  }
  const plainCode = trimmed.toUpperCase();
  return /^[A-Z0-9]{6}$/.test(plainCode) ? plainCode : "";
}

async function readJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.error || "通信に失敗しました。"));
  return body;
}

export function MataneApp({ account }: { account: AccountIdentity | null }) {
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
  const [memo, setMemo] = useState("");
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState("");
  const [exchangeCode, setExchangeCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("menu");
  const [avatarDraft, setAvatarDraft] = useState("");
  const [guestMode, setGuestMode] = useState(false);
  const [toast, setToast] = useState("");
  const [portraits, setPortraits] = useState<Record<string, { dataUrl: string; disclaimer: string; mode: "openai" | "fallback" }>>({});
  const [portraitBusyId, setPortraitBusyId] = useState<string | null>(null);
  const [portraitWaitingMessage, setPortraitWaitingMessage] = useState<string>(PORTRAIT_WAITING_MESSAGES[0]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("カメラを準備しています…");
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const memoTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoExchangeRef = useRef("");
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerFrameRef = useRef<number | null>(null);
  const portraitLoadsRef = useRef(new Set<string>());
  const portraitObjectUrlsRef = useRef(new Set<string>());
  const emailSettingsOpenedRef = useRef(false);
  const reviewerMode = user?.org.includes("JUDGE DEMO") ?? false;

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
      const nextToken = String(body.token || sessionToken);
      if (nextToken) {
        window.localStorage.setItem(TOKEN_KEY, nextToken);
        setToken(nextToken);
      }
      setUser(nextUser);
      setAvatarDraft(nextUser.avatarDataUrl);
      setContacts(body.contacts as Contact[]);
      if (nextUser.org.includes("JUDGE DEMO")) {
        setLocationActive(true);
        setLocationLabel("渋谷ソラスタコンファレンスの審査デモ");
        setTab("nearby");
      }
      if (body.restoredByEmail) setToast("メールからプロフィールを復元しました。 / Profile restored.");
      else if (body.linkedNow) setToast("メールをプロフィールに連携しました。 / Email linked.");
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

  const closeSettings = useCallback(() => {
    setAvatarDraft(user?.avatarDataUrl || "");
    setMenuOpen(false);
    setSettingsView("menu");
  }, [user?.avatarDataUrl]);

  const stopScanner = useCallback(() => {
    if (scannerFrameRef.current != null) window.cancelAnimationFrame(scannerFrameRef.current);
    scannerFrameRef.current = null;
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
    if (scannerVideoRef.current) scannerVideoRef.current.srcObject = null;
    setScannerOpen(false);
  }, []);

  useEffect(() => {
    if (!scannerOpen || !user) return;
    let cancelled = false;
    let found = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        scannerStreamRef.current = stream;
        const video = scannerVideoRef.current;
        const canvas = scannerCanvasRef.current;
        if (!video || !canvas) throw new Error("カメラ画面を準備できませんでした。");
        video.srcObject = stream;
        await video.play();
        setScannerStatus("相手のQRコードを枠の中に入れてください");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("QRコードを読み取れませんでした。");

        const scan = () => {
          if (cancelled || found) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            const scale = Math.min(1, 720 / video.videoWidth);
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
            const code = result ? exchangeCodeFromQr(result.data) : "";
            if (code === user.publicCode) {
              setScannerStatus("これは自分のQRです。相手のQRを読み取ってください");
            } else if (code) {
              found = true;
              setScannerStatus("QRを読み取りました。交換しています…");
              stopScanner();
              setBusy(true);
              performExchange(code)
                .catch((error: Error) => setToast(error.message))
                .finally(() => setBusy(false));
              return;
            }
          }
          scannerFrameRef.current = window.requestAnimationFrame(scan);
        };
        scannerFrameRef.current = window.requestAnimationFrame(scan);
      } catch (error) {
        setScannerStatus("カメラを使えませんでした。設定でカメラを許可してください。");
        setToast(error instanceof Error ? error.message : "カメラを起動できませんでした。");
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      if (scannerFrameRef.current != null) window.cancelAnimationFrame(scannerFrameRef.current);
      scannerFrameRef.current = null;
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    };
  }, [performExchange, scannerOpen, stopScanner, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(TOKEN_KEY) || "";
      if (!stored && !account) {
        setLoading(false);
        return;
      }
      if (stored) setToken(stored);
      refreshSession(stored)
        .catch(() => {
          window.localStorage.removeItem(TOKEN_KEY);
          setToken("");
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [account, refreshSession]);

  useEffect(() => {
    if (!user || emailSettingsOpenedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("email_change") !== "1") return;
    emailSettingsOpenedRef.current = true;
    params.delete("email_change");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    const timer = window.setTimeout(() => {
      setSettingsView("email");
      setMenuOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!token) return;
    for (const contact of contacts) {
      if (!contact.portraitAvailable || portraitLoadsRef.current.has(contact.contactUserId)) continue;
      portraitLoadsRef.current.add(contact.contactUserId);
      fetch(`/api/portrait?contactUserId=${encodeURIComponent(contact.contactUserId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("保存画像を取得できませんでした。");
          const objectUrl = URL.createObjectURL(await response.blob());
          portraitObjectUrlsRef.current.add(objectUrl);
          setPortraits((current) => current[contact.contactUserId] ? current : {
            ...current,
            [contact.contactUserId]: {
              dataUrl: objectUrl,
              disclaimer: contact.portraitDisclaimer,
              mode: contact.portraitMode === "openai" ? "openai" : "fallback",
            },
          });
        })
        .catch(() => portraitLoadsRef.current.delete(contact.contactUserId));
    }
  }, [contacts, token]);

  useEffect(() => () => {
    portraitObjectUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }, []);

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

  useEffect(() => {
    if (!portraitBusyId) return;
    const timer = window.setInterval(() => {
      setPortraitWaitingMessage((previous) => randomPortraitWaitingMessage(previous));
    }, 4_800);
    return () => window.clearInterval(timer);
  }, [portraitBusyId]);

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
      if (reviewerMode) {
        api("/api/nearby").then((body) => setContacts(body.contacts as Contact[])).catch(() => undefined);
        return;
      }
      if (lastCoordinates) postLocation(lastCoordinates, true).catch(() => undefined);
      else enableLocation();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api, enableLocation, lastCoordinates, locationActive, postLocation, reviewerMode, token]);

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
      setContacts((body.contacts as Contact[] | undefined) ?? []);
      const pendingCode = new URLSearchParams(window.location.search).get("exchange")?.trim().toUpperCase() || "";
      if (pendingCode && pendingCode !== createdUser.publicCode) {
        autoExchangeRef.current = pendingCode;
        await performExchange(pendingCode, nextToken);
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setTab("exchange");
        setToast(body.restoredByEmail ? "プロフィールを復元しました。 / Profile restored." : "MATANEを始めました。 / Welcome to MATANE.");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "プロフィールを作成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function startReviewerDemo() {
    setBusy(true);
    try {
      const body = await api("/api/reviewer", { method: "POST" }, "");
      const nextToken = String(body.token || "");
      const nextUser = body.user as MataneUser;
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(nextUser);
      setAvatarDraft(nextUser.avatarDataUrl);
      setContacts(body.contacts as Contact[]);
      setLocationActive(true);
      setLocationLabel("渋谷ソラスタコンファレンスの審査デモ");
      setTab("nearby");
      setToast("審査デモを準備しました。20人中10人が近くにいます。");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "審査デモを開始できませんでした。");
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
      setMenuOpen(false);
      setSettingsView("menu");
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
      setToast("特徴を保存しました。 / Features saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "特徴を保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  function openFriend(contactUserId: string) {
    setSelectedId(contactUserId);
    setEditingMemoIndex(null);
    setEditingMemoText("");
    setTab("friends");
    window.setTimeout(() => document.getElementById("friend-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function editMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || editingMemoIndex == null || !editingMemoText.trim()) return;
    setBusy(true);
    try {
      const body = await api("/api/memory", {
        method: "PATCH",
        body: JSON.stringify({ contactUserId: selectedContact.contactUserId, memoIndex: editingMemoIndex, memo: editingMemoText }),
      });
      const updated = body.contact as Contact;
      setContacts((current) => current.map((item) => item.contactUserId === updated.contactUserId ? updated : item));
      setEditingMemoIndex(null);
      setEditingMemoText("");
      setToast("メモを更新しました。 / Note updated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "メモを編集できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMemory(contact: Contact, memoIndex: number) {
    if (!window.confirm("このメモを削除しますか？ / Delete this note?")) return;
    setBusy(true);
    try {
      const body = await api("/api/memory", {
        method: "DELETE",
        body: JSON.stringify({ contactUserId: contact.contactUserId, memoIndex }),
      });
      const updated = body.contact as Contact;
      setContacts((current) => current.map((item) => item.contactUserId === updated.contactUserId ? updated : item));
      setEditingMemoIndex(null);
      setEditingMemoText("");
      setToast("メモを削除しました。 / Note deleted.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "メモを削除できませんでした。");
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
    setPortraitWaitingMessage(randomPortraitWaitingMessage());
    setPortraitBusyId(contact.contactUserId);
    try {
      const body = await api("/api/portrait", {
        method: "POST",
        body: JSON.stringify({ contactUserId: contact.contactUserId }),
      });
      const updatedContact = body.contact as Contact | null;
      if (updatedContact) {
        portraitLoadsRef.current.add(updatedContact.contactUserId);
        setContacts((current) => current.map((item) => item.contactUserId === updatedContact.contactUserId ? updatedContact : item));
      }
      setPortraits((current) => {
        const previousUrl = current[contact.contactUserId]?.dataUrl;
        if (previousUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(previousUrl);
          portraitObjectUrlsRef.current.delete(previousUrl);
        }
        return {
          ...current,
          [contact.contactUserId]: {
            dataUrl: String(body.dataUrl),
            disclaimer: String(body.disclaimer),
            mode: body.mode === "openai" ? "openai" : "fallback",
          },
        };
      });
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

  function beginScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("このブラウザではカメラを使えません。交換コードを入力してください。");
      return;
    }
    setScannerStatus("カメラを準備しています…");
    setScannerOpen(true);
  }

  function beginEmailChange() {
    window.location.assign(EMAIL_CHANGE_SIGN_OUT_PATH);
  }

  function signOutEverywhere() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.location.assign(SIGN_OUT_PATH);
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
        {!account && !guestMode && (
          <section className="auth-card">
            <p className="step-label">MATANEへようこそ</p>
            <h2>メールでログイン</h2>
            <p>登録済みのプロフィールを、シークレットモードや別端末でも復元できます。</p>
            <a className="auth-primary" href={SIGN_IN_PATH}>ChatGPTでメールを確認 <span>→</span><small>Verify email with ChatGPT</small></a>
            <div className="auth-divider"><span />または審査用にすぐ体験<span /></div>
            <button className="reviewer-entry" type="button" onClick={startReviewerDemo} disabled={busy}>
              <span>体験</span>
              <strong>{busy ? "準備中… / Preparing…" : "審査デモを開始 / Start judge demo"}</strong>
              <small>登録不要 · 友達20人 · 渋谷ソラスタに10人</small>
              <b>→</b>
            </button>
            <button className="guest-button" type="button" onClick={() => setGuestMode(true)}>ログインせず体験する / Continue as guest</button>
            <small className="auth-footnote">MATANEにパスワードは保存しません。確認済みメールだけをプロフィールに紐づけます。</small>
          </section>
        )}
        {(account || guestMode) && (
          <form className="onboarding-card" onSubmit={createProfile}>
            <p className="step-label">あなたのプロフィール</p>
            {account ? (
              <div className="verified-account"><span>✓</span><p><strong>メール確認済み / VERIFIED</strong>{account.email}</p></div>
            ) : (
              <div className="guest-account"><p>ゲスト利用中。別端末では復元できません。</p><a href={SIGN_IN_PATH}>メールでログイン / Sign in</a></div>
            )}
            <label className="avatar-upload">
              <PersonAvatar name="あなた" src={avatarDraft} className="avatar-preview" />
              <span><strong>アイコン画像</strong><small>Profile photo · Optional</small></span>
              <b>選ぶ / Choose</b>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
            </label>
            <label>名前 / Name<input name="name" required placeholder="山田 花子" defaultValue={account && !account.displayName.includes("@") ? account.displayName : ""} autoComplete="name" /></label>
            <label>ふりがな / Reading <small>任意 / Optional</small><input name="reading" placeholder="やまだ はなこ" /></label>
            <label>所属 / Organization<input name="org" placeholder="OpenAI Build Week" autoComplete="organization" /></label>
            <button className="primary-button" disabled={busy}>{busy ? "作成中… / Creating…" : "MATANEをはじめる / Get started"}<span>→</span></button>
            <p className="fine-print">プロフィールは交換した相手にだけ表示されます。<br />Only people you exchange with can see it.</p>
          </form>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-wordmark">MATANE <span>またね</span></p>
          <p className="header-caption">{user.name}さん</p>
        </div>
        <div className="header-actions">
          <button className={`status-pill ${locationActive ? "is-live" : ""}`} onClick={locationActive ? disableLocation : enableLocation}>
            <span /> {locationActive ? "位置共有中" : "位置共有OFF"}
          </button>
          <button
            className={`menu-button ${menuOpen ? "is-open" : ""}`}
            onClick={() => { setAvatarDraft(user.avatarDataUrl); setSettingsView("menu"); setMenuOpen(true); }}
            aria-label="メニューを開く / Open menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      <div className="app-content">
        {tab === "nearby" && (
          <section className="screen nearby-screen">
            {reviewerMode && (
              <div className="reviewer-demo-guide">
                <span>審査デモ</span>
                <div><strong>渋谷ソラスタで再会するシナリオ</strong><small>20人と交換済み。そのうち特徴の異なる10人が会場にいます。友達を押してメモと想像ポートレートを試してください。</small></div>
                <b>10 / 20</b>
              </div>
            )}
            <div className="hero-panel">
              <h1>会場モード <small>Venue mode</small></h1>
              <p>{locationActive ? `${nearbyContacts.length}人が近くにいます。${locationLabel}` : "この会場にいる間だけ、位置情報を1時間共有します。座標は友達にも表示されません。"}</p>
              <button className="radar-button" onClick={locationActive ? disableLocation : enableLocation}>
                <span className="location-mark" aria-hidden="true">⌖</span>
                <strong>{locationActive ? "位置共有を止める" : "1時間だけ位置共有する"}</strong>
                <small>{locationActive ? "別タブ中は更新が遅くなる場合があります" : "位置情報の許可が必要です"}</small>
              </button>
            </div>

            <div className="section-heading">
              <div><h2>近くにいる友達 <small>Friends nearby</small></h2></div>
              <span>{nearbyContacts.length}人</span>
            </div>

            {nearbyContacts.length ? (
              <div className="nearby-list">
                {nearbyContacts.map((contact) => (
                  <button type="button" className={`person-card ${contact.alertLevel === "caution" ? "is-caution" : ""}`} key={contact.contactUserId} onClick={() => openFriend(contact.contactUserId)}>
                    <IdentityImages name={contact.name} avatarSrc={contact.avatarDataUrl} portraitSrc={portraits[contact.contactUserId]?.dataUrl} live />
                    <div className="person-main">
                      <div className="person-title">
                        <div><h3>{contact.name}</h3><p>{contact.reading && `${contact.reading} · `}{contact.org || "所属未登録 / No organization"}</p></div>
                        <span className="distance">{contact.distanceMeters ?? "—"}m</span>
                      </div>
                      <div className="memory-preview">
                        <span>{contact.memos.length ? contact.memos[contact.memos.length - 1].text : "メモはまだありません / No notes yet"}</span>
                      </div>
                      <span className="person-link">
                        {contact.alertLevel === "caution" ? "注意・メモを見る / View caution & notes" : "メモ・画像を見る / View notes & image"}<span>→</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>{locationActive ? "友達を探しています / Searching…" : "探索を始めると、ここに表示されます"}</h3>
                <p>実機が1台でも、体験モードで再会通知を試せます。 / Try with one phone.</p>
                <button className="secondary-button" onClick={addDemo} disabled={busy}>{busy ? "準備中…" : "30秒で体験 / Try demo"}</button>
              </div>
            )}

            <p className="privacy-strip">交換していない人は表示されません。位置情報は1時間で自動的に切れます。<br /><small>Only exchanged friends appear. Location expires in one hour.</small></p>
          </section>
        )}

        {tab === "friends" && (
          <section className="screen memory-screen">
            <div className="screen-intro"><h1>友達 <small>Friends</small></h1><span>{contacts.length}人</span></div>
            {!contacts.length ? (
              <div className="empty-state compact"><h3>まだ友達がいません / No friends yet</h3><p>QRか交換コードで一度だけ交換しましょう。</p><button className="secondary-button" onClick={() => setTab("exchange")}>交換する / Exchange</button></div>
            ) : (
              <div className="contact-grid">
                {contacts.map((contact) => (
                  <button className={`contact-row ${selectedId === contact.contactUserId ? "is-selected" : ""}`} key={contact.contactUserId} onClick={() => openFriend(contact.contactUserId)}>
                    <IdentityImages name={contact.name} avatarSrc={contact.avatarDataUrl} portraitSrc={portraits[contact.contactUserId]?.dataUrl} compact />
                    <span className="contact-copy"><strong>{contact.name}</strong><small>{contact.reading && `${contact.reading} · `}{contact.org || "所属未登録 / No organization"}</small><span>{contact.memos.length ? `${contact.memos.length}件のメモ / ${contact.memos.length} notes` : "メモを追加 / Add a note"}</span></span>
                    <b>›</b>
                  </button>
                ))}
              </div>
            )}

            {selectedContact && (
              <div className="memory-editor" id="friend-detail">
                <div className="editor-header"><PersonAvatar name={selectedContact.name} src={selectedContact.avatarDataUrl} className="avatar large" /><div><h2>{selectedContact.name}</h2><span>{selectedContact.reading && `${selectedContact.reading} · `}{selectedContact.org}</span></div><button onClick={() => setSelectedId(null)} aria-label="閉じる / Close">×</button></div>
                <section className="raw-memos" aria-label="入力したメモ原文">
                  <div className="raw-memos-heading"><div><h3>メモ <small>Notes</small></h3></div><span>{selectedContact.memos.length}件</span></div>
                  {selectedContact.memos.length ? (
                    <div className="raw-memo-list">
                      {selectedContact.memos.map((item, index) => (
                        <article className="raw-memo-card" key={`${item.date}-${index}`}>
                          {editingMemoIndex === index ? (
                            <form className="memo-edit-form" onSubmit={editMemory}>
                              <label htmlFor={`edit-memo-${index}`}>メモを編集 / Edit note</label>
                              <textarea id={`edit-memo-${index}`} value={editingMemoText} onChange={(event) => setEditingMemoText(event.target.value)} rows={4} required autoFocus />
                              <div><button type="button" onClick={() => { setEditingMemoIndex(null); setEditingMemoText(""); }}>キャンセル / Cancel</button><button type="submit" disabled={busy || !editingMemoText.trim()}>保存 / Save</button></div>
                            </form>
                          ) : (
                            <>
                              <time dateTime={item.date}>{item.date}</time>
                              <p>{item.text}</p>
                              <div className="memo-actions"><button type="button" onClick={() => { setEditingMemoIndex(index); setEditingMemoText(item.text); }}>編集 / Edit</button><button type="button" onClick={() => deleteMemory(selectedContact, index)} disabled={busy}>削除 / Delete</button></div>
                            </>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="no-raw-memos">まだメモはありません。下の欄から特徴を保存しましょう。<br />No notes yet — add one below.</p>
                  )}
                </section>
                <section className="portrait-studio" aria-label="メモから作るイメージ">
                  <div className="portrait-heading"><div><h3>メモから作るイメージ</h3><small>Image imagined from your notes</small></div></div>
                  {portraits[selectedContact.contactUserId] ? (
                    <div className="portrait-result">
                      <Image src={portraits[selectedContact.contactUserId].dataUrl} alt={`${selectedContact.name}さんのメモから作ったAI想像ポートレート`} fill unoptimized sizes="260px" />
                      <span>メモから生成</span>
                    </div>
                  ) : (
                    <div className="portrait-placeholder"><span>{initials(selectedContact.name)}</span></div>
                  )}
                  {portraitBusyId === selectedContact.contactUserId && (
                    <div className="portrait-waiting" role="status" aria-live="polite">
                      <span className="portrait-waiting-mark" aria-hidden="true"><i /><b>?</b></span>
                      <div>
                        <strong>画像を作成中です</strong>
                        <p>{portraitWaitingMessage}</p>
                        <small>少し時間がかかります。この画面を開いたままお待ちください。</small>
                      </div>
                    </div>
                  )}
                  <p className="portrait-hint">保存したメモ原文をもとに生成します。性別・年代・体型・服・髪型を具体的に書くほど忠実になります。<br />Generated from your original notes.</p>
                  <button
                    type="button"
                    className="portrait-button"
                    onClick={() => generatePortrait(selectedContact)}
                    disabled={portraitBusyId === selectedContact.contactUserId || !selectedContact.memos.length}
                  >
                    {portraitBusyId === selectedContact.contactUserId ? "画像を作成中… / Generating…" : portraits[selectedContact.contactUserId] ? "もう一度作る / Regenerate" : "イメージを作る / Create image"}
                  </button>
                  <small>{portraits[selectedContact.contactUserId]?.disclaimer || "本人の顔を再現・特定するものではありません。"}</small>
                </section>
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
                    <button type="button" onClick={() => { memoTextareaRef.current?.focus(); setToast("キーボードの🎙を押すと、話した内容がリアルタイム表示されます。 / Tap your keyboard mic."); }}>🎙 キーボード標準音声入力</button>
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
                  <button className="primary-button" disabled={busy || !memo.trim()}>{busy ? "保存中… / Saving…" : "特徴を保存する / Save features"}<span>→</span></button>
                </form>
              </div>
            )}
          </section>
        )}

        {tab === "exchange" && (
          <section className="screen exchange-screen">
            <div className="screen-intro"><h1>友達と交換 <small>Exchange</small></h1></div>
            <button type="button" className="camera-scan-button" onClick={beginScanner} disabled={busy}>
              <span aria-hidden="true">▣</span>
              <span><strong>カメラで相手のQRを読む</strong><small>Scan their QR code</small></span>
              <b>→</b>
            </button>
            {scannerOpen && (
              <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="QRコードをカメラで読み取る">
                <section className="camera-scanner">
                  <div className="camera-scanner-heading"><div><h2>相手のQRを読む</h2><small>Scan their QR code</small></div><button type="button" onClick={stopScanner} aria-label="カメラを閉じる">×</button></div>
                  <div className="camera-preview"><video ref={scannerVideoRef} muted playsInline /><span aria-hidden="true" /></div>
                  <canvas ref={scannerCanvasRef} hidden />
                  <p role="status">{scannerStatus}</p>
                  <button type="button" className="secondary-button" onClick={stopScanner}>閉じる / Close</button>
                </section>
              </div>
            )}
            <div className="qr-card">
              <div className="qr-heading"><p>自分のQRを相手に見せる</p></div>
              <div className="qr-frame">
                {qrDataUrl ? <Image className="qr-image" src={qrDataUrl} alt="MATANE交換用QRコード" width={360} height={360} unoptimized priority /> : <span>QRを作成中…</span>}
              </div>
              <h2>このQRを相手に見せる</h2>
              <p>読み取ると一度だけ自動交換します。<br /><small>They scan once to exchange automatically.</small></p>
              <div className="exchange-code-inline"><span>交換コード</span><strong>{user.publicCode}</strong></div>
              <button onClick={shareCode}>交換リンクを共有 / Share link <b>↗</b></button>
            </div>
            <form className="exchange-form" onSubmit={exchange}>
              <p className="step-label">QRが読めないときは交換コードを入力</p>
              <input value={exchangeCode} onChange={(event) => setExchangeCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" spellCheck={false} />
              <button className="primary-button" disabled={busy || exchangeCode.length < 6}>{busy ? "交換中… / Exchanging…" : "この人と交換 / Exchange"}<span>→</span></button>
            </form>
          </section>
        )}
      </div>

      {menuOpen && (
        <div className="menu-overlay" role="dialog" aria-modal="true" aria-label="設定" onClick={closeSettings}>
          <aside className="profile-drawer" onClick={(event) => event.stopPropagation()}>
            {settingsView === "menu" && (
              <section className="settings-home">
                <div className="settings-heading"><div><h2>設定 <small>Settings</small></h2><p>{user.name}さんのアカウント</p></div><button type="button" onClick={closeSettings} aria-label="閉じる / Close">×</button></div>
                <div className="settings-user"><PersonAvatar name={user.name} src={user.avatarDataUrl} className="avatar-preview" /><div><strong>{user.name}</strong><small>{user.org || "所属未登録"}</small></div></div>
                <div className="settings-menu-list">
                  <button type="button" onClick={() => setSettingsView("email")}><span>✉</span><div><strong>メール連携・変更</strong><small>{user.accountEmail || "メール未連携"}</small></div><b>›</b></button>
                  <button type="button" onClick={() => { setAvatarDraft(user.avatarDataUrl); setSettingsView("profile"); }}><span>○</span><div><strong>プロフィール設定</strong><small>アイコン・名前・所属</small></div><b>›</b></button>
                  <button type="button" onClick={() => setSettingsView("logout")}><span>↪</span><div><strong>ログアウト</strong><small>この端末のアカウントを終了</small></div><b>›</b></button>
                </div>
              </section>
            )}

            {settingsView === "email" && (
              <section className="settings-detail">
                <div className="settings-detail-heading"><button type="button" onClick={() => setSettingsView("menu")}>‹ 戻る</button><button type="button" onClick={closeSettings} aria-label="閉じる / Close">×</button></div>
                <h2>メール連携・変更 <small>Email</small></h2>
                <div className={`email-setting-status ${user.accountEmail ? "is-linked" : ""}`}><span>{user.accountEmail ? "✓" : "✉"}</span><div><strong>{user.accountEmail ? "連携中のメール" : "メール未連携"}</strong><small>{user.accountEmail || "別端末でも同じプロフィールを使えるようになります"}</small></div></div>
                <p>ChatGPTで確認されたメールだけを連携します。MATANEにパスワードは保存しません。</p>
                {account ? (
                  <button type="button" className="settings-primary-action" onClick={beginEmailChange}>別のメールに変更する</button>
                ) : (
                  <a className="settings-primary-action" href={EMAIL_CHANGE_SIGN_IN_PATH}>{user.accountEmail ? "メールを変更・再連携する" : "メールを連携する"}</a>
                )}
                <small className="settings-note">変更時はいったんChatGPTからログアウトし、新しいメールで確認します。</small>
              </section>
            )}

            {settingsView === "profile" && (
              <form className="profile-editor" onSubmit={updateProfile}>
                <div className="settings-detail-heading"><button type="button" onClick={() => { setAvatarDraft(user.avatarDataUrl); setSettingsView("menu"); }}>‹ 戻る</button><button type="button" onClick={closeSettings} aria-label="閉じる / Close">×</button></div>
                <div className="profile-editor-heading"><div><h2>プロフィール設定 <small>Profile</small></h2></div></div>
                <label className="avatar-upload"><PersonAvatar name={user.name} src={avatarDraft} className="avatar-preview" /><span><strong>アイコン画像</strong><small>Profile photo · Optional</small></span><b>変更 / Change</b><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} /></label>
                {avatarDraft && <button type="button" className="remove-avatar" onClick={() => setAvatarDraft("")}>画像を外す / Remove photo</button>}
                <label>名前 / Name<input name="name" required defaultValue={user.name} autoComplete="name" /></label>
                <label>ふりがな / Reading <small>任意 / Optional</small><input name="reading" defaultValue={user.reading} /></label>
                <label>所属 / Organization<input name="org" defaultValue={user.org} autoComplete="organization" /></label>
                <button className="primary-button" disabled={busy}>{busy ? "保存中… / Saving…" : "変更を保存 / Save changes"}<span>→</span></button>
              </form>
            )}

            {settingsView === "logout" && (
              <section className="settings-detail logout-setting">
                <div className="settings-detail-heading"><button type="button" onClick={() => setSettingsView("menu")}>‹ 戻る</button><button type="button" onClick={closeSettings} aria-label="閉じる / Close">×</button></div>
                <h2>ログアウト <small>Sign out</small></h2>
                <p>この端末のMATANEをログアウトします。メール連携済みなら、もう一度ログインして復元できます。</p>
                <button type="button" className="logout-button" onClick={signOutEverywhere}>ログアウトする / Sign out</button>
              </section>
            )}
          </aside>
        </div>
      )}

      <nav className="bottom-nav" aria-label="メインメニュー / Main menu">
        <button className={tab === "exchange" ? "active" : ""} onClick={() => setTab("exchange")}><span className="nav-exchange">↔</span><b>交換<small>Exchange</small></b></button>
        <button className={tab === "nearby" ? "active" : ""} onClick={() => setTab("nearby")}><span aria-hidden="true">⌖</span><b>近くの人<small>Nearby</small></b></button>
        <button className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}><span className="nav-memory">○</span><b>友達<small>Friends</small></b></button>
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
