import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  { key: 'first_win', name: 'First Win', description: 'Win your first game.', icon: '🏆', metric: 'wins', threshold: 1 },
  { key: 'correct_10', name: '10 Correct Answers', description: 'Answer 10 questions correctly.', icon: '✅', metric: 'correctAnswers', threshold: 10 },
  { key: 'correct_100', name: '100 Correct Answers', description: 'Answer 100 questions correctly.', icon: '💯', metric: 'correctAnswers', threshold: 100 },
  { key: 'lyrics_master', name: 'Lyrics Master', description: 'Reach 5,000 total points.', icon: '🎤', metric: 'totalScore', threshold: 5000 },
  { key: 'spotify_expert', name: 'Spotify Expert', description: 'Play 50 games.', icon: '🟢', metric: 'gamesPlayed', threshold: 50 },
  { key: 'getting_started', name: 'Getting Started', description: 'Play your first game.', icon: '🎮', metric: 'gamesPlayed', threshold: 1 },
];

// A small, royalty-free-ish demo catalogue so the app is playable without a
// Spotify login. Lyrics here are short original placeholder lines (not real
// copyrighted lyrics) purely so lyric-based modes function in demo mode.
const DEMO_TRACKS = [
  { spotifyId: 'demo-1', title: 'Midnight Drive', artist: 'Neon Pulse', album: 'After Hours', releaseYear: 2021, lyrics: 'City lights are calling out my name\nMidnight drive, we are not the same\nHeadlights cut across the rain\nRunning fast to feel alive again' },
  { spotifyId: 'demo-2', title: 'Golden Hour', artist: 'Neon Pulse', album: 'After Hours', releaseYear: 2021, lyrics: 'Golden hour painting up the sky\nHold me close and we will learn to fly\nEvery moment slipping through our hands\nBuilding castles in the falling sands' },
  { spotifyId: 'demo-3', title: 'Paper Hearts', artist: 'The Lantern', album: 'Quiet Rooms', releaseYear: 2019, lyrics: 'Paper hearts and folded dreams\nNothing ever quite as simple as it seems\nWhisper softly in the dark\nLeaving only just a spark' },
  { spotifyId: 'demo-4', title: 'Coastline', artist: 'The Lantern', album: 'Quiet Rooms', releaseYear: 2019, lyrics: 'Walking down the old coastline\nSalt and summer, you were mine\nWaves erase the steps we made\nStill I keep the songs we played' },
  { spotifyId: 'demo-5', title: 'Electric Sky', artist: 'Vega', album: 'Orbit', releaseYear: 2023, lyrics: 'Electric sky above the town\nLightning crowns are coming down\nWe are static, we are noise\nDancing on our own device' },
  { spotifyId: 'demo-6', title: 'Gravity', artist: 'Vega', album: 'Orbit', releaseYear: 2023, lyrics: 'Gravity keeps pulling me to you\nEverything I never thought I knew\nFalling slow and falling fast\nHope this orbit holds at last' },
  { spotifyId: 'demo-7', title: 'Wildflowers', artist: 'June Avenue', album: 'Bloom', releaseYear: 2020, lyrics: 'Wildflowers grow along the road\nCarry all the seeds we never sowed\nColours bursting in the field\nEvery wound begins to heal' },
  { spotifyId: 'demo-8', title: 'Slow Burn', artist: 'June Avenue', album: 'Bloom', releaseYear: 2020, lyrics: 'This is just a slow burn love\nFitting like a worn-out glove\nTake your time and let it grow\nSome of the best things move so slow' },
  { spotifyId: 'demo-9', title: 'Cassette', artist: 'Static Bloom', album: 'Rewind', releaseYear: 2018, lyrics: 'Press rewind on the old cassette\nMemories we cannot forget\nTape is worn but still it plays\nEchoes of our younger days' },
  { spotifyId: 'demo-10', title: 'Neon Rain', artist: 'Static Bloom', album: 'Rewind', releaseYear: 2018, lyrics: 'Neon rain on empty streets\nDrumming out our heartbeat beats\nUmbrella up against the night\nEverything will be alright' },
  { spotifyId: 'demo-11', title: 'Horizon', artist: 'Atlas Wave', album: 'Distances', releaseYear: 2022, lyrics: 'Chasing down the far horizon\nEvery mile the sun is rising\nMaps unfold and roads divide\nYou are always by my side' },
  { spotifyId: 'demo-12', title: 'Afterglow', artist: 'Atlas Wave', album: 'Distances', releaseYear: 2022, lyrics: 'In the afterglow we stay\nWatching as the colours fade away\nNothing left to prove tonight\nJust the warmth of fading light' },
];

async function main() {
  console.log('🌱 Seeding achievements...');
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: a,
      update: { name: a.name, description: a.description, icon: a.icon, metric: a.metric, threshold: a.threshold },
    });
  }

  console.log('🌱 Seeding demo catalogue...');
  const demoUser = await prisma.user.upsert({
    where: { spotifyId: 'demo-user' },
    create: {
      spotifyId: 'demo-user',
      displayName: 'Demo Listener',
      email: 'demo@guessify.app',
      avatar: null,
    },
    update: {},
  });

  let rank = 1;
  for (const t of DEMO_TRACKS) {
    const track = await prisma.track.upsert({
      where: { spotifyId: t.spotifyId },
      create: {
        spotifyId: t.spotifyId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        releaseYear: t.releaseYear,
        coverImage: null,
        previewUrl: null,
        popularity: 50,
      },
      update: {},
    });

    await prisma.lyrics.upsert({
      where: { trackId: track.id },
      create: { trackId: track.id, fullLyrics: t.lyrics, provider: 'demo' },
      update: { fullLyrics: t.lyrics },
    });

    await prisma.userTopTrack.upsert({
      where: { userId_trackId_timeRange: { userId: demoUser.id, trackId: track.id, timeRange: 'medium_term' } },
      create: { userId: demoUser.id, trackId: track.id, rank, timeRange: 'medium_term' },
      update: { rank },
    });
    await prisma.savedTrack.upsert({
      where: { userId_trackId: { userId: demoUser.id, trackId: track.id } },
      create: { userId: demoUser.id, trackId: track.id },
      update: {},
    });
    rank += 1;
  }

  // Demo top artists
  const artists = [...new Set(DEMO_TRACKS.map((t) => t.artist))];
  let aRank = 1;
  for (const name of artists) {
    const artist = await prisma.artist.upsert({
      where: { spotifyId: `demo-artist-${name.replace(/\s+/g, '-').toLowerCase()}` },
      create: {
        spotifyId: `demo-artist-${name.replace(/\s+/g, '-').toLowerCase()}`,
        name,
        genres: ['indie', 'synthpop'],
        popularity: 55,
      },
      update: {},
    });
    await prisma.userTopArtist.upsert({
      where: { userId_artistId_timeRange: { userId: demoUser.id, artistId: artist.id, timeRange: 'medium_term' } },
      create: { userId: demoUser.id, artistId: artist.id, rank: aRank, timeRange: 'medium_term' },
      update: { rank: aRank },
    });
    aRank += 1;
  }

  console.log('✅ Seed complete.');
  console.log(`   Demo user id: ${demoUser.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
