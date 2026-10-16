export interface SeoMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

export function updateSeoMeta(meta: SeoMetadata) {
  if (typeof document === 'undefined') return;

  const defaultImage = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
  const siteName = 'NEXUS Gaming Portal & CMS';
  const fullTitle = meta.title.includes(siteName) ? meta.title : `${meta.title} | ${siteName}`;
  const currentUrl = meta.url || (typeof window !== 'undefined' ? window.location.href : 'https://nexusgaming.gg');
  const imageUrl = meta.image || defaultImage;

  // 1. Title
  document.title = fullTitle;

  // 2. Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', meta.description);

  // 3. OpenGraph tags
  const ogTags = {
    'og:title': fullTitle,
    'og:description': meta.description,
    'og:image': imageUrl,
    'og:url': currentUrl,
    'og:type': meta.type || 'website',
    'og:site_name': siteName,
  };

  Object.entries(ogTags).forEach(([property, content]) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  });

  // 4. Twitter Cards
  const twitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:title': fullTitle,
    'twitter:description': meta.description,
    'twitter:image': imageUrl,
  };

  Object.entries(twitterTags).forEach(([name, content]) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  });
}

export function restoreDefaultSeoMeta() {
  updateSeoMeta({
    title: 'NEXUS Gaming Portal & CMS — Vodeći portal za gejming vesti i recenzije',
    description: 'Nezavisni portal posvećen video igrama, hardverskim inovacijama, esportu i industriji zabave.',
  });
}
