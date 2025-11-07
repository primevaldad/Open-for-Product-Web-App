'use client';

export default function myImageLoader({ src, width, quality }) {
  // In development, or for internal static assets, return the original src.
  if (process.env.NODE_ENV === 'development' || src.startsWith('/')) {
    return src;
  }

  // For external images in production, use the App Hosting image optimizer.
  const operations = [
    {
      operation: 'input',
      type: 'url',
      url: src,
    },
    { operation: 'resize', width: width },
    { operation: 'output', format: 'webp', quality: quality || 75 },
  ];

  const encodedOperations = encodeURIComponent(JSON.stringify(operations));

  return `/_fah/image/process?operations=${encodedOperations}`;
}
