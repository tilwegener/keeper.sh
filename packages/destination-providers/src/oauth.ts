import * as googleOAuth from "@keeper.sh/oauth-google";
import * as microsoftOAuth from "@keeper.sh/oauth-microsoft";

export interface AuthorizationUrlOptions {
  callbackUrl: string;
  scopes?: string[];
}

export interface NormalizedUserInfo {
  id: string;
  email: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface OAuthProvider {
  getAuthorizationUrl: (userId: string, options: AuthorizationUrlOptions) => string;
  exchangeCodeForTokens: (code: string, callbackUrl: string) => Promise<OAuthTokens>;
  fetchUserInfo: (accessToken: string) => Promise<NormalizedUserInfo>;
  validateState: (state: string) => string | null;
}

const createGoogleOAuthProvider = (): OAuthProvider => ({
  getAuthorizationUrl: googleOAuth.getAuthorizationUrl,
  exchangeCodeForTokens: googleOAuth.exchangeCodeForTokens,
  fetchUserInfo: async (accessToken) => {
    const info = await googleOAuth.fetchUserInfo(accessToken);
    return { id: info.id, email: info.email };
  },
  validateState: googleOAuth.validateState,
});

const createMicrosoftOAuthProvider = (): OAuthProvider => ({
  getAuthorizationUrl: microsoftOAuth.getAuthorizationUrl,
  exchangeCodeForTokens: microsoftOAuth.exchangeCodeForTokens,
  fetchUserInfo: async (accessToken) => {
    const info = await microsoftOAuth.fetchUserInfo(accessToken);
    return { id: info.id, email: info.mail ?? info.userPrincipalName ?? "" };
  },
  validateState: microsoftOAuth.validateState,
});

const oauthProviders: Record<string, OAuthProvider> = {
  google: createGoogleOAuthProvider(),
  outlook: createMicrosoftOAuthProvider(),
};

export const getOAuthProvider = (providerId: string): OAuthProvider | undefined => {
  return oauthProviders[providerId];
};

export const isOAuthProvider = (providerId: string): boolean => {
  return providerId in oauthProviders;
};

export const validateOAuthState = (state: string): string | null => {
  for (const provider of Object.values(oauthProviders)) {
    const userId = provider.validateState(state);
    if (userId) return userId;
  }
  return null;
};
