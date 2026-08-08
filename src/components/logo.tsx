import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Logo = ({ className = "h-9 w-9 shrink-0 text-[#2E73FF]", ...props }: LogoProps) => (
  <svg
    className={className}
    viewBox="0 0 400 400"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Open for Product Logo"
    {...props}
  >
    <defs>
      <g id="cube-face">
        <path
          d="M 228.87 150 L 228.87 116.67 L 176.91 146.67 L 205.78 163.67"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M 200 200 L 113.4 150 L 200 100 L 228.87 116.67 L 176.91 146.67 L 205.78 163.33 L 257.74 133.33 L 286.6 150 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </defs>
    <g id="full-logo">
      <use href="#cube-face" transform="rotate(0, 200, 200)" />
      <use href="#cube-face" transform="rotate(120, 200, 200)" />
      <use href="#cube-face" transform="rotate(240, 200, 200)" />
    </g>
  </svg>
);
