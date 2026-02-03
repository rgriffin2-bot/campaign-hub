interface ProjectClockProps {
  size: number; // 4, 6, or 8 segments
  progress: number; // Number of filled segments
  onChange?: (newProgress: number) => void;
  editable?: boolean;
}

export function ProjectClock({ size, progress, onChange, editable = false }: ProjectClockProps) {
  // Calculate segment angles
  const segmentAngle = 360 / size;
  const segments = Array.from({ length: size }, (_, i) => i);

  const handleSegmentClick = (index: number) => {
    if (!editable || !onChange) return;

    // Clicking a filled segment unfills it and all after it
    // Clicking an unfilled segment fills it and all before it
    if (index < progress) {
      // Click on filled segment - unfill from here
      onChange(index);
    } else {
      // Click on unfilled segment - fill up to and including this one
      onChange(index + 1);
    }
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted"
        />

        {/* Segments */}
        {segments.map((index) => {
          const startAngle = index * segmentAngle;
          const endAngle = (index + 1) * segmentAngle - 2; // -2 for gap between segments
          const isFilled = index < progress;

          // Convert angles to radians
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          // Calculate arc path
          const x1 = 50 + 45 * Math.cos(startRad);
          const y1 = 50 + 45 * Math.sin(startRad);
          const x2 = 50 + 45 * Math.cos(endRad);
          const y2 = 50 + 45 * Math.sin(endRad);

          // Inner arc points (for wedge shape)
          const innerRadius = 15;
          const x3 = 50 + innerRadius * Math.cos(endRad);
          const y3 = 50 + innerRadius * Math.sin(endRad);
          const x4 = 50 + innerRadius * Math.cos(startRad);
          const y4 = 50 + innerRadius * Math.sin(startRad);

          const largeArcFlag = segmentAngle - 2 > 180 ? 1 : 0;

          const pathD = [
            `M ${x1} ${y1}`,
            `A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
            'Z',
          ].join(' ');

          return (
            <path
              key={index}
              d={pathD}
              fill={isFilled ? 'currentColor' : 'transparent'}
              stroke="currentColor"
              strokeWidth="2"
              className={`${
                isFilled ? 'text-primary' : 'text-muted'
              } ${
                editable ? 'cursor-pointer hover:text-primary/70 transition-colors' : ''
              }`}
              onClick={() => handleSegmentClick(index)}
            />
          );
        })}

      </svg>
    </div>
  );
}
