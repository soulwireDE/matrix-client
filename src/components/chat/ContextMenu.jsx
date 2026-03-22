import { useEffect, useRef } from "react";
import useAppStore from "../../store/useAppStore";

const QUICK_EMOJIS = ["👍", "👎", "😂", "❤️", "😮", "😢"];

export default function ContextMenu({
    x,
    y,
    message,
    onClose,
    onReply,
    onEdit,
    onReact,
}) {
    const ref = useRef(null);
    const { matrixClient } = useAppStore();
    const isOwnMessage = message?.sender === matrixClient?.getUserId();

    // Außerhalb klicken → schließen
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        const escHandler = (e) => {
            if (e.key === "Escape") onClose();
        };
        setTimeout(() => {
            document.addEventListener("mousedown", handler);
            document.addEventListener("keydown", escHandler);
        }, 0);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", escHandler);
        };
    }, [onClose]);

    // Position korrigieren damit Menü nicht aus dem Fenster ragt
    useEffect(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (rect.right > vw) ref.current.style.left = x - rect.width + "px";
        if (rect.bottom > vh) ref.current.style.top = y - rect.height + "px";
    }, [x, y]);

    async function handleDelete() {
        try {
            await matrixClient.redactEvent(
                matrixClient.getRoom(message.roomId)?.roomId || message.roomId,
                message.id,
            );
        } catch (e) {
            console.error("Delete error:", e);
        }
        onClose();
    }

    function MenuItem({ icon, label, onClick, danger }) {
        return (
            <div
                onClick={onClick}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    color: danger ? "var(--dc-red)" : "var(--dc-text-2)",
                    fontSize: "14px",
                    userSelect: "none",
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.background = danger
                        ? "rgba(237,66,69,0.15)"
                        : "var(--dc-bg-4)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                }
            >
                <span
                    style={{
                        fontSize: "16px",
                        width: "20px",
                        textAlign: "center",
                    }}
                >
                    {icon}
                </span>
                {label}
            </div>
        );
    }

    return (
        <div
            ref={ref}
            style={{
                position: "fixed",
                left: x,
                top: y,
                zIndex: 1000,
                background: "var(--dc-bg-1)",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "4px",
                minWidth: "180px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
        >
            {/* Schnell-Reaktionen */}
            <div
                style={{
                    display: "flex",
                    gap: "4px",
                    padding: "6px 8px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    marginBottom: "4px",
                }}
            >
                {QUICK_EMOJIS.map((emoji) => (
                    <div
                        key={emoji}
                        onClick={() => {
                            onReact(emoji);
                            onClose();
                        }}
                        style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                                "var(--dc-bg-4)")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                        }
                    >
                        {emoji}
                    </div>
                ))}
            </div>

            {/* Antworten */}
            <MenuItem
                icon="↩️"
                label="Antworten"
                onClick={() => {
                    onReply();
                    onClose();
                }}
            />

            {/* Eigene Nachrichten */}
            {isOwnMessage && !message.isRedacted && (
                <>
                    <MenuItem
                        icon="✏️"
                        label="Bearbeiten"
                        onClick={() => {
                            onEdit();
                            onClose();
                        }}
                    />
                    <div
                        style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.06)",
                            margin: "4px 0",
                        }}
                    />
                    <MenuItem
                        icon="🗑️"
                        label="Löschen"
                        onClick={handleDelete}
                        danger
                    />
                </>
            )}
        </div>
    );
}
