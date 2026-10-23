import React, { useEffect, useState } from 'react';

export default function Avatar({src,name='Usuario',className=''}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return src && !failed ? <img src={src} alt={name} className={className} onError={()=>setFailed(true)}/> :
    <span role="img" aria-label={name} className={`inline-flex items-center justify-center bg-accent-light text-accent font-bold ${className}`}>
      {name.trim().split(/\s+/).slice(0,2).map((word)=>word[0]).join('').toUpperCase() || 'C'}
    </span>;
}
