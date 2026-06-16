import type { Book, ReadingSet, ReadingSetItem, DailySchedule } from "~/types";

/** Format a Date as YYYY-MM-DD in local time (avoids UTC offset issues) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string as a local midnight Date */
function parseLocalDate(str: string): Date {
  const parts = str.split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

/**
 * Returns all dates in [start, end] that are not rest days.
 * restDays: 0=Sun, 1=Mon, ..., 6=Sat
 */
export function getReadingDates(start: string, end: string, restDays: number[]): string[] {
  const dates: string[] = [];
  const cur = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  while (cur <= endDate) {
    if (!restDays.includes(cur.getDay())) {
      dates.push(toLocalDateStr(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Builds the full ordered sequence of (book, occurrence) pairs for all reruns.
 * e.g. books [A,C,D] × 2 reruns → [A1, C1, D1, A2, C2, D2]
 */
export function buildBookSequence(
  items: ReadingSetItem[],
  rereadCount: number
): { book: Book; round: number; occurrence: number }[] {
  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
  const seq: { book: Book; round: number; occurrence: number }[] = [];
  let occ = 0;
  for (let r = 1; r <= rereadCount; r++) {
    for (const item of sorted) {
      if (!item.book) continue;
      seq.push({ book: item.book, round: r, occurrence: occ++ });
    }
  }
  return seq;
}

/**
 * Calculates total readable pages across all books × reread count.
 */
export function calcTotalPages(items: ReadingSetItem[], rereadCount: number): number {
  return (
    items.reduce((sum, item) => {
      const readable = item.book ? item.book.readable_pages : 0;
      return sum + readable;
    }, 0) * rereadCount
  );
}

/**
 * Computes the live (auto-redistributed) schedule starting from `today`,
 * based on the user's actual last-read position (from past logs) rather
 * than the static original plan. This is the core "자동 재분배" feature:
 * remaining pages are spread evenly across remaining reading days.
 *
 * - If a log exists for `today`, its target range is returned unchanged
 *   (already committed for today).
 * - Otherwise, position = last log with actual_page set (most recent date
 *   before today), or the very start of the sequence if no logs exist.
 * - Remaining pages (from position+1 to the end of all reread rounds) are
 *   divided across reading days from today through end_date.
 */
export function computeLiveSchedule(
  set: ReadingSet,
  items: ReadingSetItem[],
  today: string,
  pastLogs: { log_date: string; book_occurrence: number; actual_page: number | null; status: string }[]
): DailySchedule | null {
  const sequence = buildBookSequence(items, set.reread_count);
  if (sequence.length === 0) return null;

  // Find the most recent log strictly before today with an actual page recorded
  const priorLogs = pastLogs
    .filter((l) => l.log_date < today && l.actual_page != null)
    .sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
  const lastLog = priorLogs[0];

  let occurrence = 0;
  let lastPage = sequence[0]!.book.start_page - 1;
  if (lastLog) {
    occurrence = lastLog.book_occurrence;
    lastPage = lastLog.actual_page!;
  }

  // Build remaining segments from current position onward
  const segments: { book: Book; round: number; occurrence: number; startPage: number }[] = [];
  for (const item of sequence) {
    if (item.occurrence < occurrence) continue;
    if (item.occurrence === occurrence) {
      const nextPage = lastPage + 1;
      if (nextPage <= item.book.total_pages) {
        segments.push({ ...item, startPage: nextPage });
      }
    } else {
      segments.push({ ...item, startPage: item.book.start_page });
    }
  }

  if (segments.length === 0) return null; // entire plan finished

  const totalRemaining = segments.reduce(
    (sum, seg) => sum + (seg.book.total_pages - seg.startPage + 1),
    0
  );

  const remainingDates = getReadingDates(today, set.end_date, set.rest_days ?? []);
  if (remainingDates.length === 0) return null;

  const pagesPerDay = Math.ceil(totalRemaining / remainingDates.length);

  let currentPage = segments[0]!.startPage;
  let segIdx = 0;
  let budgetLeft = pagesPerDay;
  let result: DailySchedule | null = null;

  while (budgetLeft > 0 && segIdx < segments.length) {
    const seg = segments[segIdx]!;
    const remainingInBook = seg.book.total_pages - currentPage + 1;
    const todayPages = Math.min(budgetLeft, remainingInBook);
    const endPage = currentPage + todayPages - 1;

    if (!result) {
      result = {
        date: today,
        book_id: seg.book.id,
        book_title: seg.book.title,
        start_page: currentPage,
        end_page: endPage,
        pages_count: todayPages,
        reread_round: seg.round,
        book_occurrence: seg.occurrence,
      };
    } else {
      // Today's budget spans into a second book — extend the visible range
      result.end_page = endPage;
      result.pages_count += todayPages;
    }

    budgetLeft -= todayPages;

    if (endPage >= seg.book.total_pages) {
      segIdx++;
      currentPage = segments[segIdx]?.startPage ?? 1;
    } else {
      currentPage = endPage + 1;
      break;
    }
  }

  return result;
}
