import {
  CalDAVProvider,
  getCalDAVAccountsForUser,
  getUserEvents,
} from "@keeper.sh/integration-caldav";
import type { SyncResult, SyncContext } from "@keeper.sh/integrations";

export const FASTMAIL_SERVER_URL = "https://caldav.fastmail.com/";

const PROVIDER_OPTIONS = {
  providerId: "fastmail",
  providerName: "FastMail",
};

export class FastMailProvider extends CalDAVProvider {
  static override async syncForUser(
    userId: string,
    context: SyncContext,
  ): Promise<SyncResult | null> {
    const accounts = await getCalDAVAccountsForUser(userId, "fastmail");
    if (accounts.length === 0) return null;

    const localEvents = await getUserEvents(userId);

    const results = await Promise.all(
      accounts.map((account) =>
        CalDAVProvider["syncAccount"](account, localEvents, context, PROVIDER_OPTIONS),
      ),
    );

    return results.reduce<SyncResult>(
      (combined, result) => ({
        added: combined.added + result.added,
        removed: combined.removed + result.removed,
      }),
      { added: 0, removed: 0 },
    );
  }
}
