"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#1a1d2e] rounded-2xl shadow-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-[#2a2d3e]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3e]">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#242740] rounded-lg transition-colors"
          >
            <X size={18} className="text-[#6b7280]" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
