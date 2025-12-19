import { database } from "@keeper.sh/database";
import { calendarSnapshotsTable } from "@keeper.sh/database/schema";
import { log } from "@keeper.sh/log";
import { eq, and } from "drizzle-orm";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/users/:userId/snapshots": async (req) => {
      const { userId } = req.params;

      const snapshots = await database
        .select({ id: calendarSnapshotsTable.id })
        .from(calendarSnapshotsTable)
        .where(and(
          eq(calendarSnapshotsTable.userId, userId),
          eq(calendarSnapshotsTable.public, true)
        ));

      return Response.json(snapshots.map((s) => s.id));
    },

    "/snapshots/:id": async (req) => {
      const id = req.params.id.replace(/\.ics$/, "");

      const [snapshot] = await database
        .select()
        .from(calendarSnapshotsTable)
        .where(and(
          eq(calendarSnapshotsTable.id, id),
          eq(calendarSnapshotsTable.public, true)
        ))
        .limit(1);

      if (!snapshot?.ical) {
        return new Response(null, { status: 404 });
      }

      return new Response(snapshot.ical, {
        headers: { "Content-Type": "text/calendar" },
      });
    },
  },
});

log.info({ port: server.port }, "server started");
