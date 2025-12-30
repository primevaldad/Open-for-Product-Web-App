'use client';

import { usePathname } from 'next/navigation';

const getTitleFromPath = (path: string) => {
  const pathParts = path.split('/').filter(part => part);
  if (pathParts.length === 0) return 'Home';

  // Match /projects/[id] specifically
  if (pathParts[0] === 'projects' && pathParts.length === 2) {
    return 'Project Details';
  }

  const title = pathParts[pathParts.length - 1];
  
  // Capitalize and format the last part of the path
  return title.charAt(0).toUpperCase() + title.slice(1).replace(/-/g, ' ');
};

export const DynamicHeader = () => {
  const pathname = usePathname();
  const title = getTitleFromPath(pathname);

  return <h1 className="text-lg font-semibold">{title}</h1>;
};
