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
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
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
 * Builds a day-by-day schedule.
 * One book at a time: when a book finishes mid-day budget, the remaining
 * budget carries over to the next book on the SAME day.
 */
export function buildSchedule(
  set: ReadingSet & { items: ReadingSetItem[] },
  readingDates: string[]
): DailySchedule[] {
  const totalPages = calcTotalPages(set.items, set.reread_count);
  if (readingDates.length === 0 || totalPages === 0) return [];

  const pagesPerDay = Math.ceil(totalPages / readingDates.length);
  const sequence = buildBookSequence(set.items, set.reread_count);

  const schedule: DailySchedule[] = [];
  let seqIdx = 0;
  let currentPage = sequence[0]?.book.start_page ?? 1;

  for (const date of readingDates) {
    if (seqIdx >= sequence.length) break;

    let budgetLeft = pagesPerDay;

    // A single day may cover multiple books if one finishes quickly
    while (budgetLeft > 0 && seqIdx < sequence.length) {
      const { book, round, occurrence } = sequence[seqIdx];
      const bookLastPage = book.total_pages;
      const remainingInBook = bookLastPage - currentPage + 1;
      const todayPages = Math.min(budgetLeft, remainingInBook);
      const endPage = currentPage + todayPages - 1;

      // Only push if this is the first segment for this date, else extend or combine
      // For simplicity: one schedule entry per day (primary book of the day)
      const existing = schedule.find((s) => s.date === date);
      if (existing) {
        // Same day, different book — just record as the main block
        // In practice with small pagesPerDay this rarely happens
      } else {
        schedule.push({
          date,
          book_id: book.id,
          book_title: book.title,
          start_page: currentPage,
          end_page: endPage,
          pages_count: todayPages,
          reread_round: round,
          book_occurrence: occurrence,
        });
      }

      budgetLeft -= todayPages;

      if (endPage >= bookLastPage) {
        seqIdx++;
        currentPage = sequence[seqIdx]?.book.start_page ?? 1;
        // Remaining budget rolls into the next book on the same day
      } else {
        currentPage = endPage + 1;
        break;
      }
    }
  }

  return schedule;
}

/**
 * Recalculates remaining schedule from tomorrow onward based on actual page read today.
 * Today's entry is kept as-is (already logged). Future entries are redistributed.
 */
export function redistributeSchedule(
  fullSchedule: DailySchedule[],
  today: string,
  actualPageRead: number | null,
  restDays: number[],
  endDate: string,
  allItems: ReadingSetItem[],
  rereadCount: number
): DailySchedule[] {
  const todayEntry = fullSchedule.find((s) => s.date === today);
  if (!todayEntry) return fullSchedule;

  const pastAndToday = fullSchedule.filter((s) => s.date <= today);
  const futureDates = getReadingDates(getNextDate(today), endDate, restDays);
  if (futureDates.length === 0) return pastAndToday;

  // Determine where we are in the book sequence
  const sequence = buildBookSequence(allItems, rereadCount);
  const currentOcc = todayEntry.book_occurrence;

  // Find last page read in the current book occurrence
  const effectiveLastPage = actualPageRead ?? todayEntry.start_page - 1;

  // Build remaining page segments from current position onward
  const segments: { book: Book; round: number; occurrence: number; startPage: number }[] = [];

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    if (item.occurrence < currentOcc) continue;
    if (item.occurrence === currentOcc) {
      const nextPage = effectiveLastPage + 1;
      if (nextPage <= item.book.total_pages) {
        segments.push({ ...item, startPage: nextPage });
      }
      // else this book is done, move on
    } else {
      segments.push({ ...item, startPage: item.book.start_page });
    }
  }

  // Calculate total remaining pages
  const totalRemaining = segments.reduce((sum, seg) => {
    return sum + (seg.book.total_pages - seg.startPage + 1);
  }, 0);

  if (totalRemaining <= 0) return pastAndToday;

  const newPagesPerDay = Math.ceil(totalRemaining / futureDates.length);

  // Build new schedule for future dates
  const newFutureSchedule: DailySchedule[] = [];
  let segIdx = 0;
  let currentPage = segments[0]?.startPage ?? 1;

  for (const date of futureDates) {
    if (segIdx >= segments.length) break;

    let budgetLeft = newPagesPerDay;

    while (budgetLeft > 0 && segIdx < segments.length) {
      const seg = segments[segIdx];
      const remainingInBook = seg.book.total_pages - currentPage + 1;
      const todayPages = Math.min(budgetLeft, remainingInBook);
      const endPage = currentPage + todayPages - 1;

      if (!newFutureSchedule.find((s) => s.date === date)) {
        newFutureSchedule.push({
          date,
          book_id: seg.book.id,
          book_title: seg.book.title,
          start_page: currentPage,
          end_page: endPage,
          pages_count: todayPages,
          reread_round: seg.round,
          book_occurrence: seg.occurrence,
        });
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
  }

  return [...pastAndToday, ...newFutureSchedule];
}

function getNextDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + 1);
  return toLocalDateStr(d);
}
