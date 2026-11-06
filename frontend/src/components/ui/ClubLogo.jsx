import React, { useEffect, useState } from 'react';

// Existing communities can finish loading their official logo after migration.
export default function ClubLogo({ src, name = 'Comunidad', className = 'w-12 h-12' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const label = `Logo de ${name}`;
  return src && !failed ? <img src={src} alt={label} referrerPolicy="no-referrer" onError={() => setFailed(true)}
    className={`object-contain shrink-0 rounded-lg bg-white p-1 ${className}`} /> :
    <span role="img" aria-label={`${name}: logo pendiente`} title="Logo pendiente"
      className={`inline-flex items-center justify-center shrink-0 rounded-lg bg-accent-light text-accent font-bold ${className}`}>
      {name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'C'}
    </span>;
}
