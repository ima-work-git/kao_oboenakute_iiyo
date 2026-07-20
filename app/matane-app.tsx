"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  AppLanguage,
  isAppLanguage,
  LANGUAGE_OPTIONS,
  localeFor,
  translate,
  Translate,
  WAITING_MESSAGE_KEYS,
} from "./i18n";

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
  nickname: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
  tags: string[];
  memos: Array<{ date: string; text: string }>;
  facts: string[];
  visualTraits: string[];
  portraitFaceAvailable: boolean;
  portraitFullBodyAvailable: boolean;
  portraitPreviousAvailable: boolean;
  portraitPreviousUpdatedAt: string | null;
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
  exchangedAt: string;
  exchangePlaceLabel: string;
  exchangeLatitude: number | null;
  exchangeLongitude: number | null;
  createdAt: string;
  updatedAt: string;
};

type Tab = "exchange" | "nearby" | "friends";
type SettingsView = "menu" | "email" | "profile" | "logout";
type Coordinates = { latitude: number; longitude: number; accuracy: number };
type AccountIdentity = { email: string; displayName: string };
type PortraitAsset = { dataUrl: string; mode: "openai" | "fallback" };
type PortraitSet = {
  face?: PortraitAsset;
  fullBody?: PortraitAsset;
  previousFace?: PortraitAsset;
  previousFullBody?: PortraitAsset;
  disclaimer: string;
};

const TOKEN_KEY = "matane_device_token";
const LANGUAGE_KEY = "hello_again_language";
const SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2F";
const SIGN_OUT_PATH = "/signout-with-chatgpt?return_to=%2F";
const EMAIL_CHANGE_SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2F%3Femail_change%3D1";
const EMAIL_CHANGE_SIGN_OUT_PATH = "/signout-with-chatgpt?return_to=%2F%3Femail_change%3D1";
const LOCATION_VALID_MS = 60 * 60 * 1000;

function randomPortraitWaitingMessage(t: Translate, previous = "") {
  const messages = WAITING_MESSAGE_KEYS.map((key) => t(key));
  const candidates = messages.filter((message) => message !== previous);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? messages[0];
}

async function avatarFromFile(file: File, t: Translate) {
  if (!file.type.startsWith("image/")) throw new Error(t("error.imageType"));
  if (file.size > 8 * 1024 * 1024) throw new Error(t("error.imageSize"));
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(t("error.imageRead")));
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(t("error.imageProcess"));
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
  return name.replace(/\s+/g, "").slice(0, 1) || "?";
}

