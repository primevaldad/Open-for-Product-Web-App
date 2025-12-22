
'use client';

import { usePathname } from 'next/navigation';

const getTitleFromPath = (path: string) => {
  const pathParts = path.split('/').filter(part => part);
  if (pathParts.length === 0) return 'Home';
  if (pathParts[0] === 'project') {
    if (pathParts.length > 1) {
        // a naive way to decode the project name
        return decodeURIComponent(pathParts[1]);
    }
    return 'Project';
  }
  const title = pathParts[pathParts.length - 1];
  return title.charAt(0).toUpperCase() + title.slice(1).replace(/-/g, ' ');
};

export const DynamicHeader = () => {
  const pathname = usePathname();
  const title = getTitleFromPath(pathname);

  return <h1 className="text-lg font-semibold">{title}</h1>;
};
