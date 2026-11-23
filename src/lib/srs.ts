// SM-2 style spaced repetition. rating: 0 = Quên, 1 = Khó, 2 = Được, 3 = Dễ
export type SrsState = { ease: number; interval_days: number; reps: number; lapses: number };

export function nextReview(s: SrsState, rating: 0 | 1 | 2 | 3) {
  let { ease, interval_days, reps, lapses } = s;
  if (rating === 0) {
    lapses += 1;
    reps = 0;
    interval_days = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval_days = rating === 3 ? 3 : 1;
    else if (reps === 2) interval_days = rating === 1 ? 3 : 6;
    else interval_days = Math.round(interval_days * (rating === 1 ? 1.2 : rating === 3 ? ease * 1.3 : ease));
    ease = Math.max(1.3, ease + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0));
  }
  const due = new Date(Date.now() + (interval_days === 0 ? 10 * 60 * 1000 : interval_days * 86400000));
  const status = interval_days >= 21 ? "known" : "learning";
  return { ease, interval_days, reps, lapses, due_at: due.toISOString(), status };
}
