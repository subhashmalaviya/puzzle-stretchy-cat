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
    <div className="flex items-center gap-2">
      <div 
        className="p-[1.5px] rounded-full overflow-hidden shadow-lg" 
        style={gradientBorderStyle}
      >
        <div className="bg-[#000000] rounded-full flex h-[48px] px-3.5 md:px-4 items-center gap-[10px] md:gap-[12px]">
          <div className="min-w-[170px] md:min-w-[240px] flex justify-start">
            <span className={textStyle}>
              Stage {stage} • Level {levelId}/{totalLevels} — {score.toLocaleString()} Pts
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            title="Reset game and save current score to history"
            className="flex h-[35px] px-[16px] md:px-[18px] items-center justify-center bg-[#202020] hover:bg-white text-white hover:text-black rounded-full transition-colors duration-200"
          >
            <span className="text-[14px] md:text-[16px] font-medium leading-[1.2] md:leading-[1.6]">
              Reset
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FooterLeftContent;