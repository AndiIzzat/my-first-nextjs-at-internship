import { NextRequest, NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/spotify/callback`
  : "http://localhost:3000/api/spotify/callback";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Get the base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?spotify_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?spotify_error=no_code`);
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return NextResponse.redirect(`${baseUrl}/?spotify_error=not_configured`);
  }

  try {
    const basic = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.redirect(
        `${baseUrl}/?spotify_error=${data.error}`
      );
    }

    // Create response with redirect
    const redirectResponse = NextResponse.redirect(
      `${baseUrl}/?spotify_connected=true`
    );

    // Set cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    // Access token expires in 1 hour
    redirectResponse.cookies.set("spotify_access_token", data.access_token, {
      ...cookieOptions,
      maxAge: 3600,
    });

    // Refresh token doesn't expire
    redirectResponse.cookies.set("spotify_refresh_token", data.refresh_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return redirectResponse;
  } catch {
    return NextResponse.redirect(`${baseUrl}/?spotify_error=token_error`);
  }
}
