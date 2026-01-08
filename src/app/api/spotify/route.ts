import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
}

interface SpotifyNowPlaying {
  is_playing: boolean;
  item: SpotifyTrack;
  progress_ms: number;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string | null; newRefreshToken?: string }> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return { accessToken: null };
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
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data: SpotifyTokenResponse = await response.json();
    return { accessToken: data.access_token };
  } catch {
    return { accessToken: null };
  }
}

async function getNowPlaying(
  accessToken: string
): Promise<SpotifyNowPlaying | null> {
  try {
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || response.status > 400) {
      return null;
    }

    const data: SpotifyNowPlaying = await response.json();
    return data;
  } catch {
    return null;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("spotify_access_token")?.value;
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  // Check if user is logged in
  if (!refreshToken) {
    return NextResponse.json({
      isPlaying: false,
      configured: !!SPOTIFY_CLIENT_ID && !!SPOTIFY_CLIENT_SECRET,
      loggedIn: false,
    });
  }

  // If no access token but have refresh token, refresh it
  if (!accessToken && refreshToken) {
    const { accessToken: newToken } = await refreshAccessToken(refreshToken);
    if (newToken) {
      accessToken = newToken;
      // Set the new access token cookie
      const response = await getNowPlayingResponse(accessToken);
      response.cookies.set("spotify_access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
      return response;
    } else {
      // Refresh token is invalid, user needs to re-login
      return NextResponse.json({
        isPlaying: false,
        configured: true,
        loggedIn: false,
        error: "Session expired, please login again",
      });
    }
  }

  if (!accessToken) {
    return NextResponse.json({
      isPlaying: false,
      configured: true,
      loggedIn: false,
    });
  }

  return getNowPlayingResponse(accessToken);
}

async function getNowPlayingResponse(accessToken: string) {
  const nowPlaying = await getNowPlaying(accessToken);

  if (!nowPlaying || !nowPlaying.item) {
    return NextResponse.json({
      isPlaying: false,
      configured: true,
      loggedIn: true,
    });
  }

  const track = nowPlaying.item;

  return NextResponse.json({
    isPlaying: nowPlaying.is_playing,
    configured: true,
    loggedIn: true,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url,
    songUrl: track.external_urls.spotify,
    progress: nowPlaying.progress_ms,
    duration: track.duration_ms,
  });
}
