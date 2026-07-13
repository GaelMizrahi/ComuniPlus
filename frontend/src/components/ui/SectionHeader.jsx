import React from 'react';
import { Link } from 'react-router-dom';

export default function SectionHeader({ eyebrow, title, link, linkText }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-text leading-tight">
          {title}
        </h1>
      </div>
      {link && (
        <Link
          to={link}
          className="text-[13px] font-medium text-accent hover:text-accent-hover active:opacity-70 transition-opacity"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
