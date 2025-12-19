import { log } from "@keeper.sh/log";
import { fetch } from "bun";
import { convertIcsCalendar } from "ts-ics";

const fetchRemoteText = async (url: string) => {
  const response = await fetch(url);
  return response.text();
};

type ParsedCalendarResult = ReturnType<typeof convertIcsCalendar>;

export async function pullRemoteCalendar(
  output: "icap",
  url: string,
): Promise<string>;

export async function pullRemoteCalendar(
  output: "json",
  url: string,
): Promise<ParsedCalendarResult>;

/**
 * @throws
 */
export async function pullRemoteCalendar(
  output: "json" | "icap",
  url: string,
): Promise<string | ParsedCalendarResult> {
  const text = await fetchRemoteText(url);
  if (output === "icap") return text;
  return convertIcsCalendar(undefined, text);
}
