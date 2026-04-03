# Flappy Fart Game

A hilarious Flappy Bird-inspired game where you propel yourself through the sky with farts! This game is designed to be embedded in the main Fart Bounty website and integrates with the user authentication and leaderboard system.

## Features

- 🎮 Classic Flappy Bird gameplay with a fart-themed twist
- 🏆 Leaderboard system that saves scores to the database
- 👤 User authentication integration
- 📱 Mobile-friendly touch controls
- 🎨 Beautiful UI with smooth animations
- 🔊 Sound effects and visual feedback

## Setup

### 1. Database Setup

Make sure you've run the schema.sql file that includes:
- `game_leaderboards` table for storing high scores
- `upsert_game_high_score()` function for updating scores
- `get_game_leaderboard()` function for retrieving leaderboards
- Proper RLS policies for security

### 2. Environment Variables

In your main site's `.env` file, ensure you have:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then update the games page (`app/(pages)/games/page.tsx`) to use your actual credentials:
```javascript
const getGameUrl = (baseUrl: string) => {
  // Replace these with your actual Supabase credentials
  const supabaseUrl = 'https://your-project.supabase.co'; // ← Replace with your URL
  const supabaseKey = 'your-anon-key-here'; // ← Replace with your key

  const params = new URLSearchParams({
    supabase_url: supabaseUrl,
    supabase_key: supabaseKey
  });
  return `${baseUrl}?${params.toString()}`;
};
```

### 3. Game Files

The game consists of:
- `index.html` - Main HTML structure
- `style.css` - All styling and animations
- `game.js` - Complete game logic and Supabase integration
- `assets/` - Folder for game assets (sprites, sounds, etc.)

## Integration with Main Site

### Embedding the Game

The game is designed to be embedded as an iframe in the `/games` page:

```javascript
// In GamesPage.tsx
const getGameUrl = (baseUrl: string) => {
  const params = new URLSearchParams({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  });
  return `${baseUrl}?${params.toString()}`;
};
```

### Authentication

The game communicates with the parent page via `postMessage` API:

1. **Game requests user info**: `window.parent.postMessage({ type: 'REQUEST_USER_INFO' }, '*')`
2. **Parent responds**: `window.postMessage({ type: 'USER_INFO_RESPONSE', user: user }, '*')`
3. **Parent sends auth updates**: `window.postMessage({ type: 'AUTH_UPDATE', user: user }, '*')`

## Game Mechanics

### Controls
- **Click/Tap**: Make the bird fart and fly upward
- **Space/Arrow Up**: Alternative keyboard controls

### Scoring
- Pass through pipes to score points
- Higher scores unlock achievements
- Scores are automatically saved if user is logged in

### Physics
- Gravity pulls the bird down
- Fart propulsion gives upward momentum
- Collision detection with pipes and boundaries

## Database Integration

### Saving Scores
```javascript
// In the game
await supabase.rpc('upsert_game_high_score', {
  p_user_id: user.id,
  p_game_id: 'flappy-fart',
  p_score: score
});
```

### Loading Leaderboard
```javascript
// Get top scores
const { data } = await supabase.rpc('get_game_leaderboard', {
  p_game_id: 'flappy-fart',
  p_limit: 20
});
```

## Deployment

### Standalone Deployment (Netlify)
1. Upload the entire `flappy-fart/` folder to Netlify
2. Set the site URL to `flappy-fart.netlify.app`
3. Configure build settings if needed (static site)

### Integration with Main Site
1. The game is already integrated in `/games` page
2. Users can click on the game card to launch it
3. Authentication is passed automatically via iframe

## Assets

### Required Assets (for future implementation)
- Bird sprites (flying, idle, crash)
- Pipe sprites (top and bottom)
- Background elements
- Particle effects
- Sound effects (fart sounds, collision, scoring)

### Asset Structure
```
assets/
├── sprites/
│   ├── bird/
│   ├── pipes/
│   └── background/
├── sounds/
│   ├── fart.mp3
│   ├── crash.mp3
│   └── score.mp3
└── styles.css (current asset styles)
```

## Customization

### Game Settings
Edit these values in `game.js`:
```javascript
this.bird.jump = -12;        // Jump strength
this.bird.gravity = 0.6;     // Gravity strength
this.pipeGap = 150;          // Gap between pipes
this.pipeSpeed = 3;          // Pipe movement speed
```

### Visual Customization
- Colors and gradients in `style.css`
- Animation timings and effects
- UI styling and layout

## Future Enhancements

- [ ] Multiple bird skins (unlockable via shop)
- [ ] Different pipe themes
- [ ] Power-ups and special effects
- [ ] Multiplayer mode
- [ ] Daily challenges
- [ ] Achievement system integration

## Troubleshooting

### Common Issues

1. **Scores not saving**: Check if user is authenticated and Supabase connection is working
2. **Leaderboard not loading**: Verify database permissions and function availability
3. **Game not loading**: Check if all files are properly uploaded and paths are correct

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Debug mode enabled');
```

## Support

For issues or feature requests, check the main site's issue tracker or contact the development team.
