"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { FREE_SOURCE_LIMIT } from "@keeper.sh/premium/constants";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { GhostButton } from "@/components/ghost-button";
import { Toast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/form-dialog";
import { FormField } from "@/components/form-field";
import { IconBox } from "@/components/icon-box";
import { Section } from "@/components/section";
import { SectionHeader } from "@/components/section-header";
import { BannerText, TextLabel, TextCaption } from "@/components/typography";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useSources, type CalendarSource } from "@/hooks/use-sources";
import { useSubscription } from "@/hooks/use-subscription";
import { button } from "@/styles";
import { Link as LinkIcon, Plus } from "lucide-react";

function getCountLabel(
  isLoading: boolean,
  count: number,
  noun: string,
): string {
  if (isLoading) return "Loading...";
  if (count === 1) return `1 ${noun}`;
  return `${count} ${noun}s`;
}

interface SourceItemProps {
  source: CalendarSource;
  onRemove: () => Promise<void>;
}

const SourceItem = ({ source, onRemove }: SourceItemProps) => {
  const { isOpen, isConfirming, open, setIsOpen, confirm } = useConfirmAction();

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        <IconBox>
          <LinkIcon size={14} className="text-zinc-500" />
        </IconBox>
        <div className="flex-1 min-w-0 flex flex-col">
          <TextLabel as="h2" className="tracking-tight">
            {source.name}
          </TextLabel>
          <TextCaption className="truncate">{source.url}</TextCaption>
        </div>
        <GhostButton variant="danger" onClick={open}>
          Remove
        </GhostButton>
      </div>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Remove Calendar Source"
        description={`Are you sure you want to remove "${source.name}"? Events from this source will no longer be synced.`}
        confirmLabel="Remove"
        confirmingLabel="Removing..."
        isConfirming={isConfirming}
        onConfirm={() => confirm(onRemove)}
      />
    </>
  );
};

const UpgradeBanner = () => (
  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <BannerText variant="warning">
      You've reached the free plan limit of {FREE_SOURCE_LIMIT} sources.
    </BannerText>
    <Link href="/dashboard/billing" className={button({ variant: "primary" })}>
      Upgrade to Pro
    </Link>
  </div>
);

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, url: string) => Promise<void>;
}

const AddSourceDialog = ({
  open,
  onOpenChange,
  onAdd,
}: AddSourceDialogProps) => {
  const { isSubmitting, error, submit } = useFormSubmit<boolean>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const url = formData.get("url");

    const result = await submit(async () => {
      if (typeof name !== "string" || typeof url !== "string") {
        throw new Error("There was an issue with the submitted data");
      }

      await onAdd(name, url);
      return true;
    });

    if (result) {
      onOpenChange(false);
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

  const countLabel = getCountLabel(isLoading, sources?.length ?? 0, "source");
  const isEmpty = !isLoading && (!sources || sources.length === 0);

  return (
    <Section>
      <SectionHeader
        title="Calendar Sources"
        description="Add iCal links to import events from other calendars"
      />
      {isEmpty ? (
        <EmptyState
          icon={<LinkIcon size={20} className="text-zinc-400" />}
          message="No calendar sources yet"
          action={
            <Button
              onClick={() => setIsDialogOpen(true)}
              className={button({ variant: "primary", size: "xs" })}
            >
              Add Source
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="flex items-center justify-between px-3 py-2">
            <TextLabel>{countLabel}</TextLabel>
            <GhostButton
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus size={12} />
              New Source
            </GhostButton>
          </div>
          {sources && sources.length > 0 && (
            <div className="border-t border-zinc-200 divide-y divide-zinc-200">
              {sources.map((source) => (
                <SourceItem
                  key={source.id}
                  source={source}
                  onRemove={() => handleRemoveSource(source.id)}
                />
              ))}
            </div>
          )}
        </Card>
      )}
      {isAtLimit && <UpgradeBanner />}
      {!isAtLimit && (
        <AddSourceDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onAdd={handleAddSource}
        />
      )}
    </Section>
  );
};
