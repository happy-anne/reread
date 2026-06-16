export interface Book {
  id: string;
  user_id: string;
  title: string;
  total_pages: number;
  start_page: number;
  readable_pages: number; // computed: total_pages - (start_page - 1)
  created_at: string;
  updated_at: string;
}

export interface ReadingSet {
  id: string;
  user_id: string;
  name: string;
  reread_count: number;
  start_date: string;
  end_date: string;
  rest_days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  created_at: string;
  updated_at: string;
  // relations
  items?: ReadingSetItem[];
}

export interface ReadingSetItem {
  id: string;
  set_id: string;
  book_id: string;
  order_index: number;
  book?: Book;
}

export interface ReadingLog {
  id: string;
  user_id: string;
  set_id: string;
  book_id: string;
  log_date: string; // YYYY-MM-DD
  target_start_page: number;
  target_end_page: number;
  book_occurrence: number; // which book occurrence in the set's full reread sequence
  actual_page: number | null; // last page actually read
  status: "completed" | "partial" | "not_done" | "passed";
  created_at: string;
  updated_at: string;
}

export interface DailySchedule {
  date: string;
  book_id: string;
  book_title: string;
  start_page: number;
  end_page: number;
  pages_count: number;
  reread_round: number; // which round (1st, 2nd, ...)
  book_occurrence: number; // which occurrence in the full sequence
}

export interface SetProgress {
  set: ReadingSet;
  current_book: Book | null;
  today_schedule: DailySchedule | null;
  total_pages: number;
  pages_read: number;
  progress_percent: number;
  days_remaining: number;
  estimated_completion: string;
  daily_pages_required: number;
}

export type LogStatus = "completed" | "partial" | "not_done" | "passed";

export interface UserSettings {
  id: string;
  user_id: string;
  notification_time: string | null; // "21:00"
  rest_days: number[]; // per-user default (overridden per set)
  created_at: string;
  updated_at: string;
}
