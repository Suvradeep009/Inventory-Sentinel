const tierConfig = {
  VERY_BAD:  { pillClass: 'pill-badge--coral',   label: 'Very Bad'  },
  BAD:       { pillClass: 'pill-badge--coral',   label: 'Bad'       },
  NEUTRAL:   { pillClass: 'pill-badge--neutral', label: 'Neutral'   },
  GOOD:      { pillClass: 'pill-badge--mint',    label: 'Good'      },
  VERY_GOOD: { pillClass: 'pill-badge--mint',    label: 'Very Good' },
};

export default function SentimentBadge({ tier, confidence }) {
  const config = tierConfig[tier] || tierConfig.NEUTRAL;

  return (
    <span className={`pill-badge ${config.pillClass}`}>
      <span>{config.label}</span>
      {confidence !== undefined && (
        <span style={{ opacity: 0.75, fontSize: '0.65rem' }}>
          {(confidence * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
}
