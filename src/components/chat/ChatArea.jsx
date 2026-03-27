import { useEffect, useState, useRef, useCallback } from "react";
import useAppStore from "../../store/useAppStore";
import ContextMenu from "./ContextMenu";
import VerificationBanner from '../verification/VerificationBanner'
//import VerificationDialog from '../verification/VerificationDialog'
import { startVerification, attachVerificationListener, setVerificationRequestHandler } from '../../services/verificationService'
import JoinCallDialog from '../call/JoinCallDialog'
import LiveKitCallPanel from '../call/LiveKitCallPanel'
import { deriveLivekitRoomName, getLivekitCallState, setLivekitCallActive } from '../../services/livekitCalls'
import { fetchLivekitToken, getLivekitTokenEndpoint } from '../../services/livekitToken'

export default function ChatArea() {
    const { matrixClient, activeRoomId, rooms } = useAppStore();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const bottomRef = useRef(null);
    const scrollRef = useRef(null);
    const isFirstLoad = useRef(true);
    const [contextMenu, setContextMenu] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [showVerificationBanner, setShowVerificationBanner] = useState(false)
    const [verificationRequest, setVerificationRequest] = useState(null)
    const [dmPartnerId, setDmPartnerId] = useState(null)
    const [callState, setCallState] = useState(null) // { active, livekit_url, room_name, ... }
    const [showJoinCall, setShowJoinCall] = useState(false)
    const [joinMode, setJoinMode] = useState(null) // 'voice' | 'video'
    const [livekitConn, setLivekitConn] = useState(null) // { livekitUrl, token }
    const [callError, setCallError] = useState(null)
    // const [editText, setEditText] = useState("");

    const activeRoom = rooms.find((r) => r.roomId === activeRoomId);

    const callActive = !!callState?.active
    const inCall = !!(joinMode && livekitConn?.token && livekitConn?.livekitUrl)

    function getDefaultLivekitUrl() {
        return import.meta.env?.VITE_LIVEKIT_URL || import.meta.env?.VITE_LIVEKIT_WS_URL || null
    }

    function parseMessages(room) {
        const timeline = room.getLiveTimeline().getEvents();
        return timeline
            .filter((e) => {
                const type = e.getType();
                // ✅ NEU: encrypted Events auch durchlassen
                if (type !== "m.room.message" && type !== "m.room.encrypted")
                    return false;
                const relates = e.getContent()["m.relates_to"];
                if (relates?.rel_type === "m.replace") return false;
                return true;
            })
            .map((e) => {
                const isRedacted = e.isRedacted();
                // ✅ NEU: War das Event encrypted?
                const isEncrypted = e.isEncrypted();
                // ✅ NEU: Wurde es erfolgreich entschlüsselt?
                const decryptionError = e.decryptionFailureReason;

                return {
                    id: e.getId(),
                    sender: e.getSender(),
                    body: isRedacted ? null : e.getContent().body || "",
                    msgtype: isRedacted
                        ? "redacted"
                        : e.getContent().msgtype || "m.text",
                    url: e.getContent().url || null,
                    ts: e.getTs(),
                    isRedacted,
                    isPending: e.status === "sending" || e.status === "queued",
                    isEncrypted, // ✅ NEU
                    decryptionError, // ✅ NEU: null = OK, sonst Fehlermeldung
                };
            });
    }

    useEffect(() => {
        if (!matrixClient || !activeRoomId) {
            setMessages([]);
            setCallState(null)
            setLivekitConn(null)
            setJoinMode(null)
            setCallError(null)
            return;
        }

        const room = matrixClient.getRoom(activeRoomId);
        if (!room) return;

        // Call-State initial lesen
        try {
            const st = getLivekitCallState(room)?.content || null
            setCallState(st)
        } catch {
            setCallState(null)
        }

// Prüfen ob DM und noch nicht verifiziert
const members = room.getMembers()
const isDM = members.length === 2
if (isDM) {
  const partner = members.find(m => m.userId !== matrixClient.getUserId())
  if (partner) {
    setDmPartnerId(partner.userId)
    // Eigene async Funktion
async function checkVerification() {
  const crypto = matrixClient.getCrypto()
  if (!crypto) return

  try {
    // Prüfen ob User überhaupt Crypto-Devices hat
    const deviceInfo = await crypto.getUserDeviceInfo([partner.userId])
    const devices = deviceInfo.get(partner.userId)

    // Keine Devices = Bot oder kein E2EE → kein Banner
    if (!devices || devices.size === 0) {
      setShowVerificationBanner(false)
      return
    }

    const trustLevel = await crypto.getUserVerificationStatus(partner.userId)
    setShowVerificationBanner(!trustLevel?.isVerified())
  } catch (e) {
    console.warn('Verification check fehlgeschlagen:', e)
    setShowVerificationBanner(false)
  }
}
    checkVerification()
  }
} else {
  setShowVerificationBanner(false)
  setDmPartnerId(null)
}


        isFirstLoad.current = true;
        setHasMore(true);
        setMessages(parseMessages(room));

        const onTimeline = (event, eventRoom, toStartOfTimeline) => {
            if (toStartOfTimeline) return;
            if (eventRoom?.roomId !== activeRoomId) return;
            if (event.getType() !== "m.room.message") return;

            // room frisch aus dem Client holen statt Closure
            const freshRoom = matrixClient.getRoom(activeRoomId);
            if (!freshRoom) return;

            setTimeout(() => {
                setMessages(parseMessages(freshRoom));
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
        };

        const onRoomRedaction = (event, eventRoom) => {
            if (eventRoom?.roomId !== activeRoomId) return;
            const freshRoom = matrixClient.getRoom(activeRoomId);
            if (!freshRoom) return;
            setMessages(parseMessages(freshRoom));
        };

        // Nachträglich entschlüsselte Events
        const onDecrypted = (event) => {
            if (event.getRoomId() !== activeRoomId) return;
            const freshRoom = matrixClient.getRoom(activeRoomId);
            if (!freshRoom) return;
            setMessages(parseMessages(freshRoom));
        };

        matrixClient.on("Room.timeline", onTimeline);
        matrixClient.on("Room.redaction", onRoomRedaction);
        matrixClient.on("Event.decrypted", onDecrypted);

        const onRoomStateEvent = (event, state) => {
            const roomId = state?.roomId || event?.getRoomId?.()
            if (roomId !== activeRoomId) return
            if (event?.getType?.() !== 'com.matrixclient.livekit.call') return
            const content = event.getContent?.() || null
            setCallState(content)
        }
        matrixClient.on('RoomState.events', onRoomStateEvent)

        return () => {
            matrixClient.off("Room.timeline", onTimeline);
            matrixClient.off("Room.redaction", onRoomRedaction);
            matrixClient.off("Event.decrypted", onDecrypted);
            matrixClient.off('RoomState.events', onRoomStateEvent)
        };
    }, [matrixClient, activeRoomId]);

    // Wenn Call im Raum deaktiviert wird, lokale UI zurücksetzen
    useEffect(() => {
        if (!callActive && inCall) {
            setLivekitConn(null)
            setJoinMode(null)
        }
        if (!callActive) setCallError(null)
    }, [callActive]);

    async function startRoomCall() {
        if (!matrixClient || !activeRoomId) return
        setCallError(null)

        const livekitUrl = getDefaultLivekitUrl()
        if (!livekitUrl) {
            window.alert('Bitte setze VITE_LIVEKIT_URL (oder VITE_LIVEKIT_WS_URL) in deiner Vite/Tauri Umgebung.')
            return
        }

        const roomName = deriveLivekitRoomName(activeRoomId)
        try {
            await setLivekitCallActive(matrixClient, activeRoomId, { active: true, livekitUrl, roomName })
        } catch (e) {
            console.error('startRoomCall failed:', e)
            setCallError(e?.message || 'Call konnte nicht gestartet werden')
        }
    }

    async function endRoomCall() {
        if (!matrixClient || !activeRoomId) return
        setCallError(null)
        try {
            await setLivekitCallActive(matrixClient, activeRoomId, { active: false })
        } catch (e) {
            console.error('endRoomCall failed:', e)
            setCallError(e?.message || 'Call konnte nicht beendet werden')
        }
    }

async function joinRoomCall(mode) {
  if (!matrixClient || !activeRoomId) return
  setShowJoinCall(false)
  setCallError(null)

  try {
    const data = await fetchLivekitToken({
      matrixAccessToken: matrixClient.getAccessToken?.(),
      matrixRoomId: activeRoomId,
      matrixUserId: matrixClient.getUserId(),
    })

    const lkUrl = data?.livekit_url
    const token = data?.token
    if (!lkUrl || !token) throw new Error('Token Response unvollständig')

    setJoinMode(mode)
    setLivekitConn({ livekitUrl: lkUrl, token })

  } catch (e) {
    console.error('joinRoomCall failed:', e)
    setCallError(e?.message || 'Call beitreten fehlgeschlagen')
    setLivekitConn(null)
    setJoinMode(null)
  }
}

    // Scroll beim ersten Load ans Ende
    useEffect(() => {
        if (messages.length > 0 && isFirstLoad.current) {
            bottomRef.current?.scrollIntoView({ behavior: "instant" });
            isFirstLoad.current = false;
        }
    }, [messages]);

    // Ältere Nachrichten laden beim Scroll nach oben
    const handleScroll = useCallback(async () => {
        const el = scrollRef.current;
        if (!el || loadingOlder || !hasMore) return;
        if (el.scrollTop > 80) return;

        setLoadingOlder(true);
        const room = matrixClient.getRoom(activeRoomId);
        if (!room) {
            setLoadingOlder(false);
            return;
        }

        try {
            const result = await matrixClient.scrollback(room, 30);
            const prevHeight = el.scrollHeight;
            setMessages(parseMessages(room));

            // Scroll-Position halten nach Laden
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight - prevHeight;
            });

            if (result === "end" || room.oldState?.paginationToken == null) {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Scrollback error:", e);
        } finally {
            setLoadingOlder(false);
        }
    }, [matrixClient, activeRoomId, loadingOlder, hasMore]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    async function sendMessage(e) {
        e.preventDefault();
        const text = input.trim();
        if (!text || !activeRoomId) return;
        setInput("");

        try {
            if (editingId) {
                await matrixClient.sendMessage(activeRoomId, {
                    msgtype: "m.text",
                    body: `* ${text}`,
                    "m.new_content": { msgtype: "m.text", body: text },
                    "m.relates_to": {
                        rel_type: "m.replace",
                        event_id: editingId,
                    },
                });
                setEditingId(null);
                // setEditText('')
            } else if (replyTo) {
                await matrixClient.sendMessage(activeRoomId, {
                    msgtype: "m.text",
                    body: `> <${replyTo.sender}> ${replyTo.body}\n\n${text}`,
                    "m.relates_to": {
                        "m.in_reply_to": { event_id: replyTo.id },
                    },
                });
                setReplyTo(null);
            } else {
                await matrixClient.sendTextMessage(activeRoomId, text);
            }
        } catch (err) {
            console.error("Send error:", err);
            setInput(text);
        }
    }

    async function sendReaction(messageId, emoji) {
        try {
            await matrixClient.sendEvent(activeRoomId, "m.reaction", {
                "m.relates_to": {
                    rel_type: "m.annotation",
                    event_id: messageId,
                    key: emoji,
                },
            });
        } catch (e) {
            console.error("Reaction error:", e);
        }
    }

    // Timestamp-Logik
    function formatTimestamp(ts, prevTs) {
        const date = new Date(ts);
        const prevDate = prevTs ? new Date(prevTs) : null;
        const now = new Date();

        const isToday = date.toDateString() === now.toDateString();
        const isYesterday =
            new Date(now - 86400000).toDateString() === date.toDateString();

        const timeStr = date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });

        // Datums-Trennlinie wenn neuer Tag
        let dateLabel = null;
        if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
            if (isToday) dateLabel = "Heute";
            else if (isYesterday) dateLabel = "Gestern";
            else
                dateLabel = date.toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                });
        }

        return { timeStr, dateLabel };
    }

    function getAvatarColor(userId) {
        const colors = [
            "#5865f2",
            "#eb459e",
            "#3ba55c",
            "#faa61a",
            "#ed4245",
            "#00b0f4",
        ];
        let hash = 0;
        for (const c of userId || "")
            hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
        return colors[Math.abs(hash) % colors.length];
    }

    function getInitials(userId) {
        return (userId || "?").slice(1, 3).toUpperCase();
    }

    function getDisplayName(userId) {
        const room = matrixClient?.getRoom(activeRoomId);
        const member = room?.getMember(userId);
        return member?.name || userId.split(":")[0].slice(1);
    }

    if (!activeRoomId) {
        return (
            <div
                style={{
                    flex: 1,
                    background: "var(--dc-bg-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "12px",
                }}
            >
                <div style={{ fontSize: "64px", opacity: 0.1, lineHeight: 1 }}>
                    #
                </div>
                <p style={{ color: "var(--dc-text-muted)", fontSize: "16px" }}>
                    Wähle einen Kanal aus
                </p>
            </div>
        );
    }

    return (
        <div
            style={{
                flex: 1,
                background: "var(--dc-bg-3)",
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: "48px",
                    padding: "0 16px",
                    flexShrink: 0,
                    borderBottom: "1px solid var(--dc-bg-1)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                <span
                    style={{
                        color: "var(--dc-text-muted)",
                        fontSize: "22px",
                        fontWeight: 300,
                    }}
                >
                    #
                </span>
                <span
                    style={{
                        color: "var(--dc-text-1)",
                        fontWeight: 600,
                        fontSize: "15px",
                    }}
                >
                    {activeRoom?.name || activeRoomId}
                </span>
                {activeRoom?.currentState
                    ?.getStateEvents("m.room.topic", "")
                    ?.getContent()?.topic && (
                    <>
                        <div
                            style={{
                                width: "1px",
                                height: "20px",
                                background: "var(--dc-bg-4)",
                                margin: "0 4px",
                            }}
                        />
                        <span
                            style={{
                                color: "var(--dc-text-muted)",
                                fontSize: "13px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {
                                activeRoom.currentState
                                    .getStateEvents("m.room.topic", "")
                                    .getContent().topic
                            }
                        </span>
                    </>
                )}

                <div style={{ flex: 1 }} />

                {/* Call Controls */}
                {activeRoomId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {callActive ? (
                            <>
                                <div style={{
                                    color: 'var(--dc-green)',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    opacity: 0.9,
                                }}>
                                    ● Call aktiv
                                </div>
                                {!inCall && (
                                    <button
                                        onClick={() => setShowJoinCall(true)}
                                        style={callPrimaryBtn}
                                        title="Call beitreten"
                                    >
                                        Join
                                    </button>
                                )}
                                {inCall && (
                                    <div style={{
                                        color: 'var(--dc-text-muted)',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                    }}>
                                        {joinMode === 'video' ? 'Video' : 'Voice'}
                                    </div>
                                )}
                                <button
                                    onClick={endRoomCall}
                                    style={callDangerBtn}
                                    title="Call beenden"
                                >
                                    End
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={startRoomCall}
                                style={callPrimaryBtn}
                                title="Call starten"
                            >
                                Call
                            </button>
                        )}
                    </div>
                )}
            </div>

            {callError && (
                <div style={{
                    padding: '8px 16px',
                    background: 'rgba(237,66,69,0.12)',
                    borderBottom: '1px solid rgba(237,66,69,0.25)',
                    color: 'var(--dc-text-2)',
                    fontSize: '13px',
                }}>
                    {callError}
                </div>
            )}

            {/* LiveKit Call Panel */}
            {callActive && inCall && (
                <LiveKitCallPanel
                    livekitUrl={livekitConn.livekitUrl}
                    token={livekitConn.token}
                    joinMode={joinMode}
                    onLeave={() => {
                        setLivekitConn(null)
                        setJoinMode(null)
                    }}
                />
            )}
{/* Verification Banner für DMs */}
{showVerificationBanner && dmPartnerId && (
  <VerificationBanner
    userId={dmPartnerId}
    onStartVerification={async () => {
      const request = await startVerification(matrixClient, dmPartnerId)
      setVerificationRequest(request)
      setShowVerificationBanner(false)
    }}
    onDismiss={() => setShowVerificationBanner(false)}
  />
)}


            {/* Nachrichten-Liste */}
            <div
                ref={scrollRef}
                style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}
            >
                {/* Ältere laden Indikator */}
                {loadingOlder && (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "12px",
                            color: "var(--dc-text-muted)",
                            fontSize: "12px",
                        }}
                    >
                        Lade ältere Nachrichten…
                    </div>
                )}
                {!hasMore && (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "24px 16px 8px",
                            color: "var(--dc-text-muted)",
                            fontSize: "13px",
                        }}
                    >
                        Anfang des Verlaufs
                    </div>
                )}

                {messages.map((msg, i) => {
                    const prevMsg = messages[i - 1];
                    const isGrouped =
                        prevMsg?.sender === msg.sender &&
                        msg.ts - (prevMsg?.ts || 0) < 300000;
                    const { timeStr, dateLabel } = formatTimestamp(
                        msg.ts,
                        prevMsg?.ts,
                    );

                    return (
                        <div
                            key={msg.id}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    message: { ...msg, roomId: activeRoomId },
                                });
                            }}
                        >
                            {/* Datums-Trennlinie */}
                            {dateLabel && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "16px 16px 8px",
                                        margin: "0",
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            height: "1px",
                                            background: "var(--dc-bg-4)",
                                        }}
                                    />
                                    <span
                                        style={{
                                            color: "var(--dc-text-muted)",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {dateLabel}
                                    </span>
                                    <div
                                        style={{
                                            flex: 1,
                                            height: "1px",
                                            background: "var(--dc-bg-4)",
                                        }}
                                    />
                                </div>
                            )}

                            {/* Nachricht */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: "12px",
                                    padding: isGrouped
                                        ? "1px 16px 1px 68px"
                                        : "6px 16px 2px",
                                    alignItems: "flex-start",
                                    transition: "background 0.1s",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                        "rgba(0,0,0,0.1)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                        "transparent")
                                }
                            >
                                {!isGrouped ? (
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            flexShrink: 0,
                                            background: getAvatarColor(
                                                msg.sender,
                                            ),
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#fff",
                                            fontWeight: 700,
                                            fontSize: "13px",
                                            marginTop: "2px",
                                        }}
                                    >
                                        {getInitials(msg.sender)}
                                    </div>
                                ) : (
                                    // Timestamp links beim Hover bei gruppierten Nachrichten
                                    <div
                                        style={{
                                            width: "36px",
                                            flexShrink: 0,
                                            textAlign: "right",
                                            fontSize: "10px",
                                            color: "var(--dc-text-muted)",
                                            paddingTop: "3px",
                                            opacity: 0,
                                        }}
                                        className="msg-hover-time"
                                    >
                                        {timeStr}
                                    </div>
                                )}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {!isGrouped && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "baseline",
                                                gap: "8px",
                                                marginBottom: "2px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: "var(--dc-text-1)",
                                                    fontWeight: 500,
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {getDisplayName(msg.sender)}
                                            </span>
                                            <span
                                                style={{
                                                    color: "var(--dc-text-muted)",
                                                    fontSize: "11px",
                                                }}
                                            >
                                                {timeStr}
                                            </span>
                                        </div>
                                    )}
                                    {/* Gelöschte Nachricht */}
                                    {msg.isRedacted && (
                                        <div
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                color: "var(--dc-text-muted)",
                                                fontSize: "14px",
                                                fontStyle: "italic",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                borderRadius: "4px",
                                                padding: "4px 10px",
                                            }}
                                        >
                                            <span style={{ fontSize: "13px" }}>
                                                🗑
                                            </span>
                                            Diese Nachricht wurde gelöscht.
                                        </div>
                                    )}

                                {/* Entschlüsselung fehlgeschlagen */}
                                {!msg.isRedacted && msg.decryptionError && (
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    color: 'var(--dc-text-muted)', fontSize: '14px',
                                    fontStyle: 'italic',
                                    border: '1px solid rgba(255,165,0,0.3)',
                                    borderRadius: '4px', padding: '4px 10px',
                                    background: 'rgba(255,165,0,0.05)',
                                }}>
                                    <span>🔐</span>
                                    Nachricht konnte nicht entschlüsselt werden
                                </div>
                                )}

                                {/* Text-Nachricht – jetzt mit Schloss-Icon wenn verschlüsselt */}
                                {!msg.isRedacted && !msg.decryptionError && msg.msgtype === 'm.text' && (
                                <div style={{
                                    color: 'var(--dc-text-2)', fontSize: '14px',
                                    lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                                }}>
                                    {msg.isEncrypted && (
                                    <span
                                        title="Ende-zu-Ende verschlüsselt"
                                        style={{ fontSize: '11px', marginRight: '4px', opacity: 0.4 }}
                                    >
                                        🔒
                                    </span>
                                    )}
                                    {msg.body}
                                </div>
                                )}

                                    {/* Bild-Nachricht */}
                                    {msg.msgtype === "m.image" && msg.url && (
                                        <img
                                            src={matrixClient.mxcUrlToHttp(
                                                msg.url,
                                                400,
                                                300,
                                                "scale",
                                            )}
                                            alt={msg.body}
                                            style={{
                                                maxWidth: "400px",
                                                maxHeight: "300px",
                                                borderRadius: "4px",
                                                marginTop: "4px",
                                                display: "block",
                                                cursor: "pointer",
                                            }}
                                            onClick={() =>
                                                window.open(
                                                    matrixClient.mxcUrlToHttp(
                                                        msg.url,
                                                    ),
                                                    "_blank",
                                                )
                                            }
                                        />
                                    )}

                                    {/* Datei-Anhang */}
                                    {(msg.msgtype === "m.file" ||
                                        msg.msgtype === "m.audio" ||
                                        msg.msgtype === "m.video") && (
                                        <div
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                background: "var(--dc-bg-2)",
                                                borderRadius: "4px",
                                                padding: "8px 12px",
                                                marginTop: "4px",
                                                cursor: "pointer",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                            }}
                                            onClick={() =>
                                                window.open(
                                                    matrixClient.mxcUrlToHttp(
                                                        msg.url,
                                                    ),
                                                    "_blank",
                                                )
                                            }
                                        >
                                            <span style={{ fontSize: "20px" }}>
                                                📎
                                            </span>
                                            <span
                                                style={{
                                                    color: "var(--dc-accent)",
                                                    fontSize: "13px",
                                                    textDecoration: "underline",
                                                }}
                                            >
                                                {msg.body}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Eingabe */}
            <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
                {/* Reply Banner */}
                {replyTo && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 16px",
                            background: "var(--dc-bg-4)",
                            borderRadius: "8px 8px 0 0",
                            marginBottom: "-4px",
                            fontSize: "13px",
                            color: "var(--dc-text-muted)",
                        }}
                    >
                        <span style={{ color: "var(--dc-accent)" }}>
                            ↩ Antwort an {replyTo.sender.split(":")[0].slice(1)}
                        </span>
                        <span
                            style={{
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {replyTo.body}
                        </span>
                        <span
                            onClick={() => setReplyTo(null)}
                            style={{
                                cursor: "pointer",
                                fontSize: "16px",
                                flexShrink: 0,
                            }}
                        >
                            ✕
                        </span>
                    </div>
                )}

                {/* Edit Banner */}
                {editingId && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 16px",
                            background: "rgba(88,101,242,0.15)",
                            borderRadius: "8px 8px 0 0",
                            marginBottom: "-4px",
                            fontSize: "13px",
                        }}
                    >
                        <span style={{ color: "var(--dc-accent)" }}>
                            ✏ Nachricht bearbeiten
                        </span>
                        <span style={{ flex: 1 }} />
                        <span
                            onClick={() => {
                                setEditingId(null);
                                //setEditText('');
                                setInput("");
                            }}
                            style={{
                                cursor: "pointer",
                                fontSize: "16px",
                                color: "var(--dc-text-muted)",
                            }}
                        >
                            ✕
                        </span>
                    </div>
                )}

                <form onSubmit={sendMessage} style={{ position: "relative" }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(e);
                            }
                        }}
                        placeholder={`Nachricht an #${activeRoom?.name || "kanal"}`}
                        style={{
                            width: "100%",
                            background: "var(--dc-bg-4)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "11px 48px 11px 16px",
                            color: "var(--dc-text-1)",
                            fontSize: "14px",
                            outline: "none",
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: input.trim()
                                ? "var(--dc-accent)"
                                : "var(--dc-text-muted)",
                            fontSize: "18px",
                            padding: "4px",
                            lineHeight: 1,
                        }}
                    >
                        ➤
                    </button>
                </form>
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    message={contextMenu.message}
                    onClose={() => setContextMenu(null)}
                    onReply={() => setReplyTo(contextMenu.message)}
                    onEdit={() => {
                        setEditingId(contextMenu.message.id);
                        //setEditText(contextMenu.message.body)
                        setInput(contextMenu.message.body);
                    }}
                    onReact={(emoji) =>
                        sendReaction(contextMenu.message.id, emoji)
                    }
                />
            )}

            <JoinCallDialog
                open={showJoinCall}
                onClose={() => setShowJoinCall(false)}
                onJoin={joinRoomCall}
            />
        </div>
    );
}

const callPrimaryBtn = {
    background: 'var(--dc-accent)',
    border: 'none',
    color: '#fff',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '12px',
}

const callDangerBtn = {
    background: 'rgba(237,66,69,0.16)',
    border: '1px solid rgba(237,66,69,0.35)',
    color: 'var(--dc-text-1)',
    borderRadius: '8px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '12px',
}
