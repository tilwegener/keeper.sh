# Keeper, Simple & Open-Source Calendar Syncing

_Keeper is open-source, released under the permissive GNU GPL-3.0 software license._

Keeper allows you to source events from a remote source—granted they are provided in ICS/iCal format—and sync busy-free time slots to a remote calendar hosted on a remote calendar of your choice.

## Considerations

Before using Keeper, please take into account the following.

1. **Keeper is timeslot-first.** This means that it does not _currently_ consider or sync summary, description, etc. If that's something you need, please consider an alternative like [OneCal](https://onecal.io/) for now.
2. **Keeper only sources from publicly available iCal/ICS URLs** at the moment. This means that should your organization not allow or your calendar provider not provide one, Keeper will not work for you.

## Directory

1. External Links
    1. [View the Keeper website](https://keeper.sh/)
    2. [Check issues to see what's coming to Keeper](https://github.com/ridafkih/keeper.sh/issues)
        - [ ] Destination Outlook integration
        - [ ] Destination CalDAV integration
        - [ ] Destination iCloud integration
        - [ ] Sync to multiple destinations of the same provider
        - [ ] Mobile application using Expo
        - [ ] Sync event summary and description
        - [ ] Branding that isn't unbelievably plain
    3. [Recent releases and changelogs](https://github.com/ridafkih/keeper.sh/releases)
2. [Contributions](#contributions)
3. [Self Hosting](#self-hosting)
4. [FAQ](#faq)
    1. [Why does this exist?](#why-does-this-exist)
    2. [Why not use _this other_ service?](#why-not-use-this-other-service)
    3. [How does the syncing work?](#how-does-the-syncing-work)
5. Services
    1. [@keeper.sh/api](./packages/api)
    1. [@keeper.sh/cron](./packages/cron)
6. Applications
    1. @keeper.sh/cli _(Coming Soon)_
    1. @keeper.sh/mobile _(Coming Soon)_
    1. @keeper.sh/ssh _(Coming Soon)_
    1. [@keeper.sh/web](./packages/web)
7. Modules
    1. [@keeper.sh/auth](./packages/auth)
    1. [@keeper.sh/auth-plugin-username-only](./packages/auth-plugin-username-only)
    1. [@keeper.sh/broadcast](./packages/broadcast)
    1. [@keeper.sh/broadcast-client](./packages/broadcast-client)
    1. [@keeper.sh/calendar](./packages/calendar)
    1. [@keeper.sh/data-schemas](./packages/data-schemas)
    1. [@keeper.sh/database](./packages/database)
    1. [@keeper.sh/env](./packages/env)
    1. @keeper.sh/eslint-config _(Coming Soon)_
    1. [@keeper.sh/integration-google-calendar](./packages/integration-google-calendar)
    1. [@keeper.sh/integrations](./packages/integrations)
    1. [@keeper.sh/log](./packages/log)
    1. [@keeper.sh/oauth-google](./packages/oauth-google)
    1. [@keeper.sh/premium](./packages/premium)
    1. [@keeper.sh/pull-calendar](./packages/pull-calendar)
    1. [@keeper.sh/redis](./packages/redis)
    1. [@keeper.sh/sync-calendar](./packages/sync-calendar)
    1. [@keeper.sh/sync-events](./packages/sync-events)
    1. [@keeper.sh/typescript-config](./packages/typescript-config)

## Contributions

Valuable contributions are welcome, and appreciated.

## Cloud Hosted Version

If you'd like to _just use_ Keeper, and not worry about hosting it yourself you can do so by signing up for Keeper at [https://keeper.sh/](https://keeper.sh/). The free plan allows for up to two sources, as well as 30-minute syncing intervals. The premium plan available for $8/mo., or $4/mo. when paying annually allows for unlimited source calendars and syncing every minute.

## Self Hosting

If you'll be self-hosting Keeper, please consider sponsoring me or the project to support development or show your appreciation. Self-hosting the project gives you access to premium features like unlimited sources and frequent syncing for free!

Self-hosting guarantees your data never leaves your infrastructure as well. Perfect for privacy-conscious folk!

## FAQ

### Why does this exist?

Once I started [Sedna](https://sedna.sh/)—the shadow AI governance & management platform—I was working across three calendars and events were often being booked over one-another across personal coffee chats, work events, and prospective investor & client meetings.

I needed a very simple syncing solution, and tried many available solutions to no avail.

### Why not use _this_ other service?

Five reasons. 
1. Other solutions are pretty expensive.
2. Other solutions are rarely open-source.
2. Other solutions can be finnicky.
3. Other solutions require over-permissive event access to source calendars.
4. Other solutions often create duplicate events with no way to purge them. Have you ever spent hours deleting three-years worth of synced events from your calendar? I have. Twice.

This means that if I wanted to use one of the existing services, I'd have to give a third-party full access to the events on my employer's, business' and personal calendars. Ew. iCal often has event metadata redaction at the source, so it's much more convenient, simple and secure for this use-case.

### How does the syncing work?

When you add a source URL, it is stored in the database. Every minute, a cron job will run which takes a snapshot of that remote source, and uses `ts-ics` to turn it into a JSON structure. Events are pulled from this structure, and stored in the database.

On an interval, the timeslots of the events from the local snapshot are compared to the timeslots of events _created by Keeper_ on the destination and Keeper will then reconcile any discrepencies if they exist.

User adds new remote source → Cron A job snapshots ICS → Events are parsed and added to database → Cron job B triggers sync → Remote events are requested from destination → Events are compared to local snapshot → Discrepencies are resolved

If Keeper thinks that according to the sources, two events should exist from 15:00 to 16:00 and it sees three, it will delete one. If it sees none, it will create two. 

Keeper does not consider events that it did not create in the reconciliation process by tagging remote UIDs with @keeper.sh. Imagine you have two source calendars: Calendar A & Calendar B as well as a destination calendar: Calendar C. All three have events from 15:00 to 16:00. Keeper will create two events from Calendar C, making a total for three events in that time slot on your destination calendar.
