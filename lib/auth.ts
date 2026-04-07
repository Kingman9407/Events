export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export interface UserSession {
  name: string;
  email: string;
  picture: string;
}

export function decodeJwtPayload(token: string): Record<string, any> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  return JSON.parse(jsonPayload);
}

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem("user_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem("user_session", JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem("user_session");
}
