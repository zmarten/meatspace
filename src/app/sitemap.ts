import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://meatspace.run', lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://meatspace.run/docs', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://meatspace.run/terms', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
