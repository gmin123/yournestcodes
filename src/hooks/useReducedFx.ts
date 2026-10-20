import { useEffect, useState } from 'react';

// 모바일(좁은 화면) 또는 prefers-reduced-motion 이면 무거운 배경 애니메이션/블러를 끔.
const QUERIES = ['(max-width: 768px)', '(prefers-reduced-motion: reduce)'];

function evaluate(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return QUERIES.some((q) => window.matchMedia(q).matches);
}

export function useReducedFx(): boolean {
  const [reduced, setReduced] = useState<boolean>(evaluate);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mqls = QUERIES.map((q) => window.matchMedia(q));
    const update = () => setReduced(evaluate());
    mqls.forEach((mql) => mql.addEventListener('change', update));
    update();
    return () => mqls.forEach((mql) => mql.removeEventListener('change', update));
  }, []);

  return reduced;
}
