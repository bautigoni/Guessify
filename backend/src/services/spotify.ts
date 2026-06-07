import axios, { type AxiosInstance } from 'axios';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/errors.js';

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
}

export interface SpotifyProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  product: string | null;
  images: { url: string }[];
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.spotify.clientId,
    scope: env.spotify.scopes.join(' '),
    redirect_uri: env.spotify.redirectUri,
    state,
    show_dialog: 'false',
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
}

function basicAuthHeader(): string {
  const creds = `${env.spotify.clientId}:${env.spotify.clientSecret}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.spotify.redirectUri,
  });

  const { data } = await axios.post(`${SPOTIFY_ACCOUNTS}/api/token`, body, {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const { data } = await axios.post(`${SPOTIFY_ACCOUNTS}/api/token`, body, {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return {
    accessToken: data.access_token,
    // Spotify may or may not return a new refresh token
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ---------------------------------------------------------------------------
// Authenticated client with automatic token refresh
// ---------------------------------------------------------------------------

/**
 * Returns an axios client bound to a user's Spotify access token. If the stored
 * token is expired (or within a 60s safety window) it is refreshed and persisted
 * before the client is returned.
 */
export async function getUserSpotifyClient(userId: string): Promise<AxiosInstance> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.accessToken) {
    throw new HttpError(401, 'No Spotify session for user', 'NO_SPOTIFY_SESSION');
  }

  let accessToken = user.accessToken;
  const expiresAt = user.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = Date.now() > expiresAt - 60_000;

  if (needsRefresh && user.refreshToken) {
    const tokens = await refreshAccessToken(user.refreshToken);
    accessToken = tokens.accessToken;
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? user.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });
  }

  return axios.create({
    baseURL: SPOTIFY_API,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function getProfile(accessToken: string): Promise<SpotifyProfile> {
  const { data } = await axios.get(`${SPOTIFY_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function getTopTracks(
  client: AxiosInstance,
  timeRange = 'medium_term',
  limit = 50,
) {
  const { data } = await client.get('/me/top/tracks', {
    params: { time_range: timeRange, limit },
  });
  return data.items as SpotifyTrack[];
}

export async function getTopArtists(
  client: AxiosInstance,
  timeRange = 'medium_term',
  limit = 50,
) {
  const { data } = await client.get('/me/top/artists', {
    params: { time_range: timeRange, limit },
  });
  return data.items as SpotifyArtist[];
}

export async function getSavedTracks(client: AxiosInstance, limit = 50) {
  const { data } = await client.get('/me/tracks', { params: { limit } });
  return (data.items as { track: SpotifyTrack }[]).map((i) => i.track);
}

export async function getPlaylists(client: AxiosInstance, limit = 50) {
  const { data } = await client.get('/me/playlists', { params: { limit } });
  return data.items as SpotifyPlaylist[];
}

export async function getRecentlyPlayed(client: AxiosInstance, limit = 50) {
  const { data } = await client.get('/me/player/recently-played', {
    params: { limit },
  });
  return (data.items as { track: SpotifyTrack }[]).map((i) => i.track);
}

// ---------------------------------------------------------------------------
// Spotify response types (trimmed to what we use)
// ---------------------------------------------------------------------------

export interface SpotifyTrack {
  id: string;
  name: string;
  preview_url: string | null;
  popularity: number;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    release_date: string;
    images: { url: string }[];
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: { url: string }[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[];
  tracks: { total: number };
}

export function releaseYearFromDate(date?: string): number | null {
  if (!date) return null;
  const year = parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}
