import {
  getUserSpotifyClient,
  getTopTracks,
  getTopArtists,
  getSavedTracks,
  getPlaylists,
  releaseYearFromDate,
  type SpotifyTrack,
  type SpotifyArtist,
} from './spotify.js';
import { prisma } from '../lib/prisma.js';

/** Upsert a Spotify track into the catalogue and return its internal id. */
async function upsertTrack(t: SpotifyTrack): Promise<string> {
  const track = await prisma.track.upsert({
    where: { spotifyId: t.id },
    create: {
      spotifyId: t.id,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album?.name,
      albumId: t.album?.id,
      coverImage: t.album?.images?.[0]?.url ?? null,
      previewUrl: t.preview_url,
      releaseYear: releaseYearFromDate(t.album?.release_date),
      popularity: t.popularity,
    },
    update: {
      previewUrl: t.preview_url,
      coverImage: t.album?.images?.[0]?.url ?? null,
      popularity: t.popularity,
    },
  });
  return track.id;
}

async function upsertArtist(a: SpotifyArtist): Promise<string> {
  const artist = await prisma.artist.upsert({
    where: { spotifyId: a.id },
    create: {
      spotifyId: a.id,
      name: a.name,
      image: a.images?.[0]?.url ?? null,
      genres: a.genres ?? [],
      popularity: a.popularity,
    },
    update: {
      image: a.images?.[0]?.url ?? null,
      genres: a.genres ?? [],
      popularity: a.popularity,
    },
  });
  return artist.id;
}

/**
 * Imports the user's Spotify library: top tracks/artists (all time ranges),
 * saved tracks and playlists. Idempotent — safe to re-run to refresh data.
 */
export async function importUserLibrary(userId: string) {
  const client = await getUserSpotifyClient(userId);
  const summary = { topTracks: 0, topArtists: 0, savedTracks: 0, playlists: 0 };

  // Top tracks across time ranges
  for (const timeRange of ['short_term', 'medium_term', 'long_term']) {
    const tracks = await getTopTracks(client, timeRange);
    let rank = 1;
    for (const t of tracks) {
      const trackId = await upsertTrack(t);
      await prisma.userTopTrack.upsert({
        where: { userId_trackId_timeRange: { userId, trackId, timeRange } },
        create: { userId, trackId, rank, timeRange },
        update: { rank },
      });
      rank += 1;
      summary.topTracks += 1;
    }
  }

  // Top artists
  for (const timeRange of ['short_term', 'medium_term', 'long_term']) {
    const artists = await getTopArtists(client, timeRange);
    let rank = 1;
    for (const a of artists) {
      const artistId = await upsertArtist(a);
      await prisma.userTopArtist.upsert({
        where: { userId_artistId_timeRange: { userId, artistId, timeRange } },
        create: { userId, artistId, rank, timeRange },
        update: { rank },
      });
      rank += 1;
      summary.topArtists += 1;
    }
  }

  // Saved tracks
  const saved = await getSavedTracks(client);
  for (const t of saved) {
    const trackId = await upsertTrack(t);
    await prisma.savedTrack.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
    summary.savedTracks += 1;
  }

  // Playlists (metadata only — track contents fetched lazily when needed)
  const playlists = await getPlaylists(client);
  for (const p of playlists) {
    await prisma.playlist.upsert({
      where: { spotifyId: p.id },
      create: {
        spotifyId: p.id,
        userId,
        name: p.name,
        description: p.description,
        image: p.images?.[0]?.url ?? null,
        trackCount: p.tracks?.total ?? 0,
      },
      update: {
        name: p.name,
        description: p.description,
        image: p.images?.[0]?.url ?? null,
        trackCount: p.tracks?.total ?? 0,
      },
    });
    summary.playlists += 1;
  }

  return summary;
}
