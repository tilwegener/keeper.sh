import { createSourceSchema } from "@keeper.sh/data-schemas";
import { auth } from "@keeper.sh/auth";
import { database } from "@keeper.sh/database";
import {
  remoteICalSourcesTable,
  eventStatesTable,
} from "@keeper.sh/database/schema";
import { pullRemoteCalendar } from "@keeper.sh/pull-calendar";
import { canAddSource } from "@keeper.sh/premium";
import { fetchAndSyncSource } from "@keeper.sh/sync-calendar";
import { log } from "@keeper.sh/log";
import { BunRequest } from "bun";
import { eq, and, inArray, gte, lte, asc } from "drizzle-orm";

type BunRouteCallback = (request: BunRequest<string>) => Promise<Response>;

const withTracing = (callback: BunRouteCallback): BunRouteCallback => {
  return async (request) => {
    const url = request.url;
    log.trace("request to %s started", url);
    const result = await callback(request);
    log.trace("request to %s complete", url);
    return result;
  };
};

const getSession = async (request: Request) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return session;
};

const withAuth = (
  callback: (request: BunRequest<string>, userId: string) => Promise<Response>,
): BunRouteCallback => {
  return async (request) => {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return callback(request, session.user.id);
  };
};

const server = Bun.serve({
  port: 3000,
  routes: {
    "/api/ics": {
      GET: withTracing(
        withAuth(async (_request, userId) => {
          const sources = await database
            .select()
            .from(remoteICalSourcesTable)
            .where(eq(remoteICalSourcesTable.userId, userId));

          return Response.json(sources);
        }),
      ),
      POST: withTracing(
        withAuth(async (request, userId) => {
          const body = await request.json();

          if (!createSourceSchema.allows(body)) {
            return Response.json(
              { error: "Name and URL are required" },
              { status: 400 },
            );
          }

          const { name, url } = body;

          const existingSources = await database
            .select({ id: remoteICalSourcesTable.id })
            .from(remoteICalSourcesTable)
            .where(eq(remoteICalSourcesTable.userId, userId));

          const allowed = await canAddSource(userId, existingSources.length);
          if (!allowed) {
            return Response.json(
              { error: "Source limit reached. Upgrade to Pro for unlimited sources." },
              { status: 402 },
            );
          }

          try {
            await pullRemoteCalendar("json", url);
          } catch {
            return Response.json(
              { error: "URL does not return a valid iCal file" },
              { status: 400 },
            );
          }

          const [source] = await database
            .insert(remoteICalSourcesTable)
            .values({ userId, name, url })
            .returning();

          if (!source) {
            throw new Error("Failed to create source");
          }

          fetchAndSyncSource(source).catch((error) => {
            log.error(error, "failed initial sync for source '%s'", source.id);
          });

          return Response.json(source, { status: 201 });
        }),
      ),
    },
    "/api/ics/:id": {
      DELETE: withTracing(
        withAuth(async (request, userId) => {
          const { id } = request.params;

          if (!id) {
            return Response.json({ error: "ID is required" }, { status: 400 });
          }

          const [deleted] = await database
            .delete(remoteICalSourcesTable)
            .where(
              and(
                eq(remoteICalSourcesTable.id, id),
                eq(remoteICalSourcesTable.userId, userId),
              ),
            )
            .returning();

          if (!deleted) {
            return Response.json({ error: "Not found" }, { status: 404 });
          }

          return Response.json({ success: true });
        }),
      ),
    },
    "/api/events": {
      GET: withTracing(
        withAuth(async (request, userId) => {
          const url = new URL(request.url);
          const fromParam = url.searchParams.get("from");
          const toParam = url.searchParams.get("to");

          log.debug({ fromParam, toParam, url: request.url }, "events query params");

          const now = new Date();
          const fromDate = fromParam ? new Date(fromParam) : now;
          const toDate = toParam
            ? new Date(toParam)
            : new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          const fromNormalized = new Date(fromDate);
          fromNormalized.setHours(0, 0, 0, 0);

          const toNormalized = new Date(toDate);
          toNormalized.setHours(23, 59, 59, 999);

          log.debug({ from: fromNormalized, to: toNormalized }, "date range");

          const sources = await database
            .select({
              id: remoteICalSourcesTable.id,
              name: remoteICalSourcesTable.name,
              url: remoteICalSourcesTable.url,
            })
            .from(remoteICalSourcesTable)
            .where(eq(remoteICalSourcesTable.userId, userId));

          if (sources.length === 0) {
            return Response.json([]);
          }

          const sourceIds = sources.map((source) => source.id);
          const sourceMap = new Map(
            sources.map((source) => [source.id, { name: source.name, url: source.url }]),
          );

          const events = await database
            .select({
              id: eventStatesTable.id,
              sourceId: eventStatesTable.sourceId,
              startTime: eventStatesTable.startTime,
              endTime: eventStatesTable.endTime,
            })
            .from(eventStatesTable)
            .where(
              and(
                inArray(eventStatesTable.sourceId, sourceIds),
                gte(eventStatesTable.startTime, fromNormalized),
                lte(eventStatesTable.startTime, toNormalized),
              ),
            )
            .orderBy(asc(eventStatesTable.startTime));

          const result = events.map((event) => {
            const source = sourceMap.get(event.sourceId);
            return {
              id: event.id,
              startTime: event.startTime,
              endTime: event.endTime,
              calendarId: event.sourceId,
              sourceName: source?.name,
              sourceUrl: source?.url,
            };
          });

          return Response.json(result);
        }),
      ),
    },
  },
});

log.info({ port: server.port }, "server started");
