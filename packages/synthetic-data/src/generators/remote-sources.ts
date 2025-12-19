import { randomUUID, randomPastDate } from "../utils/random";

export type GeneratedRemoteSource = {
  id: string;
  userId: string;
  url: string;
  createdAt: Date;
};

export const generateRemoteSource = (
  baseUrl: string,
  userId: string,
  snapshotId: string,
): GeneratedRemoteSource => ({
  id: randomUUID(),
  userId,
  url: new URL(`/snapshots/${snapshotId}.ics`, baseUrl).href,
  createdAt: randomPastDate(30),
});

export const generateRemoteSources = (
  baseUrl: string,
  userId: string,
  snapshotIds: string[],
): GeneratedRemoteSource[] =>
  snapshotIds.map((snapshotId) =>
    generateRemoteSource(baseUrl, userId, snapshotId),
  );
