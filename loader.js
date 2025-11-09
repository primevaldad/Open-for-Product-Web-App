'use client';

export default function myImageLoader({ src, width, quality }) {
  // For internal static assets, return the original src.
  if (src.startsWith('/')) {
    return src;
  }

  // For Firebase Storage images, return the original URL. Don't use the optimizer.
  if (src.startsWith('https://firebasestorage.googleapis.com')) {
    return src;
  }

  // In development, return the original src for all other cases.
  if (process.env.NODE_ENV === 'development') {
    return src;
  }

  // For any other external images in production, use the App Hosting image optimizer.
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
