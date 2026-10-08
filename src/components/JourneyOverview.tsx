import { motion } from 'framer-motion';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MAIN_TIMELINE, type Memory, type Timeline } from '../types';
import { useData } from '../lib/data';
import { daysBetween, formatShort, parseDay, today } from '../lib/date';
import { durationDays, endOf, gapLabel, journeyStatus, KINDS, sortJourneys, type SortDir } from '../lib/journeys';
import { MOODS } from '../lib/moods';
import { IconPin } from './Icons';
import { PhotoImg } from './PhotoImg';

const PX_PER_DAY = 3.2;
const MIN_BAR_PX = 180;

/* ---------- Bản đồ thời gian nằm ngang ---------- */

function Gantt({ journeys, onOpen }: { journeys: Timeline[]; onOpen: (t: Timeline) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const t0 = today();

  const model = useMemo(() => {
    const now = parseDay(t0)!;
    const dated = sortJourneys(
      journeys.filter((t) => t.startDate),
      'asc',
    );
    if (!dated.length) return null;
    let min = now;
    let max = now;
    for (const t of dated) {
      const s = parseDay(t.startDate)!;
      const e = parseDay(endOf(t))!;
      if (s < min) min = s;
      if (e > max) max = e;
    }
    const from = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    const to = new Date(max.getFullYear(), max.getMonth() + 2, 0);
    const total = daysBetween(from, to) + 1;
    const x = (d: Date) => daysBetween(from, d) * PX_PER_DAY;

    // xếp làn để các thanh chồng ngày không đè lên nhau
    const laneEnds: number[] = [];
    const bars = dated.map((t) => {
      const left = x(parseDay(t.startDate)!);
      const width = Math.max((durationDays(t) || 1) * PX_PER_DAY, MIN_BAR_PX);
      let lane = laneEnds.findIndex((end) => end + 8 <= left);
      if (lane < 0) lane = laneEnds.push(0) - 1;
      laneEnds[lane] = left + width;
      return { t, left, width, lane };
    });

    const months: { left: number; label: string; year?: number }[] = [];
    for (let d = new Date(from); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      months.push({
        left: x(d),
        label: `T${d.getMonth() + 1}`,
        year: d.getMonth() === 0 || months.length === 0 ? d.getFullYear() : undefined,
      });
    }
    return { bars, months, width: total * PX_PER_DAY, lanes: laneEnds.length, todayX: x(now) };
  }, [journeys, t0]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && model) el.scrollLeft = Math.max(0, model.todayX - el.clientWidth / 2);
  }, [model]);

  if (!model) return null;

  return (
    <div className="gantt">
      <div className="gantt__scroll" ref={scrollRef}>
        <div className="gantt__canvas" style={{ width: model.width, height: 56 + model.lanes * 58 }}>
          {model.months.map((m) => (
            <div key={m.left} className={`gantt__month ${m.year ? 'is-year' : ''}`} style={{ left: m.left }}>
              <span>
                {m.label}
                {m.year && <b>{m.year}</b>}
              </span>
            </div>
          ))}
          <div className="gantt__today" style={{ left: model.todayX }}>
            <span>Hôm nay</span>
          </div>
          {model.bars.map(({ t, left, width, lane }, i) => {
            const st = journeyStatus(t);
            return (
              <motion.button
                key={t.id}
                className={`gantt__bar st-${st.key}`}
                style={{ left, width, top: 48 + lane * 58, background: KINDS[t.kind].gradient }}
                onClick={() => onOpen(t)}
                initial={{ opacity: 0, scaleX: 0.3 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                title={`${t.title} · ${formatShort(t.startDate)} → ${formatShort(endOf(t))}`}
              >
                <span className="gantt__emoji">{t.emoji}</span>
                <span className="gantt__text">
                  <b>{t.title}</b>
                  <small>
                    {formatShort(t.startDate).slice(0, 5)}
                    {endOf(t) !== t.startDate && ` → ${formatShort(endOf(t)).slice(0, 5)}`} · {durationDays(t)} ngày
                  </small>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Dòng thời gian tổng ---------- */

type Entry = { kind: 'journey'; date: string; t: Timeline } | { kind: 'memory'; date: string; m: Memory } | { kind: 'today'; date: string };

export function JourneyOverview({
  dir,
  onOpen,
  onOpenMemory,
}: {
  dir: SortDir;
  onOpen: (t: Timeline) => void;
  onOpenMemory: (m: Memory) => void;
}) {
  const { doc } = useData();
  const [withMemories, setWithMemories] = useState(true);
  const t0 = today();

  const { entries, dreams } = useMemo(() => {
    const dated = doc.timelines.filter((t) => t.startDate);
    const list: Entry[] = dated.map((t) => ({ kind: 'journey', date: t.startDate, t }));
    if (withMemories) for (const m of doc.memories) if (m.timelineId === MAIN_TIMELINE) list.push({ kind: 'memory', date: m.date, m });
    list.push({ kind: 'today', date: t0 });
    const k = dir === 'asc' ? 1 : -1;
    const rank = (e: Entry) => (e.kind === 'today' ? 1 : 0);
    list.sort(
      (a, b) =>
        k *
        (a.date.localeCompare(b.date) ||
          rank(a) - rank(b) ||
          (a.kind === 'journey' && b.kind === 'journey' ? endOf(a.t).localeCompare(endOf(b.t)) : 0)),
    );
    return { entries: list, dreams: doc.timelines.filter((t) => !t.startDate) };
  }, [doc.timelines, doc.memories, withMemories, dir, t0]);

  const photosOf = (t: Timeline) =>
    doc.memories
      .filter((m) => m.timelineId === t.id)
      .flatMap((m) => m.photoIds)
      .slice(0, 4);

  const totalTripDays = doc.timelines.filter((t) => t.startDate && t.startDate <= t0).reduce((s, t) => s + durationDays(t), 0);
  const places = new Set(doc.timelines.map((t) => t.location.trim().toLowerCase()).filter(Boolean)).size;

  return (
    <div className="overview">
      <div className="overview__stats">
        <div>
          <b>{doc.timelines.length}</b>
          <small>hành trình</small>
        </div>
        <div>
          <b>{totalTripDays}</b>
          <small>ngày đã đi cùng nhau</small>
        </div>
        <div>
          <b>{places}</b>
          <small>nơi chốn</small>
        </div>
        <div>
          <b>{doc.timelines.filter((t) => journeyStatus(t).key === 'upcoming').length}</b>
          <small>sắp tới</small>
        </div>
      </div>

      <Gantt journeys={doc.timelines} onOpen={onOpen} />

      <div className="overview__bar">
        <h3>Dòng thời gian tổng</h3>
        <button className={`chip chip--filter ${withMemories ? 'is-on' : ''}`} onClick={() => setWithMemories((v) => !v)}>
          {withMemories ? 'Đang hiện cả kỉ niệm lẻ' : 'Chỉ hành trình'}
        </button>
      </div>

      <div className="orail">
        {entries.map((e, i) => {
          const prev = entries[i - 1];
          let gap = '';
          if (prev && e.kind !== 'today' && prev.kind !== 'today') {
            const a = parseDay(prev.date);
            const b = parseDay(e.date);
            const days = a && b ? Math.abs(daysBetween(a, b)) : 0;
            if (days > 20) gap = dir === 'asc' ? gapLabel(days) : gapLabel(days).replace('sau', 'trước');
          }
          const key = e.kind === 'journey' ? e.t.id : e.kind === 'memory' ? e.m.id : 'today';
          return (
            <Fragment key={key}>
              {gap && <div className="orail__gap">{gap}</div>}
              {e.kind === 'today' ? (
                <div className="orail__today">
                  <span>Hôm nay · {formatShort(t0)}</span>
                </div>
              ) : e.kind === 'memory' ? (
                <motion.button
                  className="orail__mem"
                  onClick={() => onOpenMemory(e.m)}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <span className="orail__dot" />
                  <span className="orail__date">{formatShort(e.m.date)}</span>
                  {e.m.photoIds[0] && <PhotoImg id={e.m.photoIds[0]} className="orail__memimg" />}
                  <span className="orail__memtitle">
                    {(MOODS[e.m.mood] ?? MOODS.happy).emoji} {e.m.title}
                  </span>
                </motion.button>
              ) : (
                (() => {
                  const t = e.t;
                  const st = journeyStatus(t);
                  const photos = photosOf(t);
                  const count = doc.memories.filter((m) => m.timelineId === t.id).length;
                  return (
                    <motion.button
                      className={`orail__trip is-${st.key}`}
                      onClick={() => onOpen(t)}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className="orail__node" style={{ background: KINDS[t.kind].gradient }}>
                        {t.emoji}
                      </span>
                      <span className="orail__when">
                        <b>{formatShort(t.startDate)}</b>
                        {endOf(t) !== t.startDate && <small>→ {formatShort(endOf(t))}</small>}
                        <em>{durationDays(t)} ngày</em>
                      </span>
                      <span className="orail__card">
                        <span className="orail__head">
                          <span className="journey__kind">
                            {KINDS[t.kind].emoji} {KINDS[t.kind].label}
                          </span>
                          <span className={`orail__status st-${st.key}`}>{st.label}</span>
                        </span>
                        <b className="orail__title">{t.title}</b>
                        <span className="journey__meta">
                          {t.location && (
                            <span>
                              <IconPin size={13} /> {t.location}
                            </span>
                          )}
                          <span>{count} kỉ niệm</span>
                        </span>
                        {photos.length > 0 && (
                          <span className="orail__photos">
                            {photos.map((p) => (
                              <PhotoImg key={p} id={p} />
                            ))}
                          </span>
                        )}
                      </span>
                    </motion.button>
                  );
                })()
              )}
            </Fragment>
          );
        })}
      </div>

      {dreams.length > 0 && (
        <div className="overview__dreams">
          <h3>Một ngày nào đó…</h3>
          <div className="filters__chips">
            {dreams.map((t) => (
              <button key={t.id} className="chip chip--filter" onClick={() => onOpen(t)}>
                {t.emoji} {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
