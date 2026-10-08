import type { Timeline, TimelineKind } from '../types';
import { daysBetween, parseDay, startOfToday } from './date';

export const KINDS: Record<TimelineKind, { label: string; emoji: string; hint: string; gradient: string }> = {
  trip: { label: 'Chuyến đi', emoji: '✈️', hint: 'Đi đâu đó cùng nhau, có ngày đi ngày về', gradient: 'linear-gradient(135deg,#1f3b4d,#3f6e7a 55%,#d8b27a)' },
  plan: { label: 'Kế hoạch', emoji: '📝', hint: 'Một dự án chung: dọn nhà, tiết kiệm, cầu hôn…', gradient: 'linear-gradient(135deg,#2b2340,#5a3f6e 55%,#e2a6b4)' },
  dream: { label: 'Dự định', emoji: '🌱', hint: 'Điều muốn làm cùng nhau một ngày nào đó', gradient: 'linear-gradient(135deg,#1e3326,#4c6b45 55%,#d9cf8f)' },
  story: { label: 'Câu chuyện', emoji: '💞', hint: 'Một chương riêng, vd. "Năm đầu yêu nhau"', gradient: 'linear-gradient(135deg,#3a1d24,#7a3a48 55%,#e6c98f)' },
};

export const KIND_KEYS = Object.keys(KINDS) as TimelineKind[];

export const CHECKLIST_TEMPLATES: Record<TimelineKind, string[]> = {
  trip: ['Đặt vé đi lại', 'Đặt chỗ ở', 'Lên lịch trình từng ngày', 'Sạc dự phòng & dây sạc', 'Giấy tờ tuỳ thân', 'Thuốc men cơ bản', 'Quần áo, đồ chống nắng'],
  plan: ['Thống nhất mục tiêu', 'Chia việc cho hai đứa', 'Dự trù ngân sách', 'Chốt hạn hoàn thành'],
  dream: ['Tìm hiểu thêm', 'Để dành ngân sách', 'Chọn thời điểm'],
  story: [],
};

export type JourneyStatus = { key: 'dream' | 'upcoming' | 'ongoing' | 'done'; label: string; detail: string };

export function journeyStatus(t: Timeline, now = startOfToday()): JourneyStatus {
  const s = parseDay(t.startDate);
  if (!s) return { key: 'dream', label: 'Một ngày nào đó', detail: '' };
  const e = parseDay(t.endDate) ?? s;
  const toStart = daysBetween(now, s);
  if (toStart > 0) return { key: 'upcoming', label: toStart === 1 ? 'Ngày mai!' : `Còn ${toStart} ngày`, detail: 'nữa là bắt đầu' };
  const toEnd = daysBetween(now, e);
  if (toEnd >= 0) {
    const day = daysBetween(s, now) + 1;
    const total = daysBetween(s, e) + 1;
    return { key: 'ongoing', label: total > 1 ? `Ngày ${day}/${total}` : 'Hôm nay', detail: 'đang diễn ra' };
  }
  return { key: 'done', label: 'Đã đi qua', detail: `${-toEnd} ngày trước` };
}

/** Ngày về thực tế (không có thì coi như đi trong ngày). */
export function endOf(t: Timeline) {
  return t.endDate && t.endDate >= t.startDate ? t.endDate : t.startDate;
}

export function durationDays(t: Timeline) {
  const s = parseDay(t.startDate);
  const e = parseDay(endOf(t));
  return s && e ? daysBetween(s, e) + 1 : 0;
}

export type SortDir = 'asc' | 'desc';

/** Sắp theo ngày đi, rồi ngày về; hành trình chưa có ngày luôn nằm cuối. */
export function sortJourneys(list: Timeline[], dir: SortDir = 'asc') {
  const k = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    if (!a.startDate || !b.startDate) {
      if (a.startDate) return -1;
      if (b.startDate) return 1;
      return a.createdAt - b.createdAt;
    }
    return k * (a.startDate.localeCompare(b.startDate) || endOf(a).localeCompare(endOf(b)));
  });
}

/** "3 tháng sau", "2 tuần sau"… cho khoảng trống giữa hai mốc */
export function gapLabel(days: number) {
  if (days < 1) return '';
  if (days < 14) return `${days} ngày sau`;
  if (days < 60) return `${Math.round(days / 7)} tuần sau`;
  if (days < 365) return `${Math.round(days / 30)} tháng sau`;
  const y = Math.floor(days / 365);
  const m = Math.round((days % 365) / 30);
  return m ? `${y} năm ${m} tháng sau` : `${y} năm sau`;
}
