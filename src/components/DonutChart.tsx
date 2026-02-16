type DonutSegment = {
  value: number;
  color: string;
};

export function DonutChart({
  size = 236,
  strokeWidth = 34,
  centerLabel,
  trackColor = "var(--border)",
  segments,
}: {
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  trackColor?: string;
  segments: DonutSegment[];
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);

  let consumed = 0;
  const normalized = total > 0 ? segments.map((segment) => ({ ...segment, value: Math.max(segment.value, 0) / total })) : [];

  return (
    <div className="progress-donut-wrap" aria-label={`Task completion ${centerLabel}`}>
      <svg className="progress-donut" viewBox={`0 0 ${size} ${size}`} role="img">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          opacity={0.35}
        />
        {normalized.map((segment, index) => {
          const segmentLength = segment.value * circumference;
          const offset = circumference - consumed;
          consumed += segmentLength;
          return (
            <circle
              key={`${segment.color}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <div className="progress-donut-center">{centerLabel}</div>
      <style jsx>{`
        .progress-donut-wrap {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          flex: 0 0 ${size}px;
        }
        .progress-donut {
          width: 100%;
          height: 100%;
          display: block;
        }
        .progress-donut-center {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--text);
          font-weight: 650;
        }
      `}</style>
    </div>
  );
}
