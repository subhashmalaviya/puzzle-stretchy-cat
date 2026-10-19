/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { MultiplayerToastMsg } from '../types';

interface MultiplayerToastProps {
  toast: MultiplayerToastMsg | null;
}

const MultiplayerToast: React.FC<MultiplayerToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[#18191D]/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 text-white text-[13px] md:text-[14px] font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

export default MultiplayerToast;
