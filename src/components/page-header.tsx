'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {children && <div className="flex items-center space-x-2">{children}</div>}
    </div>
  );
};
