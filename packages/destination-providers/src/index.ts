import type { DestinationProvider } from "@keeper.sh/integrations";
import { GoogleCalendarProvider } from "@keeper.sh/integration-google-calendar";
import { CalDAVProvider } from "@keeper.sh/integration-caldav";
import { FastMailProvider } from "@keeper.sh/integration-fastmail";
import { ICloudProvider } from "@keeper.sh/integration-icloud";
import { OutlookCalendarProvider } from "@keeper.sh/integration-outlook";

export const destinationProviders: DestinationProvider[] = [
  GoogleCalendarProvider,
  CalDAVProvider,
  FastMailProvider,
  ICloudProvider,
  OutlookCalendarProvider,
];

export {
  GoogleCalendarProvider,
  CalDAVProvider,
  FastMailProvider,
  ICloudProvider,
  OutlookCalendarProvider,
};

export {
  DESTINATIONS,
  getDestination,
  isCalDAVDestination,
  getActiveDestinations,
  type DestinationConfig,
  type DestinationId,
} from "@keeper.sh/destination-metadata";

export {
  getOAuthProvider,
  isOAuthProvider,
  validateOAuthState,
  type OAuthProvider,
  type OAuthTokens,
  type NormalizedUserInfo,
  type AuthorizationUrlOptions,
} from "./oauth";
