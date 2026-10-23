import { scoreLabel } from '../../shared/scoring';

export function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const rating = scoreLabel(score);
  const ratingText = { good: 'Good', warn: 'Needs work', bad: 'Poor' }[rating];

  return (
    <figure className={`score-gauge score-${rating}`} style={{ width: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Health score ${score} out of 100, ${ratingText}`}>
        <circle cx="60" cy="60" r={radius} className="score-track" strokeWidth="12" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="score-value"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" className="score-number">
          {score}
        </text>
        <text x="60" y="84" textAnchor="middle" className="score-caption">
          / 100
        </text>
      </svg>
      <figcaption>{ratingText}</figcaption>
    </figure>
  );
}
