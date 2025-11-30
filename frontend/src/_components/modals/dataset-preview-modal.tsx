"use client";

import React from "react";

interface DatasetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  rows: string[][];
}

export default function DatasetPreviewModal({
  isOpen,
  onClose,
  fileName,
  rows,
}: DatasetPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center"
         onClick={onClose}
    >
      <div
        className="bg-[#2a2a2a] border border-neutral-700 rounded-xl p-6 w-[700px] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-white">
          Preview: {fileName}
        </h2>

        <div className="overflow-x-auto border border-neutral-700 rounded-md">
          <table className="w-full text-sm text-gray-300">
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-neutral-700">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={onClose}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
