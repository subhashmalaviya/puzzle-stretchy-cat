/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface FooterLeftContentProps {
  stage?: number;
  levelId: number;
  totalLevels: number;
  score: number;
  onReset: () => void;
  onOpenHistory?: () => void;
}

const FooterLeftContent: React.FC<FooterLeftContentProps> = ({ 
  stage = 1,
  levelId,
  totalLevels,
  score,
  onReset,
  onOpenHistory,
}) => {
  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  const textStyle = "text-white text-[14px] md:text-[17px] font-medium leading-[1.2] md:leading-[1.6] md:tracking-[-0.36px] whitespace-nowrap";

  return (
    <div className="flex items-center justify-center max-w-[95vw]">
      <div 
        className="p-[1.2px] md:p-[1.5px] rounded-full overflow-hidden shadow-lg w-full" 
        style={gradientBorderStyle}
      >
        <div className="bg-[#000000] rounded-full flex h-[40px] sm:h-[44px] md:h-[48px] px-3 sm:px-3.5 md:px-4 items-center justify-between gap-2 md:gap-[12px]">
          <div className="flex justify-start items-center">
            <span className="text-white text-[11.5px] sm:text-[13px] md:text-[16px] font-semibold whitespace-nowrap">
              Stage {stage} • Level {levelId}/{totalLevels} — {score.toLocaleString()} Pts
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            title="Reset game and save current score to history"
            className="flex h-[28px] sm:h-[32px] md:h-[35px] px-2.5 sm:px-3.5 md:px-[18px] items-center justify-center bg-[#202020] hover:bg-white text-white hover:text-black rounded-full transition-colors duration-200 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="text-[12px] sm:text-[14px] md:text-[16px] font-semibold">
              Reset
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FooterLeftContent;