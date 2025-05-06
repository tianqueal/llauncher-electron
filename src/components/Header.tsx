import { NavLink, useLocation } from 'react-router';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { key: 'play', name: 'Play', href: '/' },
  { key: 'versions', name: 'Versions', href: '/versions' },
  { key: 'settings', name: 'Settings', href: '/settings' },
  { key: 'about', name: 'About', href: '/about' },
];

export default function Header() {
  const location = useLocation(); // Get current location
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0, // Start hidden
  });
  const navContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({}); // Refs for NavLink elements

  useEffect(() => {
    const activeItem = navItems.find((item) => item.href === location.pathname);
    if (
      activeItem &&
      itemRefs.current[activeItem.key] &&
      navContainerRef.current
    ) {
      const activeElement = itemRefs.current[activeItem.key];
      // Ensure calculation happens relative to the container if needed,
      // but offsetLeft should be relative to the offsetParent (navContainerRef if positioned)
      const left = activeElement.offsetLeft;
      const width = activeElement.offsetWidth;

      setIndicatorStyle({ left, width, opacity: 1 });
    } else {
      // Optionally hide indicator if no item matches (e.g., 404 page)
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
    // Add navContainerRef.current to dependencies if its layout affects calculations
  }, [location.pathname]); // Re-run effect when pathname changes

  const baseLinkClasses =
    'relative z-10 rounded-full px-3 py-0.5 transition-colors transition-[font-weight] duration-300 ease-in-out';

  return (
    <>
      <div className="sticky top-6 z-20 my-6 flex w-full justify-center">
        <div
          ref={navContainerRef}
          className="relative flex gap-2 rounded-full bg-white/5 p-1 text-sm/6 text-white backdrop-blur-sm"
        >
          <div
            className="absolute top-1 bottom-1 rounded-full bg-gray-700 shadow-inner shadow-white/10 transition-all duration-300 ease-in-out"
            style={indicatorStyle}
          />

          {navItems.map((navItem) => (
            <NavLink
              key={navItem.key}
              to={navItem.href}
              ref={(el) => {
                itemRefs.current[navItem.key] = el;
              }}
              // Add data-text attribute for the pseudo-element
              data-text={navItem.name}
              className={({ isActive, isPending }) =>
                clsx(
                  baseLinkClasses,
                  isPending && 'cursor-default opacity-50',
                  // Active state: Render text as semibold
                  isActive && !isPending && 'font-semibold',
                  // Inactive state: Render text as normal, but add invisible semibold pseudo-element to reserve space
                  !isActive &&
                    !isPending &&
                    'font-normal before:invisible before:block before:h-0 before:font-semibold before:content-[attr(data-text)] dark:text-white/70 dark:hover:text-white',
                )
              }
            >
              {/* Actual visible text */}
              {navItem.name}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
