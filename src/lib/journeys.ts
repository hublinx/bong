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
