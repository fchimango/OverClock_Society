const AVATAR_COLORS = ["purple", "blue", "pink", "green", "orange"];

export function getInitial(name) {
    const value = String(name || "").trim();
    return value ? value.charAt(0).toLocaleUpperCase("pt-BR") : "?";
}

export function getAvatarColor(user) {
    const id = Number(user?.id);
    const index = Number.isFinite(id) && id > 0
        ? id % AVATAR_COLORS.length
        : getInitial(user?.name).charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

export function getFriendProfileUrl(user) {
    const userId = user?.id ?? user?.userId ?? null;
    const currentUserId = localStorage.getItem("userId");

    if (userId !== null && /^\d+$/.test(String(userId))) {
        if (currentUserId && String(currentUserId) === String(userId)) {
            return "perfil.html";
        }
        return `perfil-usuario.html?userId=${encodeURIComponent(String(userId))}`;
    }

    const username = String(user?.username || "").trim().replace(/^@+/, "");
    return username
        ? `perfil-usuario.html?username=${encodeURIComponent(username)}`
        : null;
}

export function normalizeSearch(value) {
    return String(value || "").trim().toLocaleLowerCase("pt-BR");
}

export function getStatusLabel(status) {
    if (status === "online") return "Online";
    if (status === "away") return "Ausente";
    return "Offline";
}

export function getStatusIcon(status) {
    if (status === "online") return "🟢";
    if (status === "away") return "🌙";
    return "⚪";
}
