import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const VOLUME_ENDPOINT = "https://api.spotify.com/v1/me/player/volume";
const PLAYER_ENDPOINT = "https://api.spotify.com/v1/me/player";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null;
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
    return data.access_token;
  } catch {
    return null;
  }
}

// GET - Get current volume
export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("spotify_access_token")?.value;
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  if (!accessToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (!newToken) {
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 });
    }
    accessToken = newToken;
  }

  try {
    const response = await fetch(PLAYER_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      return NextResponse.json({ volume: 50, noActiveDevice: true });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to get player state" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      volume: data.device?.volume_percent ?? 50,
      deviceName: data.device?.name,
      deviceType: data.device?.type,
    });
  } catch {
    return NextResponse.json({ error: "Failed to get volume" }, { status: 500 });
  }
}

// PUT - Set volume
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("spotify_access_token")?.value;
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  if (!accessToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (!newToken) {
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 });
    }
    accessToken = newToken;
  }

  try {
    const { volume } = await request.json();

    if (typeof volume !== "number" || volume < 0 || volume > 100) {
      return NextResponse.json({ error: "Volume must be 0-100" }, { status: 400 });
    }

    const response = await fetch(`${VOLUME_ENDPOINT}?volume_percent=${Math.round(volume)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      return NextResponse.json({ success: true, volume: Math.round(volume) });
    }

    if (response.status === 404) {
      return NextResponse.json({ error: "No active device found" }, { status: 404 });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.error?.message || "Failed to set volume" }, { status: response.status });
    }

    return NextResponse.json({ success: true, volume: Math.round(volume) });
  } catch {
    return NextResponse.json({ error: "Failed to set volume" }, { status: 500 });
  }
}
