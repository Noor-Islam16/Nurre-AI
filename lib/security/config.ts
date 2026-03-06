export const getSecurityConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Relax CSP in development
    csp: {
      reportOnly: isDevelopment,
      upgradeInsecureRequests: isProduction,
      reportUri: process.env.CSP_REPORT_URI,
    },
    
    // HSTS only in production
    hsts: {
      enabled: isProduction,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false, // Enable after testing
    },
    
    // Feature policies
    permissions: {
      camera: 'none',
      microphone: 'none',
      geolocation: 'none',
      payment: 'none',
      usb: 'none',
    },
  };
};