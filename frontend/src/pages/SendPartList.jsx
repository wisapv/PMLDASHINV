import React from 'react';
import { ArrowLeft, Send } from 'lucide-react';

// Placeholder destination for the Handheld Hold card's "Send Part List"
// button — no data wiring or backend calls yet, that's a separate future
// task. Just confirms the navigation itself works.
const SendPartList = ({ onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-white rounded-4xl shadow-[0_2px_12px_rgba(20,20,15,0.04)] border border-ink/5 p-20 text-center animate-in fade-in">
      <div className="w-14 h-14 rounded-full bg-accent/20 text-ink flex items-center justify-center">
        <Send size={28} />
      </div>
      <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Send Part List</h2>
      <p className="text-sm text-muted max-w-sm">Coming soon — this page will let you send the Hold part list out for follow-up.</p>
      {onBack && (
        <button onClick={onBack} className="mt-4 flex items-center gap-2 bg-ink/5 hover:bg-ink/10 text-ink font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
      )}
    </div>
  );
};

export default SendPartList;
