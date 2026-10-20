/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface StageClearModalProps {
  stage: number;
  stageName: string;
  bonusPoints: number;
  totalScore: number;
  nextStageTotalLevels: number;
  nextStageName: string;
  nextStageFlavor: string;
  onNextStage: () => void;
}

const StageClearModal: React.FC<StageClearModalProps> = ({
  stage,
  stageName,
  bonusPoints,
  totalScore,
  nextStageTotalLevels,
  nextStageName,
  nextStageFlavor,
  onNextStage,
}) => {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="bg-[#0e0f12] text-white p-7 md:p-9 rounded-3xl text-center w-full max-w-md rainbow-border animate-rotate-gradient flex flex-col items-center shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar">
        <span className="text-5xl mb-2 animate-bounce">🌟</span>

        <h2 className="text-white text-[24px] md:text-[28px] font-bold leading-tight">
          Stage {stage} Cleared!
        </h2>
        <p className="text-white/60 text-[14px] mt-1">
          {stageName} Complete
        </p>

        {/* Bonus Card */}
        <div className="my-6 bg-white/5 border border-white/10 rounded-2xl p-4 w-full flex flex-col items-center">
          <div className="text-emerald-400 text-[14px] font-bold uppercase tracking-wider">
            Stage Clear Bonus
          </div>
          <div className="text-emerald-300 text-[36px] font-extrabold tabular-nums leading-tight">
            +{bonusPoints.toLocaleString()}
          </div>
          <div className="text-white/70 text-[13px] mt-1">
            Total Score: <span className="text-white font-bold">{totalScore.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Next Stage Preview */}
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3.5 w-full text-left mb-6">
          <div className="flex items-center justify-between text-[12px] font-bold text-sky-300 uppercase tracking-wider">
            <span>Next: Stage {stage + 1}</span>
            <span className="bg-sky-400/20 px-2 py-0.5 rounded-full text-[11px]">
              {nextStageTotalLevels} Levels (+2)
            </span>
          </div>
          <p className="text-white font-semibold text-[15px] mt-1">
            {nextStageName}
          </p>
          <p className="text-white/60 text-[12px] mt-0.5">
            {nextStageFlavor}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onNextStage}
          className="w-full py-4 bg-white text-black font-bold text-[17px] rounded-full transition-all duration-200 hover:brightness-110 active:scale-95 shadow-lg"
        >
          Enter Stage {stage + 1} ➔
        </button>
      </div>
    </div>
  );
};

export default StageClearModal;
