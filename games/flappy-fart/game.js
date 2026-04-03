// Flappy Fart Game - Complete Game Logic
class FlappyFartGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameContainer = document.getElementById('gameContainer');

        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'gameOver'
        this.score = 0;
        this.bestScore = this.getBestScore();

        // Game objects
        this.bird = {
            x: 80,
            y: 300,
            width: 40,
            height: 30,
            velocity: 0,
            gravity: 0.6,
            jump: -12
        };

        this.pipes = [];
        this.pipeGap = 150;
        this.pipeWidth = 60;
        this.pipeSpeed = 3;

        // Game settings
        this.fps = 60;
        this.frameCount = 0;

        // Supabase connection
        this.supabase = null;
        this.user = null;
        this.gameId = 'flappy-fart';

        // Bind methods
        this.init = this.init.bind(this);
        this.startGame = this.startGame.bind(this);
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.gameOver = this.gameOver.bind(this);
        this.restartGame = this.restartGame.bind(this);
        this.showLeaderboard = this.showLeaderboard.bind(this);
        this.hideLeaderboard = this.hideLeaderboard.bind(this);

        this.init();
    }

    async init() {
        // Initialize Supabase
        await this.initSupabase();

        // Setup event listeners
        this.setupEventListeners();

        // Start game loop
        this.gameLoop();

        // Update best score display
        this.updateBestScoreDisplay();
    }

    async initSupabase() {
        try {
            // Get Supabase credentials from URL parameters or environment
            const urlParams = new URLSearchParams(window.location.search);
            const supabaseUrl = urlParams.get('supabase_url') || 'https://pbtfjhqsmzieyshvwilw.supabase.co';
            const supabaseKey = urlParams.get('supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidGZqaHFzbXppZXlzaHZ3aWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTcyNzgsImV4cCI6MjA3Njg5MzI3OH0.1PyokdMl8rpkLOEqfbeYr-q1ZNB9-H8wZOxHgpIB-UY';

            if (supabaseUrl !== 'https://pbtfjhqsmzieyshvwilw.supabase.co') {
                this.supabase = supabase.createClient(supabaseUrl, supabaseKey);

                // Try to get user info from parent page
                await this.getUserFromParent();

                console.log('Supabase initialized successfully');
                console.log('User:', this.user?.id || 'Guest');
            } else {
                console.log('Running in demo mode - no database connection');
                this.showDemoMode();
            }
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.showDemoMode();
        }
    }

    async getUserFromParent() {
        try {
            // Try to get auth info from parent window (main site)
            if (window.parent !== window) {
                // We're in an iframe, try to get user info
                const userInfo = await this.requestUserInfoFromParent();
                if (userInfo) {
                    this.user = userInfo;
                    console.log('Got user info from parent:', this.user);
                }
            }
        } catch (error) {
            console.log('Could not get user info from parent:', error.message);
        }
    }

    requestUserInfoFromParent() {
        return new Promise((resolve) => {
            // Send message to parent window requesting user info
            window.parent.postMessage({ type: 'REQUEST_USER_INFO' }, '*');

            // Listen for response
            const handleMessage = (event) => {
                if (event.data.type === 'USER_INFO_RESPONSE') {
                    window.removeEventListener('message', handleMessage);
                    resolve(event.data.user);
                }
            };

            window.addEventListener('message', handleMessage);

            // Timeout after 3 seconds
            setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                resolve(null);
            }, 3000);
        });
    }

    showDemoMode() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loading-content">
                    <div style="color: #ffd700; font-size: 1.2rem;">🎮</div>
                    <p>Demo Mode - Scores won't be saved</p>
                    <p style="font-size: 0.8rem; opacity: 0.7;">Connect to database for full features</p>
                </div>
            `;

            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 2000);
        }
    }

    setupEventListeners() {
        // Game control buttons
        document.getElementById('startButton')?.addEventListener('click', this.startGame);
        document.getElementById('restartButton')?.addEventListener('click', this.restartGame);
        document.getElementById('leaderboardButton')?.addEventListener('click', this.showLeaderboard);
        document.getElementById('backButton')?.addEventListener('click', this.hideLeaderboard);

        // Keyboard and mouse controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleInput();
            }
        });

        this.canvas.addEventListener('click', this.handleInput);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });

        // Listen for auth changes from parent
        window.addEventListener('message', (event) => {
            if (event.data.type === 'AUTH_UPDATE') {
                this.user = event.data.user;
                console.log('Auth updated:', this.user);
            }
        });
    }

    handleInput() {
        if (this.gameState === 'start') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.bird.velocity = this.bird.jump;
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.frameCount = 0;

        // Reset bird
        this.bird.y = 300;
        this.bird.velocity = 0;

        // Reset pipes
        this.pipes = [];

        // Hide start screen
        document.getElementById('startScreen').classList.add('hidden');

        console.log('Game started');
    }

    restartGame() {
        // Save score if user is logged in
        if (this.user && this.score > 0) {
            this.saveScore(this.score);
        }

        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        // Hide game over screen
        document.getElementById('gameOverScreen').classList.add('hidden');

        // Start new game
        this.startGame();
    }

    async saveScore(score) {
        if (!this.supabase || !this.user) return;

        try {
            const { data, error } = await this.supabase.rpc('upsert_game_high_score', {
                p_user_id: this.user.id,
                p_game_id: this.gameId,
                p_score: score
            });

            if (error) {
                console.error('Error saving score:', error);
            } else {
                console.log('Score saved:', data);
            }
        } catch (error) {
            console.error('Failed to save score:', error);
        }
    }

    async showLeaderboard() {
        if (!this.supabase) {
            alert('Leaderboard requires database connection');
            return;
        }

        this.gameState = 'leaderboard';
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('leaderboardScreen').classList.remove('hidden');

        // Load leaderboard data
        await this.loadLeaderboard();
    }

    hideLeaderboard() {
        this.gameState = 'start';
        document.getElementById('leaderboardScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
    }

    async loadLeaderboard() {
        if (!this.supabase) return;

        try {
            const { data, error } = await this.supabase.rpc('get_game_leaderboard', {
                p_game_id: this.gameId,
                p_limit: 20
            });

            if (error) {
                console.error('Error loading leaderboard:', error);
                this.displayLeaderboardError();
                return;
            }

            this.displayLeaderboard(data || []);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.displayLeaderboardError();
        }
    }

    displayLeaderboard(leaderboardData) {
        const leaderboardList = document.getElementById('leaderboardList');

        if (leaderboardData.length === 0) {
            leaderboardList.innerHTML = '<div class="loading">No scores yet! Be the first to play!</div>';
            return;
        }

        const leaderboardHTML = leaderboardData.map((entry, index) => {
            const rankClass = index < 3 ? `rank-${index + 1}` : '';
            const displayName = entry.display_name || entry.username;

            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">#${entry.rank}</div>
                    <div class="player-info">
                        <div class="player-name">${displayName}</div>
                        <div class="player-display-name">@${entry.username}</div>
                    </div>
                    <div class="score">${entry.high_score}</div>
                    <div class="date">${this.formatDate(entry.achieved_at)}</div>
                </div>
            `;
        }).join('');

        leaderboardList.innerHTML = leaderboardHTML;
    }

    displayLeaderboardError() {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '<div class="loading" style="color: #ff6b6b;">Failed to load leaderboard</div>';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    update() {
        if (this.gameState !== 'playing') return;

        this.frameCount++;

        // Update bird physics
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;

        // Check boundaries
        if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocity = 0;
        }

        if (this.bird.y + this.bird.height > this.canvas.height) {
            this.gameOver();
            return;
        }

        // Generate pipes
        if (this.frameCount % 90 === 0) {
            const pipeHeight = Math.random() * (this.canvas.height - this.pipeGap - 100) + 50;
            this.pipes.push({
                x: this.canvas.width,
                topHeight: pipeHeight,
                bottomY: pipeHeight + this.pipeGap,
                passed: false
            });
        }

        // Update pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // Remove off-screen pipes
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
                continue;
            }

            // Check collision
            if (this.checkCollision(this.bird, pipe)) {
                this.gameOver();
                return;
            }

            // Check scoring
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
            }
        }
    }

    checkCollision(bird, pipe) {
        return (
            bird.x < pipe.x + this.pipeWidth &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY)
        );
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'playing') {
            // Draw pipes
            this.ctx.fillStyle = '#4ecdc4';
            this.pipes.forEach(pipe => {
                // Top pipe
                this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
                // Bottom pipe
                this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, this.canvas.height - pipe.bottomY);
            });

            // Draw bird (simple rectangle for now)
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(this.bird.x, this.bird.y, this.bird.width, this.bird.height);

            // Draw score
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.score.toString(), this.canvas.width / 2, 50);

            // Draw instructions (fade out after a few seconds)
            if (this.frameCount < 180) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, (180 - this.frameCount) / 180)})`;
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Click or tap to fart and fly!', this.canvas.width / 2, this.canvas.height - 30);
            }
        }
    }

    gameOver() {
        this.gameState = 'gameOver';

        // Update displays
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;

        // Save score if user is logged in
        if (this.user && this.score > 0) {
            this.saveScore(this.score);
        }

        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        // Show game over screen
        document.getElementById('gameOverScreen').classList.remove('hidden');

        console.log('Game over. Score:', this.score, 'Best:', this.bestScore);
    }

    getBestScore() {
        return parseInt(localStorage.getItem('flappyFartBestScore') || '0');
    }

    saveBestScore() {
        localStorage.setItem('flappyFartBestScore', this.bestScore.toString());
        this.updateBestScoreDisplay();
    }

    updateBestScoreDisplay() {
        document.getElementById('bestScore').textContent = this.bestScore;
    }

    gameLoop() {
        this.update();
        this.draw();
        setTimeout(() => this.gameLoop(), 1000 / this.fps);
    }
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FlappyFartGame();
});

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    const gameContainer = document.getElementById('gameContainer');
    if (document.fullscreenElement) {
        gameContainer.style.borderRadius = '0';
        gameContainer.style.width = '100vw';
        gameContainer.style.height = '100vh';
    } else {
        gameContainer.style.borderRadius = '15px';
        gameContainer.style.width = '400px';
        gameContainer.style.height = '600px';
    }
});