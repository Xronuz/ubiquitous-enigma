import { NextRequest, NextResponse } from 'next/server';

/**
 * Clears auth cookies (access_token, refresh_token) and redirects to /login.
 *
 * Called by the API client when token refresh fails, because httpOnly cookies
 * cannot be cleared from client-side JS — only the server can do it via Set-Cookie.
 *
 * Why this exists: the middleware checks the access_token cookie to decide if
 * the user is authenticated. If refresh fails but the cookie isn't cleared,
 * middleware keeps redirecting /login → /dashboard → infinite loop.
 */
export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);

  const isHttps = request.url.startsWith('https');
  const cookieOpts = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 0,
  };

  response.cookies.set('access_token', '', cookieOpts);
  response.cookies.set('refresh_token', '', cookieOpts);

  return response;
}
