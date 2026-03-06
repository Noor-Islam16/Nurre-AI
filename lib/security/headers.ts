export const securityHeaders = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable browser XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Enforce HTTPS (only in production)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Prevent DNS prefetch (privacy)
  'X-DNS-Prefetch-Control': 'off',
  
  // Control browser features
  // Allow microphone for realtime voice on same-origin, keep camera disabled
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
};

export const getContentSecurityPolicy = (nonce?: string) => {
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Next.js in dev
      "'unsafe-inline'", // Will replace with nonce in production
      "https://va.vercel-scripts.com", // Vercel Analytics
      "blob:", // Required for ElevenLabs AudioWorklet
      "data:", // Required for ElevenLabs inline scripts
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components/emotion
    ],
    'img-src': [
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co", // Supabase storage
    ],
    'font-src': ["'self'", "data:"],
    'connect-src': [
      "'self'",
      "https://*.supabase.co", // Supabase
      "https://api.openai.com", // OpenAI
      "wss://*.supabase.co", // Supabase realtime
      "https://api.elevenlabs.io", // ElevenLabs API
      "wss://api.elevenlabs.io", // ElevenLabs WebSocket
      "https://models.readyplayer.me", // Ready Player Me 3D avatars
      "blob:", // Required for Three.js/WebGL blob URLs
    ],
    'media-src': ["'self'", "blob:", "https://*.supabase.co"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  // Add nonce for production
  if (nonce) {
    directives['script-src'] = directives['script-src'].filter(
      src => src !== "'unsafe-inline'"
    );
    directives['script-src'].push(`'nonce-${nonce}'`);
  }

  // In development, be more permissive
  if (process.env.NODE_ENV === 'development') {
    // Don't include upgrade-insecure-requests in dev to allow localhost
    // We'll filter it out when building the CSP string
  }

  return Object.entries(directives)
    .filter(([key]) => {
      // Skip upgrade-insecure-requests in development
      if (process.env.NODE_ENV === 'development' && key === 'upgrade-insecure-requests') {
        return false;
      }
      return true;
    })
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};
