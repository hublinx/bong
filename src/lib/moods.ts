import type { MoodKey } from '../types';

export const MOODS: Record<MoodKey, { emoji: string; label: string }> = {
  love: { emoji: '🥰', label: 'Ngọt ngào' },
  happy: { emoji: '✨', label: 'Hạnh phúc' },
  fun: { emoji: '😆', label: 'Vui nhộn' },
  touched: { emoji: '🥹', label: 'Xúc động' },
  adventure: { emoji: '✈️', label: 'Phiêu lưu' },
  celebrate: { emoji: '🎉', label: 'Đáng nhớ' },
  food: { emoji: '🍜', label: 'Ăn uống' },
  calm: { emoji: '🌙', label: 'Bình yên' },
  sad: { emoji: '🌧️', label: 'Có chút buồn' },
};

export const MOOD_KEYS = Object.keys(MOODS) as MoodKey[];
