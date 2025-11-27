'use client';

import React from 'react';
import {
  Image as ImageIcon,
  Presentation as SlidesIcon,
  Search as ResearchIcon,
  BarChart3 as DataIcon,
  Plane as TravelIcon,
  MoreHorizontal as MoreIcon,
} from 'lucide-react';

/**
 * Tool shortcut bar under the centered ChatInput on welcome screen.
 */
export const WelcomeTools: React.FC = () => {
  const tools = [
    { label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
    { label: 'Slides', icon: <SlidesIcon className="w-4 h-4" /> },
    { label: 'Research', icon: <ResearchIcon className="w-4 h-4" /> },
    { label: 'Data', icon: <DataIcon className="w-4 h-4" /> },
    { label: 'Travel', icon: <TravelIcon className="w-4 h-4" /> },
    { label: 'More', icon: <MoreIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6 text-gray-300">
      {tools.map(({ label, icon }) => (
        <button
          key={label}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a2a2a] border border-neutral-700 text-sm font-medium text-gray-300 hover:bg-[#3a3a3a] hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.15)] transition-all duration-200"
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};
