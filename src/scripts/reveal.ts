// Fade-and-rise for [data-reveal] blocks as they scroll into view.
// Only blocks that start below the fold are hidden, so nothing visible on load
// ever flashes, and without JS (or with reduced motion) everything just shows.
// Positions come from the observer itself, so the page never forces a layout.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduced && 'IntersectionObserver' in window) {
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting, boundingClientRect } of entries) {
      if (isIntersecting) {
        target.classList.remove('reveal-pending');
        observer.unobserve(target);
      } else if (!seen.has(target) && boundingClientRect.top > 0) {
        target.classList.add('reveal-pending');
      }
      seen.add(target);
    }
  });

  for (const el of document.querySelectorAll('[data-reveal]')) observer.observe(el);
}
