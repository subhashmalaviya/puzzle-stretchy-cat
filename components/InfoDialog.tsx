/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useCallback, useEffect, useRef } from "react";
import { getPath } from '../utils/path';

const InfoDialog: React.FC<{
  title: string;
  goal: string;
  goalNote?: string;
  onClose?: () => void;
}> = ({ title, goal, goalNote, onClose = () => {} } ) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

   useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  const dismissInfoDialog = useCallback(() => {
    // play the background music when the dialog is dismissed
    // playBackground(getPath("/media/audio/music/GiO26_Music_Loop_Final.mp3"));

    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleBackdropClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        dismissInfoDialog();
      }
    };
    
    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [dismissInfoDialog]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto p-0 border-none rounded-3xl bg-white shadow-2xl backdrop:bg-black/60 focus:outline-none w-[92vw] max-w-[380px] sm:max-w-[420px] max-h-[85vh] overflow-y-auto overscroll-contain"
    >
      <div className="flex w-full flex-col overflow-hidden relative pt-14 sm:pt-16 pb-6 px-5 sm:px-7">
        {/* Top Decorative Arc Icon */}
        <img
          src={getPath('/images/builds/info-icon.png')}
          className="w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          alt="Information Icon"
        />

        {/* Close Button */}
        <button 
          aria-label="dismiss dialog" 
          onClick={() => dismissInfoDialog()} 
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 active:scale-95 text-neutral-700 hover:text-black flex items-center justify-center transition-all cursor-pointer z-20"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6.0294 18L5 16.9706L10.4706 11.5L5 6.0294L6.0294 5L11.5 10.4706L16.9706 5L18 6.0294L12.5294 11.5L18 16.9706L16.9706 18L11.5 12.5294L6.0294 18Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* Content with responsive typography and spacing */}
        <div className="flex flex-col items-center text-center mt-2">
          <h3 className="font-extrabold text-[18px] sm:text-[20px] text-neutral-900 tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-neutral-700 font-medium text-[13px] sm:text-[14px] md:text-[15px] leading-relaxed max-w-sm">
            {goal}
          </p>
          {goalNote && (
            <p className="font-medium text-[12px] sm:text-[13px] text-neutral-500 mt-3 pt-2.5 border-t border-neutral-200 w-full text-center">
              {goalNote}
            </p>
          )}

          {/* Quick Got It button */}
          <button
            type="button"
            onClick={() => dismissInfoDialog()}
            className="mt-4 w-full py-2.5 px-4 bg-black hover:bg-neutral-800 text-white rounded-full font-bold text-[13px] sm:text-[14px] transition-all active:scale-95 shadow-md cursor-pointer"
          >
            Got It!
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default InfoDialog;