import React from 'react';
import { ShieldAlert, Lock, ArrowRight } from 'lucide-react';
import { UserRecord } from '../types/database';
import { getRoleInfo } from '../data/roles';

interface AccessDeniedProps {
  currentUser: UserRecord;
  attemptedModuleOrPortal: string;
  onNavigateToHomePortal: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentUser,
  attemptedModuleOrPortal,
  onNavigateToHomePortal,
}) => {
  const roleInfo = getRoleInfo(currentUser?.role);

  return (
    <div className="py-12 px-4 max-w-2xl mx-auto text-center font-sans">
      <div
        className="rounded-3xl p-8 sm:p-10 border shadow-2xl relative overflow-hidden backdrop-blur-xl"
        style={{
          background: 'rgba(26, 17, 33, 0.95)',
          borderColor: 'rgba(239, 68, 68, 0.35)',
        }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 mb-6 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          Access Denied
        </h2>

        <p className="text-sm text-stone-300 leading-relaxed mb-6 max-w-lg mx-auto">
          The requested route (<code className="text-red-300 font-mono bg-red-950/50 px-1.5 py-0.5 rounded text-xs">{attemptedModuleOrPortal}</code>) is not authorized for your role (<span className="text-white font-bold">{roleInfo.englishTitle}</span>). Access is strictly enforced by role-based security policies.
        </p>

        <div
          className="p-4 rounded-2xl border text-left mb-8 flex items-start gap-3.5"
          style={{
            background: 'rgba(16, 12, 24, 0.8)',
            borderColor: 'var(--border-soft)',
          }}
        >
          <Lock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="text-white font-bold">Designated Portal: {roleInfo.portalTitleEn}</div>
            <div className="text-stone-400">
              Your available modules and data access are configured for your specific role.
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToHomePortal}
          className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-xl transition-all inline-flex items-center gap-2 hover:opacity-90 active:scale-98"
          style={{
            background: 'var(--gradient-badge)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <span>Return to {roleInfo.portalTitleEn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
