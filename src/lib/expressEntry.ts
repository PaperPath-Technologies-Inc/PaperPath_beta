export type ExpressEntryDrawSnapshot = {
  round: string | null;
  dateText: string | null;
  crsCutoff: number | null;
  invitations: number | null;
  sourceUrl: string;
  fetchedAt: string;
};

const ROUNDS_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html";

function extractNumber(text: string) {
  const match = text.match(/([0-9][0-9,]*)/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function clean(value: string | null) {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim();
}

export async function fetchLatestExpressEntryDraw(): Promise<ExpressEntryDrawSnapshot | null> {
  try {
    const response = await fetch(ROUNDS_URL, {
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!response.ok) return null;

    const html = await response.text();

    const round = clean(html.match(/Round #\s*([0-9]+)/i)?.[1] ?? null);
    const dateText =
      clean(html.match(/Date and time of round:\s*<\/strong>\s*([^<]+)/i)?.[1] ?? null) ??
      clean(html.match(/Date and time of round:\s*([A-Za-z]{3,9}\s+[0-9]{1,2},\s+[0-9]{4}[^<\n]*)/i)?.[1] ?? null);

    const crsLabelMatch =
      html.match(/CRS score of lowest-ranked candidate invited:\s*<\/strong>\s*([^<]+)/i)?.[1] ??
      html.match(/CRS score of lowest-ranked candidate invited[^0-9]{0,50}([0-9][0-9,]*)/i)?.[1] ??
      null;
    const invLabelMatch =
      html.match(/Number of invitations issued:\s*<\/strong>\s*([^<]+)/i)?.[1] ??
      html.match(/Number of invitations issued[^0-9]{0,50}([0-9][0-9,]*)/i)?.[1] ??
      null;

    const crsCutoff = crsLabelMatch ? extractNumber(crsLabelMatch) : null;
    const invitations = invLabelMatch ? extractNumber(invLabelMatch) : null;

    if (!round && !dateText && !crsCutoff && !invitations) return null;

    return {
      round,
      dateText,
      crsCutoff,
      invitations,
      sourceUrl: ROUNDS_URL,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

