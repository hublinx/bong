const MONTHS = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
  'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai',
];
const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Parse YYYY-MM-DD thành Date theo giờ địa phương (tránh lệch múi giờ). */
export function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toDayString(new Date());
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}

export function formatLong(s: string): string {
  const d = parseDay(s);
  if (!d) return s;
  return `${WEEKDAYS[d.getDay()]}, ngày ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}, ${d.getFullYear()}`;
}

export function formatShort(s: string): string {
  const d = parseDay(s);
  if (!d) return s;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const DAY_MS = 86_400_000;

export function daysBetween(a: Date, b: Date): number {
  // dùng UTC để không bị lệch vì giờ mùa hè
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

/** Số năm / tháng / ngày tròn giữa hai mốc. */
export function ymdBetween(from: Date, to: Date): { years: number; months: number; days: number } {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** Ngày kỉ niệm tiếp theo (tròn năm) tính từ hôm nay. */
export function nextAnniversary(start: Date, now = startOfToday()): { date: Date; years: number; inDays: number } {
  let years = now.getFullYear() - start.getFullYear();
  let date = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  if (daysBetween(now, date) <= 0) {
    years += 1;
    date = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  }
  return { date, years, inDays: daysBetween(now, date) };
}

/** Mốc "tròn trăm ngày" kế tiếp, ví dụ 500, 1000 ngày. */
export function nextHundred(start: Date, now = startOfToday()): { count: number; inDays: number; date: Date } {
  const passed = daysBetween(start, now);
  const count = (Math.floor(passed / 100) + 1) * 100;
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + count);
  return { count, inDays: count - passed, date };
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return formatShort(toDayString(new Date(ts)));
}
