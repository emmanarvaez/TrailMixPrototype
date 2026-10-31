// The illustrated mountain with the top four hikes placed on it, #1 at the summit
export default function MountainScene({ ranking }: { ranking: string[] }) {
  return (
    <div className="mountain-scene">
      <div className="sun-disc" />
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <svg aria-hidden="true" className="mountains" preserveAspectRatio="none" viewBox="0 0 390 430">
        <path className="mountain-back" d="M-20 340 90 115l58 101 57-142 205 266Z" />
        <path className="mountain-front" d="M-15 410 105 212l67 83 61-113 170 228Z" />
        <path className="snow" d="m205 74 57 72-34-13-20 26-28-25-32 19Z" />
        <path className="ridge" d="m22 382 87-167 65 81 61-113 145 201" />
      </svg>
      <div className="rank-list">
        {ranking.slice(0, 4).map((name, index) => (
          <div className={`rank-item rank-${index + 1}`} key={name}>
            <span className="rank-number">#{index + 1}</span>
            <span className="rank-name">{name}</span>
          </div>
        ))}
      </div>
      <img alt="" className="figma-mountain-guide" src="/assets/2cec3.svg" />
    </div>
  );
}