function singleLineMemo(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function formatExchangeTime(value: string, language: AppLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeFor(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLocationExpiry(value: number, language: AppLanguage) {
  return new Date(value).toLocaleTimeString(localeFor(language), { hour: "2-digit", minute: "2-digit" });
}

function localizeExchangePlace(label: string, t: Translate) {
  if (label === "場所は記録されていません") return t("place.none");
  if (label.includes("渋谷ソラスタ")) return t("place.shibuya");
  const coordinates = label.match(/緯度(-?[\d.]+)・経度(-?[\d.]+)付近/);
  if (coordinates) return t("place.coordinates", { lat: coordinates[1], lng: coordinates[2] });
  return label;
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
  faceSrc,
  fullBodySrc,
  t,
  live = false,
  compact = false,
}: {
  name: string;
  avatarSrc: string;
  faceSrc?: string;
  fullBodySrc?: string;
  t: Translate;
  live?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={`identity-images ${compact ? "is-compact" : ""} ${faceSrc || fullBodySrc ? "has-portrait" : ""}`}>
      <PersonAvatar name={name} src={avatarSrc} className={compact ? "mini-avatar" : "avatar"} live={live} />
      {faceSrc && (
        <span className="portrait-thumbnail is-face">
          <Image src={faceSrc} alt={t("portrait.faceAlt", { name })} fill unoptimized sizes="64px" />
          <small>{t("portrait.face")}</small>
        </span>
      )}
      {fullBodySrc && (
        <span className="portrait-thumbnail is-full-body">
          <Image src={fullBodySrc} alt={t("portrait.bodyAlt", { name })} fill unoptimized sizes="64px" />
          <small>{t("portrait.body")}</small>
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

async function readJson(response: Response, fallback: string, language: AppLanguage) {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const serverMessage = String(body.error || "");
    const message = serverMessage && (language === "ja" || !/[ぁ-んァ-ヶ一-龠]/.test(serverMessage)) ? serverMessage : fallback;
    throw new Error(message || fallback);
  }
  return body;
}

export function MataneApp({ account }: { account: AccountIdentity | null }) {
  const [language, setLanguage] = useState<AppLanguage>("ja");
  const [languageReady, setLanguageReady] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [hasLanguagePreference, setHasLanguagePreference] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<MataneUser | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<Tab>("exchange");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const [locationLabel, setLocationLabel] = useState(translate("ja", "location.none"));
  const [locationExpiresAt, setLocationExpiresAt] = useState<number | null>(null);
  const [lastCoordinates, setLastCoordinates] = useState<Coordinates | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [editingMemoIndex, setEditingMemoIndex] = useState<number | null>(null);
  const [editingMemoText, setEditingMemoText] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [exchangeCode, setExchangeCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("menu");
  const [avatarDraft, setAvatarDraft] = useState("");
  const [guestMode, setGuestMode] = useState(false);
  const [toast, setToast] = useState("");
  const [portraits, setPortraits] = useState<Record<string, PortraitSet>>({});
  const [showPreviousMemos, setShowPreviousMemos] = useState(false);
  const [portraitBusyId, setPortraitBusyId] = useState<string | null>(null);
  const [portraitWaitingMessage, setPortraitWaitingMessage] = useState<string>(translate("ja", "waiting.1"));
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState(translate("ja", "scanner.preparing"));
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
  const t = useCallback<Translate>((key, values) => translate(language, key, values), [language]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(LANGUAGE_KEY);
      if (isAppLanguage(stored)) {
        setLanguage(stored);
        setHasLanguagePreference(true);
      } else {
        setLanguagePickerOpen(true);
      }
      setLanguageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  }, [language]);

  function chooseLanguage(nextLanguage: AppLanguage) {
    const nextTranslate: Translate = (key, values) => translate(nextLanguage, key, values);
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
    setHasLanguagePreference(true);
    setLanguagePickerOpen(false);
    setPortraitWaitingMessage(nextTranslate("waiting.1"));
    setScannerStatus(nextTranslate("scanner.preparing"));
    if (locationActive && locationExpiresAt != null) {
      const time = formatLocationExpiry(locationExpiresAt, nextLanguage);
      setLocationLabel(reviewerMode
        ? nextTranslate("location.demoValidUntil", { time })
        : nextTranslate("location.validUntil", { time }));
    } else {
      setLocationLabel(nextTranslate("location.none"));
    }
  }

  const api = useCallback(
    async (path: string, init: RequestInit = {}, explicitToken?: string) => {
      const authToken = explicitToken ?? token;
      const headers = new Headers(init.headers);
      if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
      if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
      const method = init.method ?? "GET";
      const fallback = path === "/api/exchange" ? t("error.exchange")
        : path === "/api/profile" ? t("error.profileUpdate")
        : path === "/api/contact" ? t("error.nicknameSave")
        : path === "/api/alert" ? t("error.settingsUpdate")
        : path === "/api/reviewer" ? t("error.judgeStart")
        : path === "/api/demo" ? t("error.demoStart")
        : path === "/api/portrait" ? (method === "PATCH" ? t("error.portraitChoose") : t("error.portraitCreate"))
        : path === "/api/memory" ? (method === "DELETE" ? t("error.noteDelete") : method === "PATCH" ? t("error.noteEdit") : t("error.featuresSave"))
        : path === "/api/session" && method === "POST" ? t("error.profileCreate")
        : t("error.network");
      return readJson(await fetch(path, { ...init, headers }), fallback, language);
    },
    [language, t, token]
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
      const lastSeenAt = nextUser.lastSeen ? Date.parse(nextUser.lastSeen) : Number.NaN;
      const expiresAt = lastSeenAt + LOCATION_VALID_MS;
      const locationStillValid = nextUser.locationEnabled && Number.isFinite(expiresAt) && expiresAt > Date.now();
      setLocationActive(locationStillValid);
      setLocationExpiresAt(locationStillValid ? expiresAt : null);
      setLocationLabel(locationStillValid
        ? t("location.validUntil", { time: formatLocationExpiry(expiresAt, language) })
        : t("location.none"));
      if (nextUser.org.includes("JUDGE DEMO")) {
        setLocationActive(true);
        setLocationExpiresAt(expiresAt);
        setLocationLabel(t("location.demoValidUntil", { time: formatLocationExpiry(expiresAt, language) }));
        setTab("nearby");
      }
      if (body.restoredByEmail) setToast(t("toast.profileRestored"));
      else if (body.linkedNow) setToast(t("toast.emailLinked"));
    },
    [api, language, t]
  );

  const getExchangePosition = useCallback(async () => {
    if (!navigator.geolocation) return null;
    return new Promise<Coordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLastCoordinates(coordinates);
          resolve(coordinates);
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 6_000, maximumAge: 30_000 }
      );
    });
  }, []);

  const performExchange = useCallback(async (code: string, explicitToken?: string) => {
    const position = await getExchangePosition();
    const body = await api("/api/exchange", {
      method: "POST",
      body: JSON.stringify({ code, ...position }),
    }, explicitToken);
    const nextContacts = body.contacts as Contact[];
    const exchanged = body.contact as Contact | null;
    setContacts(nextContacts);
    setExchangeCode("");
    if (exchanged) {
      setSelectedId(exchanged.contactUserId);
      setNicknameDraft(exchanged.nickname);
      setMemo("");
      setTab("friends");
    }
    setToast(t("toast.exchanged"));
  }, [api, getExchangePosition, t]);

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
    const currentPublicCode = user.publicCode;
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
        if (!video || !canvas) throw new Error(t("error.cameraPrepare"));
        video.srcObject = stream;
        await video.play();
        setScannerStatus(t("scanner.aim"));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error(t("error.qrRead"));

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
            if (code === currentPublicCode) {
              setScannerStatus(t("scanner.own"));
            } else if (code) {
              found = true;
              setScannerStatus(t("scanner.found"));
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
        setScannerStatus(t("scanner.unavailable"));
        setToast(error instanceof Error ? error.message : t("error.cameraStart"));
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
  }, [performExchange, scannerOpen, stopScanner, t, user]);

  useEffect(() => {
    if (!languageReady || !hasLanguagePreference) return;
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
  }, [account, hasLanguagePreference, languageReady, refreshSession]);

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
      const kinds = [
        { kind: "face" as const, stateKey: "face" as const, available: contact.portraitFaceAvailable },
        { kind: "fullBody" as const, stateKey: "fullBody" as const, available: contact.portraitFullBodyAvailable },
        { kind: "previousFace" as const, stateKey: "previousFace" as const, available: contact.portraitPreviousAvailable },
        { kind: "previousFullBody" as const, stateKey: "previousFullBody" as const, available: contact.portraitPreviousAvailable },
      ];
      for (const { kind, stateKey, available } of kinds) {
        const loadKey = `${contact.contactUserId}:${kind}`;
        if (!available || portraitLoadsRef.current.has(loadKey)) continue;
        portraitLoadsRef.current.add(loadKey);
        fetch(`/api/portrait?contactUserId=${encodeURIComponent(contact.contactUserId)}&kind=${kind}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(async (response) => {
            if (!response.ok) throw new Error(t("error.savedImage"));
            const objectUrl = URL.createObjectURL(await response.blob());
            portraitObjectUrlsRef.current.add(objectUrl);
            setPortraits((current) => ({
              ...current,
              [contact.contactUserId]: {
                ...current[contact.contactUserId],
                [stateKey]: {
                  dataUrl: objectUrl,
                  mode: contact.portraitMode === "openai" ? "openai" : "fallback",
                },
                disclaimer: contact.portraitDisclaimer,
              },
            }));
          })
          .catch(() => portraitLoadsRef.current.delete(loadKey));
      }
    }
  }, [contacts, t, token]);

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
      setPortraitWaitingMessage((previous) => randomPortraitWaitingMessage(t, previous));
    }, 4_800);
    return () => window.clearInterval(timer);
  }, [portraitBusyId, t]);

  const postLocation = useCallback(
    async (coords: Coordinates) => {
      const body = await api("/api/location", {
        method: "POST",
        body: JSON.stringify({ ...coords, enabled: true }),
      });
      setContacts(body.contacts as Contact[]);
      const expiresAt = Date.now() + LOCATION_VALID_MS;
      setLocationActive(true);
      setLocationExpiresAt(expiresAt);
      setLocationLabel(t("location.validUntil", { time: formatLocationExpiry(expiresAt, language) }));
    },
    [api, language, t]
  );

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setLastCoordinates(coords);
      setLocationLabel(t("location.registering"));
      postLocation(coords)
        .then(() => setToast(t("location.registered", { accuracy: Math.round(coords.accuracy) })))
        .catch((error: Error) => setToast(error.message));
    },
    [postLocation, t]
  );

  const enableLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setToast(t("location.unsupported"));
      return;
    }
    setLocationLabel(t("location.checking"));
    navigator.geolocation.getCurrentPosition(onPosition, () => {
      setLocationLabel(t("location.failed"));
      setToast(t("location.permission"));
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 30_000 });
  }, [onPosition, t]);

  const disableLocation = useCallback(async () => {
    setLocationActive(false);
    setLocationExpiresAt(null);
    setLocationLabel(t("location.none"));
    try {
      const body = await api("/api/location", {
        method: "POST",
        body: JSON.stringify({ enabled: false }),
      });
      setContacts(body.contacts as Contact[]);
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("location.removeFailed"));
    }
  }, [api, t]);

  useEffect(() => {
    if (!token || !locationActive) return;
    const poll = window.setInterval(() => {
      api("/api/nearby")
        .then((body) => setContacts(body.contacts as Contact[]))
        .catch(() => undefined);
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      api("/api/nearby").then((body) => setContacts(body.contacts as Contact[])).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api, locationActive, token]);

  useEffect(() => {
    if (!locationActive || locationExpiresAt == null) return;
    const timer = window.setTimeout(() => {
      setLocationActive(false);
      setLocationExpiresAt(null);
      setLocationLabel(t("location.expired"));
    }, Math.max(0, locationExpiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [locationActive, locationExpiresAt, t]);

  const nearbyContacts = useMemo(
    () => contacts.filter((contact) => contact.nearby).sort((a, b) => {
      if (a.alertLevel !== b.alertLevel) return a.alertLevel === "caution" ? -1 : 1;
      return (a.distanceMeters ?? 9999) - (b.distanceMeters ?? 9999);
    }),
    [contacts]
  );
  const selectedContact = contacts.find((contact) => contact.contactUserId === selectedId) ?? null;
  const selectedPortrait = selectedId ? portraits[selectedId] : undefined;

  function renderMemoCard(item: { date: string; text: string }, index: number, latest = false) {
    if (!selectedContact) return null;
    return (
      <article className={`raw-memo-card ${latest ? "is-latest" : ""}`} key={`${item.date}-${index}`}>
        {editingMemoIndex === index ? (
          <form className="memo-edit-form" onSubmit={editMemory}>
            <label htmlFor={`edit-memo-${index}`}>{t("notes.edit")}</label>
            <textarea id={`edit-memo-${index}`} value={editingMemoText} onChange={(event) => setEditingMemoText(event.target.value)} rows={4} required autoFocus />
            <div><button type="button" onClick={() => { setEditingMemoIndex(null); setEditingMemoText(""); }}>{t("common.cancel")}</button><button type="submit" disabled={busy || !editingMemoText.trim()}>{t("common.save")}</button></div>
          </form>
        ) : (
          <>
            <time dateTime={item.date}>{item.date}</time>
            <p>{item.text}</p>
            <div className="memo-actions"><button type="button" onClick={() => { setEditingMemoIndex(index); setEditingMemoText(item.text); }}>{t("common.edit")}</button><button type="button" onClick={() => deleteMemory(selectedContact, index)} disabled={busy}>{t("common.delete")}</button></div>
          </>
        )}
      </article>
    );
  }

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
        setToast(body.restoredByEmail ? t("toast.profileRestored") : t("toast.welcome"));
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.profileCreate"));
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
      setLocationLabel(t("location.demoLabel"));
      setTab("nearby");
      setToast(t("toast.judgeReady"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.judgeStart"));
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
      setToast(error instanceof Error ? error.message : t("error.exchange"));
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar(file: File | undefined) {
    if (!file) return;
    try {
      setAvatarDraft(await avatarFromFile(file, t));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.imageRead"));
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
      setToast(t("toast.profileUpdated"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.profileUpdate"));
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
      setShowPreviousMemos(false);
      setToast(t("toast.featuresSaved"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.featuresSave"));
    } finally {
      setBusy(false);
    }
  }

  function openFriend(contactUserId: string) {
    const contact = contacts.find((item) => item.contactUserId === contactUserId);
    setSelectedId(contactUserId);
    setNicknameDraft(contact?.nickname || "");
    setEditingMemoIndex(null);
    setEditingMemoText("");
    setShowPreviousMemos(false);
    setTab("friends");
    window.setTimeout(() => document.getElementById("friend-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact) return;
    setBusy(true);
    try {
      const body = await api("/api/contact", {
        method: "PATCH",
        body: JSON.stringify({
          contactUserId: selectedContact.contactUserId,
          nickname: nicknameDraft,
        }),
      });
      const updated = body.contact as Contact;
      setContacts((current) => current.map((item) => item.contactUserId === updated.contactUserId ? updated : item));
      setNicknameDraft(updated.nickname);
      setToast(updated.nickname ? t("toast.nicknameSaved", { nickname: updated.nickname }) : t("toast.nicknameRemoved"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.nicknameSave"));
    } finally {
      setBusy(false);
    }
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
      setShowPreviousMemos(false);
      setToast(t("toast.noteUpdated"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.noteEdit"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteMemory(contact: Contact, memoIndex: number) {
    if (!window.confirm(t("notes.deleteConfirm"))) return;
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
      setShowPreviousMemos(false);
      setToast(t("toast.noteDeleted"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.noteDelete"));
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
      setToast(approved ? t("toast.cautionSaved") : t("toast.cautionRejected"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.settingsUpdate"));
    } finally {
      setBusy(false);
    }
  }

  async function generatePortrait(contact: Contact) {
    const existingPortrait = portraits[contact.contactUserId];
    setPortraitWaitingMessage(randomPortraitWaitingMessage(t));
    setPortraitBusyId(contact.contactUserId);
    try {
      const body = await api("/api/portrait", {
        method: "POST",
        body: JSON.stringify({ contactUserId: contact.contactUserId }),
      });
      const updatedContact = body.contact as Contact | null;
      if (updatedContact) {
        portraitLoadsRef.current.add(`${updatedContact.contactUserId}:face`);
        portraitLoadsRef.current.add(`${updatedContact.contactUserId}:fullBody`);
        if (existingPortrait?.face && existingPortrait.fullBody) {
          portraitLoadsRef.current.add(`${updatedContact.contactUserId}:previousFace`);
          portraitLoadsRef.current.add(`${updatedContact.contactUserId}:previousFullBody`);
        }
        setContacts((current) => current.map((item) => item.contactUserId === updatedContact.contactUserId ? updatedContact : item));
      }
      const generated = body.portraits as { face: PortraitAsset; fullBody: PortraitAsset };
      setPortraits((current) => {
        const previous = current[contact.contactUserId];
        for (const discardedUrl of [previous?.previousFace?.dataUrl, previous?.previousFullBody?.dataUrl]) {
          if (!discardedUrl?.startsWith("blob:")) continue;
          URL.revokeObjectURL(discardedUrl);
          portraitObjectUrlsRef.current.delete(discardedUrl);
        }
        return {
          ...current,
          [contact.contactUserId]: {
            face: generated.face,
            fullBody: generated.fullBody,
            previousFace: previous?.face,
            previousFullBody: previous?.fullBody,
            disclaimer: String(body.disclaimer),
          },
        };
      });
      setToast(generated.face.mode === "openai" ? t("toast.portraitsCreated") : t("toast.sketchesCreated"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.portraitCreate"));
    } finally {
      setPortraitBusyId(null);
    }
  }

  async function finalizePortrait(contact: Contact, choice: "current" | "previous") {
    const set = portraits[contact.contactUserId];
    if (!set?.previousFace || !set.previousFullBody) return;
    setBusy(true);
    try {
      const body = await api("/api/portrait", {
        method: "PATCH",
        body: JSON.stringify({ contactUserId: contact.contactUserId, choice }),
      });
      const updated = body.contact as Contact;
      setContacts((current) => current.map((item) => item.contactUserId === updated.contactUserId ? updated : item));
      setPortraits((current) => {
        const existing = current[contact.contactUserId];
        if (!existing) return current;
        const discarded = choice === "previous"
          ? [existing.face?.dataUrl, existing.fullBody?.dataUrl]
          : [existing.previousFace?.dataUrl, existing.previousFullBody?.dataUrl];
        for (const url of discarded) {
          if (!url?.startsWith("blob:")) continue;
          URL.revokeObjectURL(url);
          portraitObjectUrlsRef.current.delete(url);
        }
        return {
          ...current,
          [contact.contactUserId]: {
            face: choice === "previous" ? existing.previousFace : existing.face,
            fullBody: choice === "previous" ? existing.previousFullBody : existing.fullBody,
            disclaimer: existing.disclaimer,
          },
        };
      });
      setToast(choice === "previous" ? t("toast.previousChosen") : t("toast.currentChosen"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.portraitChoose"));
    } finally {
      setBusy(false);
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
      const expiresAt = Date.now() + LOCATION_VALID_MS;
      setLocationExpiresAt(expiresAt);
      setLocationLabel(t("location.demoRegistered", {
        place: lastCoordinates ? t("location.current") : t("location.tokyoStation"),
        time: formatLocationExpiry(expiresAt, language),
      }));
      setToast(t("toast.demoAdded"));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t("error.demoStart"));
    } finally {
      setBusy(false);
    }
  }

  async function shareCode() {
    if (!user) return;
    const exchangeUrl = new URL("/", window.location.origin);
    exchangeUrl.searchParams.set("exchange", user.publicCode);
    const text = t("share.text", { code: user.publicCode });
    if (navigator.share) {
      await navigator.share({ title: t("share.title"), text, url: exchangeUrl.toString() }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(exchangeUrl.toString());
      setToast(t("toast.linkCopied"));
    }
  }

  function beginScanner() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast(t("scanner.unsupported"));
      return;
    }
    setScannerStatus(t("scanner.preparing"));
    setScannerOpen(true);
  }

  function beginEmailChange() {
    window.location.assign(EMAIL_CHANGE_SIGN_OUT_PATH);
  }

  function signOutEverywhere() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.location.assign(SIGN_OUT_PATH);
  }

  function returnToTop() {
    setTab("exchange");
    setSelectedId(null);
    setMenuOpen(false);
    setSettingsView("menu");
    window.history.replaceState({}, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0];
  const languageButton = (
    <button
      type="button"
      className="language-button"
      onClick={() => setLanguagePickerOpen(true)}
      aria-label={`${t("language.current")}: ${currentLanguage.label}`}
    >
      <span>LANG</span>
      <b>{currentLanguage.shortLabel}</b>
    </button>
  );
  const languagePicker = languageReady && languagePickerOpen && (
    <div
      className="language-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-title"
      onClick={() => hasLanguagePreference && setLanguagePickerOpen(false)}
    >
      <section className="language-picker" onClick={(event) => event.stopPropagation()}>
        <div className="language-picker-heading">
          <div>
            <span>{hasLanguagePreference ? "LANGUAGE" : "LANGUAGE / 言語"}</span>
            <h2 id="language-title">{hasLanguagePreference ? t("language.title") : "言語を選択 / Choose your language"}</h2>
          </div>
          {hasLanguagePreference && <button type="button" onClick={() => setLanguagePickerOpen(false)} aria-label={t("language.close")}>×</button>}
        </div>
        {hasLanguagePreference ? (
          <p>{t("language.intro")}</p>
        ) : (
          <p className="language-first-intro">
            <span lang="ja">Hello Againで使う言語を選んでください。あとから右上のLANGで変更できます。</span>
            <span lang="en">Choose your language for Hello Again. You can change it later from LANG in the top right.</span>
          </p>
        )}
        <div className="language-options">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.code}
              className={language === option.code && hasLanguagePreference ? "is-selected" : ""}
              onClick={() => chooseLanguage(option.code)}
              lang={option.code === "zh" ? "zh-CN" : option.code}
            >
              <span>{option.shortLabel}</span><strong>{option.label}</strong>{language === option.code && hasLanguagePreference && <b>✓</b>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  if (loading) {
    return (
      <>
        <main className="loading-screen" aria-live="polite">
          <a className="brand-mark" href="/" aria-label="Hello Again home">
            <img src="/hello-again-app-icon.png" alt="" width={72} height={72} />
          </a>
          <p>{t("loading")}</p>
          {languageButton}
        </main>
        {languagePicker}
      </>
    );
  }

  if (!user) {
    return (
      <>
        <main className="onboarding-shell">
          <section className="onboarding-copy">
            <a className="wordmark" href="/" aria-label="Hello Again home">
              <img src="/hello-again-app-icon.png" alt="" width={44} height={44} />
              <span>Hello Again</span>
            </a>
            <p className="brand-tagline">{t("brand.tagline")}</p>
            <h1 className={language === "ja" ? "is-japanese-single-line" : ""}>{t("onboarding.headline").split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
            <p className="lead">{t("onboarding.lead")}</p>
            <div className="privacy-note"><span className="privacy-dot" />{t("onboarding.privacy")}</div>
          </section>
          {!account && !guestMode && (
            <section className="auth-card">
              <p className="step-label">{t("auth.welcome")}</p>
              <h2>{t("auth.emailLogin")}</h2>
              <p>{t("auth.emailDescription")}</p>
              <a className="auth-primary" href={SIGN_IN_PATH}>{t("auth.verify")} <span>→</span></a>
              <div className="auth-divider"><span />{t("auth.judgeDivider")}<span /></div>
              <button className="reviewer-entry" type="button" onClick={startReviewerDemo} disabled={busy}>
                <span>{t("auth.experience")}</span>
                <strong>{busy ? t("common.preparing") : t("auth.judgeStart")}</strong>
                <small>{t("auth.judgeMeta")}</small>
                <b>→</b>
              </button>
              <button className="guest-button" type="button" onClick={() => setGuestMode(true)}>{t("auth.guest")}</button>
              <small className="auth-footnote">{t("auth.noPassword")}</small>
            </section>
          )}
          {(account || guestMode) && (
            <form className="onboarding-card" onSubmit={createProfile}>
              <p className="step-label">{t("profile.yours")}</p>
              {account ? (
                <div className="verified-account"><span>✓</span><p><strong>{t("profile.verified")}</strong>{account.email}</p></div>
              ) : (
                <div className="guest-account"><p>{t("profile.guest")}</p><a href={SIGN_IN_PATH}>{t("profile.signIn")}</a></div>
              )}
              <label className="avatar-upload">
                <PersonAvatar name={t("profile.you")} src={avatarDraft} className="avatar-preview" />
                <span><strong>{t("profile.photo")}</strong><small>{t("common.optional")}</small></span>
                <b>{t("profile.choose")}</b>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
              </label>
              <label>{t("profile.name")}<input name="name" required placeholder="Alex Kim" defaultValue={account && !account.displayName.includes("@") ? account.displayName : ""} autoComplete="name" /></label>
              <label>{t("profile.reading")} <small>{t("common.optional")}</small><input name="reading" placeholder="Alex Kim" /></label>
              <label>{t("profile.organization")}<input name="org" placeholder="OpenAI Build Week" autoComplete="organization" /></label>
              <button className="primary-button" disabled={busy}>{busy ? t("profile.creating") : t("profile.create")}<span>→</span></button>
              <p className="fine-print">{t("profile.visibility")}</p>
            </form>
          )}
          <div className="onboarding-language">{languageButton}</div>
          {toast && <div className="toast" role="status">{toast}</div>}
        </main>
        {languagePicker}
      </>
    );
  }

  return (
    <>
    <main className="app-shell">
      <header className="app-header">
        <div className="app-brand-area">
          <a className="app-brand-link" href="/" onClick={(event) => { event.preventDefault(); returnToTop(); }} aria-label={`${t("nav.exchange")} — Hello Again`}>
            <img src="/hello-again-app-icon.png" alt="" width={38} height={38} />
            <span className="app-wordmark">Hello Again</span>
          </a>
          <p className="header-caption">{t("header.user", { name: user.name })}</p>
        </div>
        <div className="header-actions">
          {languageButton}
          <button className={`status-pill ${locationActive ? "is-live" : ""}`} onClick={locationActive ? disableLocation : enableLocation}>
            <span /> {locationActive ? t("header.locationOn") : t("header.locationOff")}
          </button>
          <button
            className={`menu-button ${menuOpen ? "is-open" : ""}`}
            onClick={() => { setAvatarDraft(user.avatarDataUrl); setSettingsView("menu"); setMenuOpen(true); }}
            aria-label={t("header.openMenu")}
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
                <span>{t("nearby.judge")}</span>
                <div><strong>{t("nearby.judgeTitle")}</strong><small>{t("nearby.judgeBody")}</small></div>
                <b>10 / 20</b>
              </div>
            )}
            <div className="hero-panel">
              <h1>{t("nearby.title")}</h1>
              <p>{locationActive
                ? t("nearby.activeDescription", { count: nearbyContacts.length, location: locationLabel })
                : t("nearby.inactiveDescription")}</p>
              <button className="radar-button" onClick={enableLocation}>
                <span className="location-mark" aria-hidden="true">⌖</span>
                <strong>{locationActive ? t("nearby.update") : t("nearby.register")}</strong>
                <small>{locationActive ? t("nearby.overwrite") : t("nearby.noTracking")}</small>
              </button>
              {locationActive && <button type="button" className="location-remove-button" onClick={disableLocation}>{t("nearby.remove")}</button>}
            </div>

            <div className="section-heading">
              <div><h2>{t("nearby.friends")}</h2></div>
              <span>{t("common.personCount", { count: nearbyContacts.length })}</span>
            </div>

            {nearbyContacts.length ? (
              <div className="nearby-list">
                {nearbyContacts.map((contact) => (
                  <button type="button" className={`person-card ${contact.alertLevel === "caution" ? "is-caution" : ""}`} key={contact.contactUserId} onClick={() => openFriend(contact.contactUserId)}>
                    <IdentityImages name={contact.name} avatarSrc={contact.avatarDataUrl} faceSrc={portraits[contact.contactUserId]?.face?.dataUrl} fullBodySrc={portraits[contact.contactUserId]?.fullBody?.dataUrl} t={t} live />
                    <div className="person-main">
                      <div className="person-title">
                        <div><h3>{contact.name}{contact.nickname && <em>{contact.nickname}</em>}</h3><p>{contact.reading && `${contact.reading} · `}{contact.org || t("nearby.noOrganization")}</p></div>
                        <span className="distance">{contact.distanceMeters ?? "—"}m</span>
                      </div>
                      <div className="memory-preview">
                        <span>{contact.memos.length ? singleLineMemo(contact.memos[contact.memos.length - 1].text) : t("nearby.noNotes")}</span>
                      </div>
                      <span className="person-link">
                        {contact.alertLevel === "caution" ? t("nearby.cautionLink") : t("nearby.detailLink")}<span>→</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>{locationActive ? t("nearby.searching") : t("nearby.registerPrompt")}</h3>
                <p>{t("nearby.demoDescription")}</p>
                <button className="secondary-button" onClick={addDemo} disabled={busy}>{busy ? t("common.preparing") : t("nearby.demoButton")}</button>
              </div>
            )}

            <p className="privacy-strip">{t("nearby.privacy")}</p>
          </section>
        )}

        {tab === "friends" && (
          <section className="screen memory-screen">
            <div className="screen-intro"><h1>{t("friends.title")}</h1><span>{t("common.personCount", { count: contacts.length })}</span></div>
            {!contacts.length ? (
              <div className="empty-state compact"><h3>{t("friends.empty")}</h3><p>{t("friends.emptyDescription")}</p><button className="secondary-button" onClick={() => setTab("exchange")}>{t("friends.exchange")}</button></div>
            ) : (
              <div className="contact-grid">
                {contacts.map((contact) => (
                  <button className={`contact-row ${selectedId === contact.contactUserId ? "is-selected" : ""}`} key={contact.contactUserId} onClick={() => openFriend(contact.contactUserId)}>
                    <IdentityImages name={contact.name} avatarSrc={contact.avatarDataUrl} faceSrc={portraits[contact.contactUserId]?.face?.dataUrl} fullBodySrc={portraits[contact.contactUserId]?.fullBody?.dataUrl} t={t} compact />
                    <span className="contact-copy">
                      <strong>{contact.name}{contact.nickname && <em>{contact.nickname}</em>}</strong>
                      <small>{contact.reading && `${contact.reading} · `}{contact.org || t("nearby.noOrganization")}</small>
                      <span className="list-memo">{contact.memos.length ? singleLineMemo(contact.memos[contact.memos.length - 1].text) : t("nearby.noNotes")}</span>
                      <small className="exchange-summary">{t("friends.exchangeSummary", { time: formatExchangeTime(contact.exchangedAt, language), place: localizeExchangePlace(contact.exchangePlaceLabel, t) })}</small>
                    </span>
                    <b>›</b>
                  </button>
                ))}
              </div>
            )}

            {selectedContact && (
              <div className="memory-editor" id="friend-detail">
                <div className="editor-header"><PersonAvatar name={selectedContact.name} src={selectedContact.avatarDataUrl} className="avatar large" /><div><div className="contact-name-line"><h2>{selectedContact.name}</h2>{selectedContact.nickname && <b>{selectedContact.nickname}</b>}</div><span>{selectedContact.reading && `${selectedContact.reading} · `}{selectedContact.org}</span></div><button onClick={() => { setSelectedId(null); setShowPreviousMemos(false); }} aria-label={t("common.close")}>×</button></div>
                <form className="nickname-editor" onSubmit={saveNickname}>
                  <label htmlFor="friend-nickname"><span>{t("friend.privateNickname")}</span><input id="friend-nickname" value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} maxLength={30} placeholder={t("friend.nicknamePlaceholder")} /></label>
                  <button type="submit" disabled={busy || nicknameDraft.trim() === selectedContact.nickname}>{t("common.save")}</button>
                </form>
                <section className="exchange-history" aria-label={t("friend.exchangeHistory")}>
                  <div><span aria-hidden="true">↔</span><p><strong>{t("friend.exchangedAt", { time: formatExchangeTime(selectedContact.exchangedAt, language) })}</strong><small>{localizeExchangePlace(selectedContact.exchangePlaceLabel, t)}</small></p></div>
                  {selectedContact.exchangeLatitude != null && selectedContact.exchangeLongitude != null && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${selectedContact.exchangeLatitude},${selectedContact.exchangeLongitude}`} target="_blank" rel="noreferrer">{t("friend.map")}</a>
                  )}
                </section>
                <section className="portrait-studio" aria-label={t("portrait.title")}>
                  <div className="portrait-heading"><div><h3>{t("portrait.title")}</h3><small>{t("portrait.subtitle")}</small></div>{selectedPortrait?.previousFace && <span>{t("portrait.currentCandidate")}</span>}</div>
                  <div className="portrait-pair">
                    <div className="portrait-option">
                      <p>{t("portrait.face")}</p>
                      {selectedPortrait?.face ? (
                        <div className="portrait-result">
                          <Image src={selectedPortrait.face.dataUrl} alt={t("portrait.faceAlt", { name: selectedContact.name })} fill unoptimized sizes="220px" />
                        </div>
                      ) : (
                        <div className="portrait-placeholder"><span>{initials(selectedContact.name)}</span></div>
                      )}
                    </div>
                    <div className="portrait-option">
                      <p>{t("portrait.body")}</p>
                      {selectedPortrait?.fullBody ? (
                        <div className="portrait-result">
                          <Image src={selectedPortrait.fullBody.dataUrl} alt={t("portrait.bodyAlt", { name: selectedContact.name })} fill unoptimized sizes="220px" />
                        </div>
                      ) : (
                        <div className="portrait-placeholder is-full-body"><span>{t("portrait.body")}</span></div>
                      )}
                    </div>
                  </div>
                  {selectedContact.portraitPreviousAvailable && (
                    <div className="portrait-comparison">
                      <div className="portrait-comparison-heading"><strong>{t("portrait.compare")}</strong><small>{t("portrait.chooseFinal")}</small></div>
                      {selectedPortrait?.previousFace && selectedPortrait.previousFullBody ? (
                        <>
                          <div className="portrait-pair is-previous">
                            <div className="portrait-option"><p>{t("portrait.previousFace")}</p><div className="portrait-result"><Image src={selectedPortrait.previousFace.dataUrl} alt={t("portrait.previousFace")} fill unoptimized sizes="220px" /></div></div>
                            <div className="portrait-option"><p>{t("portrait.previousBody")}</p><div className="portrait-result"><Image src={selectedPortrait.previousFullBody.dataUrl} alt={t("portrait.previousBody")} fill unoptimized sizes="220px" /></div></div>
                          </div>
                          <div className="portrait-choice-actions">
                            <button type="button" onClick={() => finalizePortrait(selectedContact, "previous")} disabled={busy}>{t("portrait.restorePrevious")}</button>
                            <button type="button" onClick={() => finalizePortrait(selectedContact, "current")} disabled={busy}>{t("portrait.useCurrent")}</button>
                          </div>
                        </>
                      ) : <p className="portrait-history-loading">{t("portrait.loadingPrevious")}</p>}
                    </div>
                  )}
                  {portraitBusyId === selectedContact.contactUserId && (
                    <div className="portrait-waiting" role="status" aria-live="polite">
                      <span className="portrait-waiting-mark" aria-hidden="true"><i /><b>?</b></span>
                      <div>
                        <strong>{t("portrait.generatingTitle")}</strong>
                        <p>{portraitWaitingMessage}</p>
                        <small>{t("portrait.waitingNote")}</small>
                      </div>
                    </div>
                  )}
                  <p className="portrait-hint">{t("portrait.hint")}</p>
                  <button
                    type="button"
                    className="portrait-button"
                    onClick={() => generatePortrait(selectedContact)}
                    disabled={portraitBusyId === selectedContact.contactUserId || !selectedContact.memos.length}
                  >
                    {portraitBusyId === selectedContact.contactUserId ? t("portrait.generating") : portraits[selectedContact.contactUserId]?.face && portraits[selectedContact.contactUserId]?.fullBody ? t("portrait.regenerate") : t("portrait.create")}
                  </button>
                  <small>{portraits[selectedContact.contactUserId]?.disclaimer && language === "ja" ? portraits[selectedContact.contactUserId]?.disclaimer : t("portrait.disclaimer")}</small>
                </section>
                <section className="memory-notes-panel" aria-label={t("notes.title")}>
                  <div className="memory-notes-heading"><div><h3>{t("notes.title")}</h3><p>{t("notes.latest")}</p></div><span>{t("common.itemCount", { count: selectedContact.memos.length })}</span></div>
                  {selectedContact.memos.length ? (
                    renderMemoCard(selectedContact.memos[selectedContact.memos.length - 1], selectedContact.memos.length - 1, true)
                  ) : (
                    <p className="no-raw-memos">{t("notes.empty")}</p>
                  )}
                  {selectedContact.memos.length > 1 && (
                    <button type="button" className="previous-memos-toggle" onClick={() => setShowPreviousMemos((current) => !current)} aria-expanded={showPreviousMemos}>
                      {showPreviousMemos ? t("notes.closePrevious") : t("notes.showPrevious", { count: selectedContact.memos.length - 1 })}<span>{showPreviousMemos ? "⌃" : "⌄"}</span>
                    </button>
                  )}
                  {showPreviousMemos && selectedContact.memos.length > 1 && (
                    <div className="previous-memo-list">
                      <h4>{t("notes.previous")}</h4>
                      {selectedContact.memos.slice(0, -1).map((item, index) => renderMemoCard(item, index))}
                    </div>
                  )}
                  <div className="memo-compose">
                    <h3>{t("notes.add")}</h3>
                    <form onSubmit={saveMemory}>
                      <div className="dictation-row">
                        <label htmlFor="friend-memo">{t("notes.question")}</label>
                        <button type="button" onClick={() => { memoTextareaRef.current?.focus(); setToast(t("notes.dictationToast")); }}>{t("notes.keyboardDictation")}</button>
                      </div>
                      <textarea
                        id="friend-memo"
                        ref={memoTextareaRef}
                        value={memo}
                        onChange={(event) => setMemo(event.target.value)}
                        placeholder={t("notes.placeholder")}
                        rows={5}
                        inputMode="text"
                        autoCapitalize="sentences"
                        required
                      />
                      <p className="dictation-help">{t("notes.dictationHelp")}</p>
                      <button className="primary-button" disabled={busy || !memo.trim()}>{busy ? t("common.saving") : t("notes.saveFeatures")}<span>→</span></button>
                    </form>
                  </div>
                  <button
                    type="button"
                    className={`fear-toggle ${selectedContact.alertLevel === "caution" ? "is-active" : ""}`}
                    onClick={() => decideAlert(selectedContact, selectedContact.alertLevel !== "caution")}
                    disabled={busy}
                  >
                    <span>{selectedContact.alertLevel === "caution" ? "!" : "○"}</span>
                    <b>{selectedContact.alertLevel === "caution" ? t("caution.remove") : t("caution.add")}</b>
                    <small>{t("caution.private")}</small>
                  </button>
                </section>
              </div>
            )}
          </section>
        )}

        {tab === "exchange" && (
          <section className="screen exchange-screen">
            <div className="screen-intro"><h1>{t("exchange.title")}</h1></div>
            <p className="exchange-record-note">{t("exchange.locationNote")}</p>
            <button type="button" className="camera-scan-button" onClick={beginScanner} disabled={busy}>
              <span aria-hidden="true">▣</span>
              <span><strong>{t("exchange.scan")}</strong></span>
              <b>→</b>
            </button>
            {scannerOpen && (
              <div className="camera-overlay" role="dialog" aria-modal="true" aria-label={t("exchange.scanDialog")}>
                <section className="camera-scanner">
                  <div className="camera-scanner-heading"><div><h2>{t("exchange.scanTitle")}</h2></div><button type="button" onClick={stopScanner} aria-label={t("common.close")}>×</button></div>
                  <div className="camera-preview"><video ref={scannerVideoRef} muted playsInline /><span aria-hidden="true" /></div>
                  <canvas ref={scannerCanvasRef} hidden />
                  <p role="status">{scannerStatus}</p>
                  <button type="button" className="secondary-button" onClick={stopScanner}>{t("common.close")}</button>
                </section>
              </div>
            )}
            <div className="qr-card">
              <div className="qr-heading"><p>{t("exchange.showQr")}</p></div>
              <div className="qr-frame">
                {qrDataUrl ? <Image className="qr-image" src={qrDataUrl} alt={t("exchange.qrAlt")} width={360} height={360} unoptimized priority /> : <span>{t("exchange.qrCreating")}</span>}
              </div>
              <div className="exchange-code-inline"><span>{t("exchange.code")}</span><strong>{user.publicCode}</strong></div>
              <button onClick={shareCode}>{t("exchange.share")} <b>↗</b></button>
            </div>
            <form className="exchange-form" onSubmit={exchange}>
              <p className="step-label">{t("exchange.manual")}</p>
              <input value={exchangeCode} onChange={(event) => setExchangeCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" spellCheck={false} />
              <button className="primary-button" disabled={busy || exchangeCode.length < 6}>{busy ? t("exchange.exchanging") : t("exchange.submit")}<span>→</span></button>
            </form>
          </section>
        )}
      </div>

      {menuOpen && (
        <div className="menu-overlay" role="dialog" aria-modal="true" aria-label={t("settings.title")} onClick={closeSettings}>
          <aside className="profile-drawer" onClick={(event) => event.stopPropagation()}>
            {settingsView === "menu" && (
              <section className="settings-home">
                <div className="settings-heading"><div><h2>{t("settings.title")}</h2><p>{t("settings.account", { name: user.name })}</p></div><button type="button" onClick={closeSettings} aria-label={t("common.close")}>×</button></div>
                <div className="settings-user"><PersonAvatar name={user.name} src={user.avatarDataUrl} className="avatar-preview" /><div><strong>{user.name}</strong><small>{user.org || t("nearby.noOrganization")}</small></div></div>
                <div className="settings-menu-list">
                  <button type="button" onClick={() => setSettingsView("email")}><span>✉</span><div><strong>{t("settings.email")}</strong><small>{user.accountEmail || t("settings.emailMissing")}</small></div><b>›</b></button>
                  <button type="button" onClick={() => { setAvatarDraft(user.avatarDataUrl); setSettingsView("profile"); }}><span>○</span><div><strong>{t("settings.profile")}</strong><small>{t("settings.profileSummary")}</small></div><b>›</b></button>
                  <button type="button" onClick={() => setSettingsView("logout")}><span>↪</span><div><strong>{t("settings.logout")}</strong><small>{t("settings.logoutSummary")}</small></div><b>›</b></button>
                </div>
              </section>
            )}

            {settingsView === "email" && (
              <section className="settings-detail">
                <div className="settings-detail-heading"><button type="button" onClick={() => setSettingsView("menu")}>‹ {t("common.back")}</button><button type="button" onClick={closeSettings} aria-label={t("common.close")}>×</button></div>
                <h2>{t("settings.email")}</h2>
                <div className={`email-setting-status ${user.accountEmail ? "is-linked" : ""}`}><span>{user.accountEmail ? "✓" : "✉"}</span><div><strong>{user.accountEmail ? t("settings.linkedEmail") : t("settings.emailMissing")}</strong><small>{user.accountEmail || t("settings.emailBenefit")}</small></div></div>
                <p>{t("settings.emailDescription")}</p>
                {account ? (
                  <button type="button" className="settings-primary-action" onClick={beginEmailChange}>{t("settings.changeEmail")}</button>
                ) : (
                  <a className="settings-primary-action" href={EMAIL_CHANGE_SIGN_IN_PATH}>{user.accountEmail ? t("settings.relinkEmail") : t("settings.linkEmail")}</a>
                )}
                <small className="settings-note">{t("settings.emailNote")}</small>
              </section>
            )}

            {settingsView === "profile" && (
              <form className="profile-editor" onSubmit={updateProfile}>
                <div className="settings-detail-heading"><button type="button" onClick={() => { setAvatarDraft(user.avatarDataUrl); setSettingsView("menu"); }}>‹ {t("common.back")}</button><button type="button" onClick={closeSettings} aria-label={t("common.close")}>×</button></div>
                <div className="profile-editor-heading"><div><h2>{t("settings.profile")}</h2></div></div>
                <label className="avatar-upload"><PersonAvatar name={user.name} src={avatarDraft} className="avatar-preview" /><span><strong>{t("profile.photo")}</strong><small>{t("common.optional")}</small></span><b>{t("profile.change")}</b><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} /></label>
                {avatarDraft && <button type="button" className="remove-avatar" onClick={() => setAvatarDraft("")}>{t("profile.removePhoto")}</button>}
                <label>{t("profile.name")}<input name="name" required defaultValue={user.name} autoComplete="name" /></label>
                <label>{t("profile.reading")} <small>{t("common.optional")}</small><input name="reading" defaultValue={user.reading} /></label>
                <label>{t("profile.organization")}<input name="org" defaultValue={user.org} autoComplete="organization" /></label>
                <button className="primary-button" disabled={busy}>{busy ? t("common.saving") : t("settings.saveChanges")}<span>→</span></button>
              </form>
            )}

            {settingsView === "logout" && (
              <section className="settings-detail logout-setting">
                <div className="settings-detail-heading"><button type="button" onClick={() => setSettingsView("menu")}>‹ {t("common.back")}</button><button type="button" onClick={closeSettings} aria-label={t("common.close")}>×</button></div>
                <h2>{t("settings.logout")}</h2>
                <p>{t("settings.logoutDescription")}</p>
                <button type="button" className="logout-button" onClick={signOutEverywhere}>{t("settings.signOut")}</button>
              </section>
            )}
          </aside>
        </div>
      )}

      <nav className="bottom-nav" aria-label={t("nav.main")}>
        <button className={tab === "exchange" ? "active" : ""} onClick={() => setTab("exchange")}><span className="nav-exchange">↔</span><b>{t("nav.exchange")}</b></button>
        <button className={tab === "nearby" ? "active" : ""} onClick={() => setTab("nearby")}><span aria-hidden="true">⌖</span><b>{t("nav.nearby")}</b></button>
        <button className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}><span className="nav-friends" aria-hidden="true">👤</span><b>{t("nav.friends")}</b></button>
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
    {languagePicker}
    </>
  );
}
