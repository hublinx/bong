import { animate, motion, useMotionValue, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useData } from '../lib/data';
import { daysBetween, formatShort, nextAnniversary, nextHundred, parseDay, startOfToday, toDayString, ymdBetween } from '../lib/date';
import { IconCalendar, IconChevron } from './Icons';

function CountUp({ to }: { to: number }) {
  const mv = useMotionValue(0);
  const [v, setV] = useState(0);
  useEffect(() => {
    const ctrl = animate(mv, to, { duration: 2.4, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => ctrl.stop();
  }, [to, mv]);
  return <>{v.toLocaleString('vi-VN')}</>;
}

export function Hero({ onSetup, onExplore }: { onSetup: () => void; onExplore: () => void }) {
  const { settings, memories } = useData();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 140]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  const start = parseDay(settings.startDate);
  const now = startOfToday();
  const stats = useMemo(() => {
    if (!start) return null;
    const days = daysBetween(start, now) + 1; // tính cả ngày đầu tiên
    return {
      days,
      ymd: ymdBetween(start, now),
      anniv: nextAnniversary(start, now),
      hundred: nextHundred(start, now),
    };
  }, [settings.startDate]);

  const photoCount = memories.reduce((s, m) => s + m.photoIds.length, 0);
  const future = stats && stats.days <= 0;

  return (
    <header className="hero">
      <motion.div className="hero__inner" style={{ y, opacity }}>
        <motion.p
          className="hero__eyebrow"
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.38em' }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        >
          Our little universe
        </motion.p>

        <h1 className="hero__title">
          <motion.span
            className="hero__name"
            initial={{ opacity: 0, x: -40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {settings.myName}
          </motion.span>
          <motion.span
            className="hero__amp"
            initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.4, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            &amp;
          </motion.span>
          <motion.span
            className="hero__name"
            initial={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {settings.partnerName}
          </motion.span>
        </h1>

        <motion.p
          className="hero__tagline"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          {settings.tagline}
        </motion.p>

        <motion.div
          className="hero__counter"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {stats && !future ? (
            <>
              <div className="counter">
                <span className="counter__num">
                  <CountUp to={stats.days} />
                </span>
                <span className="counter__label">ngày bên nhau</span>
              </div>
              <div className="counter__breakdown">
                {stats.ymd.years > 0 && (
                  <span>
                    <b>{stats.ymd.years}</b> năm
                  </span>
                )}
                {(stats.ymd.years > 0 || stats.ymd.months > 0) && (
                  <span>
                    <b>{stats.ymd.months}</b> tháng
                  </span>
                )}
                <span>
                  <b>{stats.ymd.days}</b> ngày
                </span>
                <span className="counter__since">kể từ {formatShort(settings.startDate)}</span>
              </div>
              <div className="milestones">
                <div className="milestone">
                  <span className="milestone__k">Kỉ niệm {stats.anniv.years} năm</span>
                  <span className="milestone__v">
                    {stats.anniv.inDays === 0 ? 'Hôm nay! 🎉' : `còn ${stats.anniv.inDays} ngày`}
                  </span>
                  <span className="milestone__d">{formatShort(toDayString(stats.anniv.date))}</span>
                </div>
                <div className="milestone">
                  <span className="milestone__k">Mốc {stats.hundred.count.toLocaleString('vi-VN')} ngày</span>
                  <span className="milestone__v">còn {stats.hundred.inDays} ngày</span>
                  <span className="milestone__d">{formatShort(toDayString(stats.hundred.date))}</span>
                </div>
                <div className="milestone">
                  <span className="milestone__k">Đã lưu giữ</span>
                  <span className="milestone__v">{memories.length} kỉ niệm</span>
                  <span className="milestone__d">{photoCount} tấm ảnh</span>
                </div>
              </div>
            </>
          ) : (
            <button className="btn btn--gold btn--lg" onClick={onSetup}>
              <IconCalendar size={18} />
              {future ? 'Ngày bắt đầu đang ở tương lai — sửa lại nhé' : 'Chọn ngày chúng mình bắt đầu'}
            </button>
          )}
        </motion.div>
      </motion.div>

      <motion.button
        className="hero__scroll"
        onClick={onExplore}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        aria-label="Xem kỉ niệm"
      >
        <span>Kỉ niệm</span>
        <IconChevron dir="down" size={18} />
      </motion.button>
    </header>
  );
}
