export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // If request is for /api/*, route to backend API
    if (url.pathname.startsWith('/api')) {
      const backendOrigin = env.BACKEND_URL || 'http://165.99.74.72:5000';
      const targetUrl = `${backendOrigin.replace(/\/$/, '')}${url.pathname}${url.search}`;

      const headers = new Headers(request.headers);
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'follow',
        });

        // Add CORS headers if needed
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: 'Backend server connection error. Please verify the backend service is running on your server.',
            details: err.message,
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Handle preflight OPTIONS requests for API
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Serve static SPA assets from Cloudflare Edge
    return env.ASSETS.fetch(request);
  },
};
