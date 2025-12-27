import env from "@keeper.sh/env/auth";
import { log } from "@keeper.sh/log";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  saveCalendarDestination,
  validateState,
} from "./destinations";
import { triggerDestinationSync } from "./sync";

export interface OAuthCallbackParams {
  code: string | null;
  state: string | null;
  error: string | null;
  provider: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
}

/**
 * Parses OAuth callback parameters from a request.
 */
export const parseOAuthCallback = (
  request: Request,
  provider: string,
): OAuthCallbackParams => {
  const url = new URL(request.url);
  return {
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    error: url.searchParams.get("error"),
    provider,
  };
};

/**
 * Builds a redirect URL with optional parameters.
 */
export const buildRedirectUrl = (
  path: string,
  params?: Record<string, string>,
): URL => {
  const url = new URL(path, env.BETTER_AUTH_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
};

/**
 * Handles a successful OAuth callback - exchanges code for tokens and saves destination.
 * Returns the userId if successful.
 * Throws if validation fails or tokens are missing.
 */
export const handleOAuthCallback = async (
  params: OAuthCallbackParams,
): Promise<{ userId: string; redirectUrl: URL }> => {
  const successUrl = buildRedirectUrl("/dashboard/integrations", { destination: "connected" });
  const errorUrl = buildRedirectUrl("/dashboard/integrations", { destination: "error" });

  if (!params.provider) {
    log.warn("Missing provider in callback URL");
    throw new OAuthError("Missing provider", errorUrl);
  }

  if (params.error) {
    log.warn({ error: params.error }, "OAuth error returned from provider");
    throw new OAuthError("OAuth error from provider", errorUrl);
  }

  if (!params.code || !params.state) {
    log.warn("Missing code or state in callback");
    throw new OAuthError("Missing code or state", errorUrl);
  }

  const userId = validateState(params.state);
  if (!userId) {
    log.warn("Invalid or expired state");
    throw new OAuthError("Invalid or expired state", errorUrl);
  }

  const callbackUrl = new URL(
    `/api/destinations/callback/${params.provider}`,
    env.BETTER_AUTH_URL,
  );
  const tokens = await exchangeCodeForTokens(params.provider, params.code, callbackUrl.toString());

  if (!tokens.refresh_token) {
    log.error("No refresh token in response");
    throw new OAuthError("No refresh token", errorUrl);
  }

  const userInfo = await fetchUserInfo(params.provider, tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await saveCalendarDestination(
    userId,
    params.provider,
    userInfo.id,
    userInfo.email,
    tokens.access_token,
    tokens.refresh_token,
    expiresAt,
  );

  log.info({ userId, provider: params.provider }, "calendar destination connected");

  triggerDestinationSync(userId);

  return { userId, redirectUrl: successUrl };
};

/**
 * Error class for OAuth failures that includes a redirect URL.
 */
export class OAuthError extends Error {
  constructor(
    message: string,
    public redirectUrl: URL,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}
