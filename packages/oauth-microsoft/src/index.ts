import {
  microsoftTokenResponseSchema,
  microsoftUserInfoSchema,
  type MicrosoftTokenResponse,
  type MicrosoftUserInfo,
} from "@keeper.sh/data-schemas";
import env from "@keeper.sh/env/auth";

const MICROSOFT_AUTH_URL =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";

export const MICROSOFT_CALENDAR_SCOPE = "Calendars.ReadWrite";
export const MICROSOFT_USER_SCOPE = "User.Read";
export const MICROSOFT_OFFLINE_SCOPE = "offline_access";

const pendingStates = new Map<string, { userId: string; expiresAt: number }>();

export const generateState = (userId: string): string => {
  const state = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  pendingStates.set(state, { userId, expiresAt });
  return state;
};

export const validateState = (state: string): string | null => {
  const entry = pendingStates.get(state);
  if (!entry) return null;

  pendingStates.delete(state);

  if (Date.now() > entry.expiresAt) return null;

  return entry.userId;
};

export interface AuthorizationUrlOptions {
  callbackUrl: string;
  scopes?: string[];
}

export const getAuthorizationUrl = (
  userId: string,
  options: AuthorizationUrlOptions,
): string => {
  if (!env.MICROSOFT_CLIENT_ID) {
    throw new Error("MICROSOFT_CLIENT_ID is not configured");
  }

  const state = generateState(userId);
  const scopes = options.scopes ?? [
    MICROSOFT_CALENDAR_SCOPE,
    MICROSOFT_USER_SCOPE,
    MICROSOFT_OFFLINE_SCOPE,
  ];

  const url = new URL(MICROSOFT_AUTH_URL);
  url.searchParams.set("client_id", env.MICROSOFT_CLIENT_ID);
  url.searchParams.set("redirect_uri", options.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
};

export const exchangeCodeForTokens = async (
  code: string,
  callbackUrl: string,
): Promise<MicrosoftTokenResponse> => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth credentials are not configured");
  }

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${error}`);
  }

  const body = await response.json();
  return microsoftTokenResponseSchema.assert(body);
};

export const fetchUserInfo = async (
  accessToken: string,
): Promise<MicrosoftUserInfo> => {
  const response = await fetch(MICROSOFT_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const body = await response.json();
  return microsoftUserInfoSchema.assert(body);
};

export const refreshAccessToken = async (
  refreshToken: string,
): Promise<MicrosoftTokenResponse> => {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth credentials are not configured");
  }

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${error}`);
  }

  const body = await response.json();
  return microsoftTokenResponseSchema.assert(body);
};

export type { MicrosoftTokenResponse, MicrosoftUserInfo };
