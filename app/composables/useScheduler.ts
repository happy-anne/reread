import type { Book, ReadingSet, ReadingSetItem, DailySchedule } from "~/types";

/**
 * Returns all dates in [start, end] that are not rest days.
 * restDays: 0=Sun, 1=Mon, ..., 6=Sat
 */
export function getReadingDates(start: string, end: string, restDays: number[]): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    if (!restDays.includes(cur.getDay())) {
      dates.push(cur.toISOString().slice(0, 10));
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
 * Calculates total readable pages across all books in the set × reread count.
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
 * Builds a day-by-day schedule mapping each reading date to a specific page range.
 *
 * Algorithm:
 * 1. Distribute total pages evenly across available reading days.
 * 2. Walk through books in sequence, assigning pages per day.
 * 3. When one book finishes, continue the same day with the next book (no split days).
 *    Actually: we finish the book on the day it ends, then the next book starts the next day.
 *    This keeps "current book" always 1 and avoids mid-day book switches.
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

    const { book, round, occurrence } = sequence[seqIdx];
    const bookLastPage = book.total_pages;
    const remaining = bookLastPage - currentPage + 1;

    const todayPages = Math.min(pagesPerDay, remaining);
    const endPage = currentPage + todayPages - 1;

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

    if (endPage >= bookLastPage) {
      seqIdx++;
      currentPage = sequence[seqIdx]?.book.start_page ?? 1;
    } else {
      currentPage = endPage + 1;
    }
  }

  return schedule;
}

/**
 * Recalculates remaining schedule from today onward based on actual page read.
 * Returns updated schedule for dates >= today.
 */
export function redistributeSchedule(
  fullSchedule: DailySchedule[],
  today: string,
  actualPageRead: number,
  restDays: number[],
  endDate: string
): DailySchedule[] {
  const todayEntry = fullSchedule.find((s) => s.date === today);
  if (!todayEntry) return fullSchedule;

  const pastSchedule = fullSchedule.filter((s) => s.date < today);
  const futureReadingDates = getReadingDates(
    getNextDate(today),
    endDate,
    restDays
  );

  // Find remaining pages from current position
  const allEntries = fullSchedule.filter((s) => s.date >= today);
  // Build remaining segments starting from actualPageRead+1 in current book
  // We need to reconstruct remaining pages across all future book occurrences
  const currentBook = allEntries[0];
  if (!currentBook) return pastSchedule;

  // Remaining pages in current book
  const remainingInCurrentBook = currentBook.end_page - actualPageRead;
  // All subsequent day entries (future books)
  const subsequentEntries = fullSchedule.filter((s) => s.date > today);

  let totalRemainingPages = remainingInCurrentBook;
  for (const entry of subsequentEntries) {
    totalRemainingPages += entry.pages_count;
  }

  if (futureReadingDates.length === 0) return pastSchedule;

  const newPagesPerDay = Math.ceil(totalRemainingPages / (futureReadingDates.length + 1));

  // Rebuild future schedule
  // We carry over the current book sequence
  const bookSegments: { book_id: string; book_title: string; pages: number; start_page: number; end_page: number; round: number; occurrence: number }[] = [];

  if (remainingInCurrentBook > 0) {
    bookSegments.push({
      book_id: currentBook.book_id,
      book_title: currentBook.book_title,
      pages: remainingInCurrentBook,
      start_page: actualPageRead + 1,
      end_page: currentBook.end_page, // original end of this book occurrence
      round: currentBook.reread_round,
      occurrence: currentBook.book_occurrence,
    });
  }

  // Collect subsequent unique book occurrences from future entries
  const seen = new Set<number>();
  for (const entry of subsequentEntries) {
    if (!seen.has(entry.book_occurrence)) {
      seen.add(entry.book_occurrence);
      const lastEntry = subsequentEntries.filter((e) => e.book_occurrence === entry.book_occurrence).at(-1)!;
      bookSegments.push({
        book_id: entry.book_id,
        book_title: entry.book_title,
        pages: subsequentEntries.filter((e) => e.book_occurrence === entry.book_occurrence).reduce((s, e) => s + e.pages_count, 0),
        start_page: entry.start_page,
        end_page: lastEntry.end_page,
        round: entry.reread_round,
        occurrence: entry.book_occurrence,
      });
    }
  }

  // Assign new pages per day to future dates (today + future)
  const allFutureDates = [today, ...futureReadingDates];
  const newFutureSchedule: DailySchedule[] = [];
  let segIdx = 0;
  let segRemaining = bookSegments[0]?.pages ?? 0;
  let segCurrentPage = bookSegments[0]?.start_page ?? 1;

  for (const date of allFutureDates) {
    if (segIdx >= bookSegments.length) break;
    const seg = bookSegments[segIdx];
    const todayPages = Math.min(newPagesPerDay, segRemaining);
    const endPage = segCurrentPage + todayPages - 1;

    newFutureSchedule.push({
      date,
      book_id: seg.book_id,
      book_title: seg.book_title,
      start_page: segCurrentPage,
      end_page: endPage,
      pages_count: todayPages,
      reread_round: seg.round,
      book_occurrence: seg.occurrence,
    });

    segRemaining -= todayPages;
    segCurrentPage = endPage + 1;

    if (segRemaining <= 0) {
      segIdx++;
      segRemaining = bookSegments[segIdx]?.pages ?? 0;
      segCurrentPage = bookSegments[segIdx]?.start_page ?? 1;
    }
  }

  return [...pastSchedule, ...newFutureSchedule];
}

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
