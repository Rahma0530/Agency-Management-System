import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ServiceType } from '../types/database';
import { BRIEF_FIELD_SCHEMAS } from '../data/briefFieldSchemas';

interface BriefFieldsReadOnlyProps {
  serviceType: ServiceType;
  fields: Record<string, any>;
}

/**
 * Pure read-only renderer for a brief's fields, driven entirely by BRIEF_FIELD_SCHEMAS so every
 * consumer (the per-service specialist queue, the AM Brief Repository, past revisions in the
 * Edit History) shows the exact same fields with the exact same bespoke styling — no per-consumer
 * field duplication.
 */
export const BriefFieldsReadOnly: React.FC<BriefFieldsReadOnlyProps> = ({ serviceType, fields }) => {
  const fieldDefs = BRIEF_FIELD_SCHEMAS[serviceType] || [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fieldDefs.map((field) => {
        const value = fields[field.key];
        return (
          <div
            key={field.key}
            className={`p-3 rounded-xl bg-purple-950/30 border border-purple-900/30 space-y-1 ${
              field.span === 'full' ? 'sm:col-span-2' : ''
            }`}
          >
            <span className="text-[11px] text-stone-400 block">{field.label}</span>
            {field.type === 'tag-list' ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(value) && value.length > 0 ? (
                  value.map((item: string, idx: number) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase border ${field.chipClassName || ''}`}
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-white">{value || field.fallback || 'Not specified'}</span>
                )}
              </div>
            ) : field.type === 'url' ? (
              value ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className={`hover:underline flex items-center gap-1 break-all ${field.valueClassName || 'text-xs font-bold text-purple-300'}`}
                >
                  <span>{value}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <p className="text-xs text-stone-400">{field.fallback || 'Not specified'}</p>
              )
            ) : (
              <p className={`leading-relaxed ${field.valueClassName || 'text-xs text-stone-200'}`}>
                {value || field.fallback || 'Not specified'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
