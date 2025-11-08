'use client';

import { useEffect, useMemo, useState } from 'react';

const DURATION_MS = 3000;
const ROW_COUNT = 6;
const FISH_PER_ROW = 10;

const LandingLoader = () => {
  const [visible, setVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  const rows = useMemo(() => Array.from({ length: ROW_COUNT }), []);
  const fish = useMemo(() => Array.from({ length: FISH_PER_ROW }), []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, DURATION_MS - 600);

    const timer = setTimeout(() => {
      setVisible(false);
    }, DURATION_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black transition-opacity duration-600 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="landing-loader">
        {rows.map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="landing-loader__row"
            style={{
              animationDelay: `${rowIdx * 0.25}s`,
              top: `${12 + rowIdx * 12}%`,
            }}
          >
            {fish.map((_, fishIdx) => (
              <div key={fishIdx} className="landing-loader__fish" />
            ))}
          </div>
        ))}
        <div className="landing-loader__progress">
          <div className="landing-loader__progress-track">
            <span className="landing-loader__progress-bar" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingLoader;

