import React from 'react';
import { Resolution } from '../../types';

interface ResolutionSelectorProps {
  value: Resolution;
  onChange: (resolution: Resolution) => void;
}

export const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({ value, onChange }) => {
  const resolutions: Resolution[] = ['1K', '2K', '4K'];

  return (
    <div className="flex bg-zinc-800 rounded-lg p-1">
      {resolutions.map((res) => (
        <button
          key={res}
          /* font-normal instead of font-medium */
          className={`flex-1 py-1.5 px-3 text-sm font-normal rounded-md transition-all
            ${value === res ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}
          `}
          onClick={() => onChange(res)}
        >
          {res}
        </button>
      ))}
    </div>
  );
};