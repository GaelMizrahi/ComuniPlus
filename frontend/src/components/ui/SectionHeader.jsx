import React from 'react';
import { Link } from 'react-router-dom';

export default function SectionHeader({ eyebrow, title, link, linkText }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-text leading-tight">
          {title}
        </h1>
      </div>
      {link && (
        <Link
          to={link}
          className="text-[13px] font-semibold text-accent active:opacity-60 transition-opacity shrink-0"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
