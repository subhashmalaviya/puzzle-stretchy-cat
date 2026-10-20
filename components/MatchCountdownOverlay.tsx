/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface MatchCountdownOverlayProps {
  onComplete: () => void;
}

const MatchCountdownOverlay: React.FC<MatchCountdownOverlayProps> = ({ onComplete }) => {
  const [count, setCount] = useState<number | string>(3);
  const onCompleteRef = React.useRef(onComplete);

  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    const timer1 = setTimeout(() => setCount(2), 900);
    const timer2 = setTimeout(() => setCount(1), 1800);
    const timer3 = setTimeout(() => setCount('GO! 🏁'), 2700);
    const timerEnd = setTimeout(() => {
      onCompleteRef.current();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerEnd);
    };
  }, []); // Empty array ensures countdown runs strictly once and cannot loop

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="text-white/60 text-[18px] md:text-[22px] font-bold uppercase tracking-widest mb-4">
          All Players Ready!
        </div>

        <div 
          key={String(count)} 
          className="text-white font-black text-[96px] md:text-[140px] leading-none animate-in zoom-in-50 duration-300 drop-shadow-[0_0_35px_rgba(66,133,244,0.6)]"
        >
          {count}
        </div>

        <div className="text-amber-400 font-semibold text-[15px] md:text-[18px] mt-6 flex items-center gap-2">
          <span>⏱️ Continuous clock starting... Stretch to win!</span>
        </div>
      </div>
    </div>
  );
};

export default MatchCountdownOverlay;
