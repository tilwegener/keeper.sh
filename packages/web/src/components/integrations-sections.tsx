"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { FREE_SOURCE_LIMIT } from "@keeper.sh/premium/constants";
import { Toast } from "@/components/toast-provider";
import { FormDialog } from "@/components/form-dialog";
import { FormField } from "@/components/form-field";
import { SectionHeader } from "@/components/section-header";
import { useSources, type CalendarSource } from "@/hooks/use-sources";
import { useSubscription } from "@/hooks/use-subscription";
import {
  button,
  input,
  integrationCard,
  integrationIcon,
  integrationInfo,
  integrationName,
  integrationDescription,
} from "@/styles";

const SourceItem = ({
  source,
  onRemove,
}: {
  source: CalendarSource;
  onRemove: () => void;
}) => (
  <div className={integrationCard()}>
    <div className={integrationInfo()}>
      <div className={integrationName()}>{source.name}</div>
      <div className={integrationDescription()}>{source.url}</div>
    </div>
    <Button onClick={onRemove} className={button({ variant: "secondary" })}>
      Remove
    </Button>
  </div>
);

const SourcesList = ({
  sources,
  isLoading,
  onRemove,
}: {
  sources: CalendarSource[] | undefined;
  isLoading: boolean;
  onRemove: (id: string) => void;
}) => {
  if (isLoading) {
    return <div className="text-sm text-gray-500 py-4">Loading...</div>;
  }

  if (!sources?.length) {
    return (
      <div className="text-sm text-gray-500 py-4">
        No calendar sources added yet
      </div>
    );
  }

  return (
    <>
      {sources.map((source) => (
        <SourceItem
          key={source.id}
          source={source}
          onRemove={() => onRemove(source.id)}
        />
      ))}
    </>
  );
};

const UpgradeBanner = () => (
  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <span className="text-sm text-amber-800">
      You've reached the free plan limit of {FREE_SOURCE_LIMIT} sources.
    </span>
    <Link href="/dashboard/billing" className={button({ variant: "primary" })}>
      Upgrade to Pro
    </Link>
  </div>
);

const AddSourceDialog = ({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, url: string) => Promise<void>;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") ?? "";
    const url = formData.get("url") ?? "";

    try {
      if (typeof name !== "string" || typeof url !== "string") {
        throw Error("There was an issue with the submitted data");
      }

      await onAdd(name, url);
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add source");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Calendar Source"
      description="Enter an iCal URL to import events from another calendar."
      size="md"
      error={error}
      isSubmitting={isSubmitting}
      submitLabel="Add Source"
      submittingLabel="Adding..."
      submitVariant="primary"
      onSubmit={handleSubmit}
      trigger={
        <Button className={button({ variant: "secondary" })}>
          Add iCal Link
        </Button>
      }
    >
      <FormField
        id="source-name"
        name="name"
        label="Name"
        type="text"
        placeholder="Work Calendar"
        autoComplete="off"
        required
      />
      <FormField
        id="source-url"
        name="url"
        label="iCal URL"
        type="url"
        placeholder="https://calendar.google.com/calendar/ical/..."
        autoComplete="off"
        required
      />
    </FormDialog>
  );
};

export const CalendarSourcesSection = () => {
  const toastManager = Toast.useToastManager();
  const { data: sources, isLoading, mutate } = useSources();
  const { data: subscription } = useSubscription();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAtLimit =
    subscription?.plan === "free" &&
    (sources?.length ?? 0) >= FREE_SOURCE_LIMIT;

  const handleAddSource = async (name: string, url: string) => {
    const response = await fetch("/api/ics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });

    if (response.status === 402) {
      throw new Error("Source limit reached. Please upgrade to Pro.");
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to add source");
    }

    await mutate();
    toastManager.add({ title: "Calendar source added" });
  };

  const handleRemoveSource = async (id: string) => {
    try {
      const response = await fetch(`/api/ics/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await mutate();
        toastManager.add({ title: "Calendar source removed" });
      }
    } catch {
      toastManager.add({ title: "Failed to remove source" });
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Calendar Sources"
        description="Add iCal links to import events from other calendars"
      />
      <div className="flex flex-col gap-1.5">
        <SourcesList
          sources={sources}
          isLoading={isLoading}
          onRemove={handleRemoveSource}
        />
        {isAtLimit && <UpgradeBanner />}
        {!isAtLimit && (
          <AddSourceDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onAdd={handleAddSource}
          />
        )}
      </div>
    </section>
  );
};

interface Destination {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const DESTINATIONS: Destination[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Sync your aggregated events to Google Calendar",
    icon: "/integrations/icon-google.svg",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Sync your aggregated events to Outlook",
    icon: "/integrations/icon-outlook.svg",
  },
  {
    id: "caldav",
    name: "CalDAV",
    description: "Sync to any CalDAV-compatible server",
  },
];

const DestinationItem = ({ destination }: { destination: Destination }) => (
  <div className={integrationCard()}>
    <div className={integrationIcon()}>
      {destination.icon && (
        <Image
          src={destination.icon}
          alt={destination.name}
          width={20}
          height={20}
        />
      )}
    </div>
    <div className={integrationInfo()}>
      <div className={integrationName()}>{destination.name}</div>
      <div className={integrationDescription()}>{destination.description}</div>
    </div>
    <Button className={button({ variant: "secondary" })}>Connect</Button>
  </div>
);

export const DestinationsSection = () => (
  <section className="flex flex-col gap-3">
    <SectionHeader
      title="Destinations"
      description="Push your aggregated events to other calendar apps"
    />
    <div className="flex flex-col gap-1.5">
      {DESTINATIONS.map((destination) => (
        <DestinationItem key={destination.id} destination={destination} />
      ))}
    </div>
  </section>
);

export const ICalLinkSection = () => {
  const toastManager = Toast.useToastManager();
  const icalUrl = "https://keeper.sh/cal/abc123.ics";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(icalUrl);
    toastManager.add({ title: "Copied to clipboard" });
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Your iCal Link"
        description="Subscribe to this link to view your aggregated events"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={icalUrl}
          readOnly
          className={input({ readonly: true, className: "flex-1" })}
        />
        <Button
          onClick={copyToClipboard}
          className={button({ variant: "secondary" })}
        >
          Copy
        </Button>
      </div>
    </section>
  );
};
