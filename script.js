document.addEventListener('DOMContentLoaded', function() {

    // Custom Cursor
    const cursor = document.querySelector('.cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        
        const hoverElements = document.querySelectorAll('a, .profile-img');
        hoverElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                cursor.style.width = '16px';
                cursor.style.height = '16px';
            });
            
            element.addEventListener('mouseleave', () => {
                cursor.style.width = '8px';
                cursor.style.height = '8px';
            });
        });
    }

    // Typing Animation
    const typingText = document.querySelector('.typing-text');
    if (typingText) {
        const text = 'wassup';
        let index = 0;
        
        function typeWriter() {
            if (index < text.length) {
                typingText.textContent = text.slice(0, index + 1);
                index++;
                setTimeout(typeWriter, 100);
            } else {
                setTimeout(() => {
                    index = 0;
                    typingText.textContent = '';
                    setTimeout(typeWriter, 2000);
                }, 4000);
            }
        }
        
        setTimeout(typeWriter, 1000);
    }

    // 12-Hour English Time
    function updateLastSeen() {
        const lastSeenElement = document.getElementById('last-seen');
        if (lastSeenElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            lastSeenElement.textContent = `Last seen: ${timeString}`;
        }
    }

    // Extra Snow Effect
    function createExtraSnow() {
        const snowContainer = document.querySelector('.snow-container');
        if (snowContainer) {
            for (let i = 0; i < 20; i++) {
                const snowflake = document.createElement('div');
                snowflake.className = 'snow';
                snowflake.style.left = Math.random() * 100 + '%';
                snowflake.style.animationDuration = (Math.random() * 10 + 5) + 's';
                snowflake.style.animationDelay = Math.random() * 5 + 's';
                snowflake.style.width = snowflake.style.height = (Math.random() * 3 + 1) + 'px';
                snowContainer.appendChild(snowflake);
            }
        }
    }

    // Background Music with Fade-In
    const bgMusic = document.getElementById('bg-music');

    if (bgMusic) {
        bgMusic.volume = 0;
        
        function fadeInMusic() {
            let volume = 0;
            bgMusic.play();
            
            const fade = setInterval(() => {
                if (volume < 0.4) {
                    volume += 0.02;
                    bgMusic.volume = volume;
                } else {
                    clearInterval(fade);
                }
            }, 200);
        }

        bgMusic.play()
            .then(() => fadeInMusic())
            .catch(() => {
                document.addEventListener('click', () => {
                    fadeInMusic();
                }, { once: true });
            });
    }

    // MP3 Album Art Extraction Function
    async function extractAlbumArt(audioUrl) {
        try {
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Look for ID3 tags (album art is stored in ID3v2 tags)
            // ID3v2 header starts with "ID3"
            let id3Start = -1;
            for (let i = 0; i < Math.min(10, uint8Array.length); i++) {
                if (uint8Array[i] === 73 && uint8Array[i + 1] === 68 && uint8Array[i + 2] === 68) { // "ID3"
                    id3Start = i;
                    break;
                }
            }
            
            if (id3Start === -1) return null;
            
            // Look for APIC (Attached Picture) frame
            for (let i = id3Start + 10; i < uint8Array.length - 4; i++) {
                if (uint8Array[i] === 65 && uint8Array[i + 1] === 80 && uint8Array[i + 2] === 73 && uint8Array[i + 3] === 67) { // "APIC"
                    // Skip frame header (10 bytes) and find image data
                    let pos = i + 10;
                    
                    // Skip text encoding (1 byte)
                    pos++;
                    
                    // Skip MIME type (null-terminated string)
                    while (pos < uint8Array.length && uint8Array[pos] !== 0) pos++;
                    pos++;
                    
                    // Skip picture type (1 byte)
                    pos++;
                    
                    // Skip description (null-terminated string)
                    while (pos < uint8Array.length && uint8Array[pos] !== 0) pos++;
                    pos++;
                    
                    // Extract image data
                    const imageData = uint8Array.slice(pos);
                    const blob = new Blob([imageData], { type: 'image/jpeg' });
                    return URL.createObjectURL(blob);
                }
            }
            
            return null;
        } catch (error) {
            console.log('Could not extract album art:', error);
            return null;
        }
    }

    // Music Player Functionality
    class MusicPlayer {
        constructor() {
            this.tracks = [
                {
                    title: "Masked Up",
                    artist: "nettspend",
                    url: "../masked up.mp3",
                    duration: "0:00"
                }
            ];
            
            this.currentTrackIndex = 0;
            this.isPlaying = false;
            this.currentTime = 0;
            this.duration = 0;
            
            this.audio = new Audio();
            this.audio.volume = 0.7;
            
            this.initializeElements();
            this.bindEvents();
            this.initializeTrack();
        }
        
        initializeElements() {
            this.playPauseBtn = document.getElementById('play-pause-btn');
            this.prevBtn = document.getElementById('prev-btn');
            this.nextBtn = document.getElementById('next-btn');
            this.progressFill = document.getElementById('progress-fill');
            this.currentTimeEl = document.getElementById('current-time');
            this.totalTimeEl = document.getElementById('total-time');
            this.volumeSlider = document.getElementById('volume-slider');
            this.trackTitle = document.querySelector('.track-title');
            this.artistName = document.querySelector('.artist-name');
            this.albumArt = document.querySelector('.album-art');
        }
        
        async initializeTrack() {
            await this.loadTrack(0);
        }
        
        bindEvents() {
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
            this.prevBtn.addEventListener('click', () => this.previousTrack());
            this.nextBtn.addEventListener('click', () => this.nextTrack());
            this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
            
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            this.audio.addEventListener('loadedmetadata', () => this.onAudioLoaded());
            this.audio.addEventListener('ended', () => this.nextTrack());
            
            // Add hover effects for cursor
            const musicControls = document.querySelectorAll('.control-btn, .volume-slider');
            musicControls.forEach(control => {
                control.addEventListener('mouseenter', () => {
                    if (cursor) {
                        cursor.style.width = '16px';
                        cursor.style.height = '16px';
                    }
                });
                
                control.addEventListener('mouseleave', () => {
                    if (cursor) {
                        cursor.style.width = '8px';
                        cursor.style.height = '8px';
                    }
                });
            });
        }
        
        async loadTrack(index) {
            const track = this.tracks[index];
            this.audio.src = track.url;
            this.trackTitle.textContent = track.title;
            this.artistName.textContent = track.artist;
            this.totalTimeEl.textContent = track.duration;
            this.currentTrackIndex = index;
            
            // Try to extract album art from MP3
            const albumArtUrl = await extractAlbumArt(track.url);
            if (albumArtUrl) {
                this.albumArt.src = albumArtUrl;
            } else {
                // Fallback to default album art if extraction fails
                this.albumArt.src = "https://i.scdn.co/image/ab67616d0000b2731d11f6a209d5db90b4f68e6f";
            }
            
            this.resetProgress();
        }
        
        togglePlayPause() {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }
        
        play() {
            this.audio.play();
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        
        pause() {
            this.audio.pause();
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        async previousTrack() {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
            await this.loadTrack(this.currentTrackIndex);
            if (this.isPlaying) {
                this.play();
            }
        }
        
        async nextTrack() {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
            await this.loadTrack(this.currentTrackIndex);
            if (this.isPlaying) {
                this.play();
            }
        }
        
        setVolume(value) {
            this.audio.volume = value / 100;
        }
        
        updateProgress() {
            if (this.audio.duration) {
                const progress = (this.audio.currentTime / this.audio.duration) * 100;
                this.progressFill.style.width = progress + '%';
                this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
            }
        }
        
        onAudioLoaded() {
            this.duration = this.audio.duration;
            this.totalTimeEl.textContent = this.formatTime(this.duration);
        }
        
        resetProgress() {
            this.progressFill.style.width = '0%';
            this.currentTimeEl.textContent = '0:00';
        }
        
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    // Add spinning animation for album art
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: translateZ(20px) rotate(0deg); }
            to { transform: translateZ(20px) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize music player
    const musicPlayer = new MusicPlayer();
    
    // Discord Rich Presence Functionality with Lanyard API
    class DiscordRichPresence {
        constructor() {
            this.userId = '945118422331686962';
            this.initializeElements();
            this.fetchLanyardData();
            this.startPolling();
        }
        
        initializeElements() {
            this.discordUsername = document.querySelector('.discord-username');
            this.discordStatusText = document.querySelector('.discord-status-text');
            this.spotifyTrackName = document.querySelector('.spotify-track-name');
            this.spotifyArtistName = document.querySelector('.spotify-artist-name');
            this.spotifyProgressFill = document.querySelector('.spotify-progress-fill');
            this.spotifyCurrentTime = document.querySelector('.spotify-current-time');
            this.spotifyTotalTime = document.querySelector('.spotify-total-time');
            this.spotifyAlbumImg = document.querySelector('.spotify-album-img');
            this.discordAvatarImg = document.querySelector('.discord-avatar-img');
            this.statusIndicator = document.querySelector('.discord-status-indicator');
        }
        
        async fetchLanyardData() {
            try {
                const response = await fetch(`https://api.lanyard.rest/v1/users/${this.userId}`);
                const data = await response.json();
                
                if (data.success) {
                    this.updateDiscordInfo(data.data);
                }
            } catch (error) {
                console.error('Error fetching Lanyard data:', error);
                this.setDefaultData();
            }
        }
        
        updateDiscordInfo(lanyardData) {
            // Update user info
            this.discordUsername.textContent = lanyardData.discord_user.username;
            
            // Update avatar
            const avatarUrl = `https://cdn.discordapp.com/avatars/${lanyardData.discord_user.id}/${lanyardData.discord_user.avatar}.png`;
            this.discordAvatarImg.src = avatarUrl;
            
            // Update status
            this.updateStatus(lanyardData.discord_status);
            
            // Update Spotify activity if present
            if (lanyardData.activities) {
                const spotifyActivity = lanyardData.activities.find(activity => activity.name === 'Spotify');
                if (spotifyActivity) {
                    this.updateSpotifyActivity(spotifyActivity);
                } else {
                    this.hideSpotifyActivity();
                }
            } else {
                this.hideSpotifyActivity();
            }
        }
        
        updateStatus(status) {
            // Update Discord status indicator
            this.statusIndicator.className = 'discord-status-indicator';
            
            switch (status) {
                case 'online':
                    this.statusIndicator.classList.add('online');
                    this.discordStatusText.textContent = 'Online';
                    break;
                case 'idle':
                    this.statusIndicator.classList.add('idle');
                    this.discordStatusText.textContent = 'Idle';
                    break;
                case 'dnd':
                    this.statusIndicator.classList.add('dnd');
                    this.discordStatusText.textContent = 'Do Not Disturb';
                    break;
                default:
                    this.statusIndicator.classList.add('offline');
                    this.discordStatusText.textContent = 'Offline';
            }
        }
        
        updateSpotifyActivity(spotifyActivity) {
            // Show Spotify activity
            const spotifyActivityEl = document.querySelector('.discord-activity');
            spotifyActivityEl.style.display = 'block';
            
            // Update track info
            this.spotifyTrackName.textContent = spotifyActivity.details || 'Unknown Track';
            this.spotifyArtistName.textContent = spotifyActivity.state || 'Unknown Artist';
            
            // Update album art
            if (spotifyActivity.assets && spotifyActivity.assets.large_image) {
                const imageUrl = spotifyActivity.assets.large_image.startsWith('spotify:')
                    ? `https://i.scdn.co/image/${spotifyActivity.assets.large_image.replace('spotify:', '')}`
                    : spotifyActivity.assets.large_image;
                this.spotifyAlbumImg.src = imageUrl;
            }
            
            // Update timestamps
            if (spotifyActivity.timestamps) {
                const start = spotifyActivity.timestamps.start;
                const end = spotifyActivity.timestamps.end;
                
                if (start && end) {
                    const now = Date.now();
                    const current = now - start;
                    const total = end - start;
                    
                    this.updateSpotifyProgress(current, total);
                }
            }
        }
        
        hideSpotifyActivity() {
            const spotifyActivityEl = document.querySelector('.discord-activity');
            spotifyActivityEl.style.display = 'none';
        }
        
        updateSpotifyProgress(current, total) {
            const progress = (current / total) * 100;
            this.spotifyProgressFill.style.width = progress + '%';
            this.spotifyCurrentTime.textContent = this.formatTime(current / 1000);
            this.spotifyTotalTime.textContent = this.formatTime(total / 1000);
        }
        
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        setDefaultData() {
            this.discordUsername.textContent = 'zen';
            this.discordStatusText.textContent = 'Offline';
            this.statusIndicator.className = 'discord-status-indicator offline';
            this.hideSpotifyActivity();
        }
        
        startPolling() {
            // Poll Lanyard API every 30 seconds
            setInterval(() => {
                this.fetchLanyardData();
            }, 30000);
        }
    }
    
    // Add CSS for additional status indicators
    const statusStyles = document.createElement('style');
    statusStyles.textContent = `
        .discord-status-indicator.idle { background: #faa81a; box-shadow: 0 0 10px #faa81a; }
    `;
    document.head.appendChild(statusStyles);

    // Initialize Discord Rich Presence
    const discordPresence = new DiscordRichPresence();

    // 3D Discord Card Mouse Tracking Effect
    const discordCard = document.querySelector('.discord-card');
    if (discordCard) {
        discordCard.addEventListener('mousemove', (e) => {
            const rect = discordCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            
            discordCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
        
        discordCard.addEventListener('mouseleave', () => {
            discordCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    }

    // 3D Card Mouse Tracking Effect
    const card = document.querySelector('.card');
    if (card) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    }
    
    // 3D Music Card Mouse Tracking Effect
    const musicCard = document.querySelector('.music-card');
    if (musicCard) {
        musicCard.addEventListener('mousemove', (e) => {
            const rect = musicCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            
            musicCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
        
        musicCard.addEventListener('mouseleave', () => {
            musicCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    }

    // 3D Weather Card Mouse Tracking Effect
    const weatherCard = document.querySelector('.weather-card');
    if (weatherCard) {
        weatherCard.addEventListener('mousemove', (e) => {
            const rect = weatherCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            
            weatherCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        });
        
        weatherCard.addEventListener('mouseleave', () => {
            weatherCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    }

    // Weather Widget Functionality
    async function updateWeather() {
        const weatherTemp = document.querySelector('.weather-temp');
        const weatherDesc = document.querySelector('.weather-desc');
        const weatherWind = document.querySelector('.weather-wind');
        const weatherHumidity = document.querySelector('.weather-humidity');
        const weatherCity = document.querySelector('.weather-city');
        const weatherIcon = document.querySelector('.weather-icon');

        // WeatherAPI.com (free tier, no location required)
        const apiKey = '28af12fea3a340cf8c6143500260405'; // Get free API key from https://www.weatherapi.com/
        const city = 'Jacksonville';
        
        try {
            // Use WeatherAPI.com for Jacksonville, Florida
            const response = await fetch(
                `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`
            );
            
            if (!response.ok) {
                throw new Error('Weather API request failed');
            }
            
            const data = await response.json();
            
            // Update weather display
            if (weatherTemp) weatherTemp.textContent = `${Math.round(data.current.temp_f)}°F`;
            if (weatherDesc) weatherDesc.textContent = data.current.condition.text.toLowerCase();
            if (weatherWind) weatherWind.textContent = `${data.current.wind_mph} mph`;
            if (weatherHumidity) weatherHumidity.textContent = `${data.current.humidity}%`;
            if (weatherCity) weatherCity.textContent = data.location.name;
            
            // Update weather icon based on conditions
            const iconMap = {
                1000: 'fa-sun',           // Sunny
                1003: 'fa-cloud-sun',     // Partly cloudy
                1006: 'fa-cloud',         // Cloudy
                1009: 'fa-cloud',         // Overcast
                1030: 'fa-smog',          // Mist
                1063: 'fa-cloud-sun-rain', // Patchy rain possible
                1066: 'fa-cloud-snow',    // Patchy snow possible
                1069: 'fa-cloud-sun-rain', // Patchy sleet possible
                1072: 'fa-cloud-sun-rain', // Patchy freezing drizzle possible
                1087: 'fa-bolt',          // Thundery outbreaks possible
                1114: 'fa-snowflake',     // Blowing snow
                1117: 'fa-snowflake',     // Blizzard
                1135: 'fa-smog',          // Fog
                1147: 'fa-smog',          // Freezing fog
                1150: 'fa-cloud-rain',    // Patchy light drizzle
                1153: 'fa-cloud-rain',    // Light drizzle
                1168: 'fa-cloud-rain',    // Freezing drizzle
                1171: 'fa-cloud-rain',    // Heavy freezing drizzle
                1180: 'fa-cloud-sun-rain', // Patchy light rain
                1183: 'fa-cloud-sun-rain', // Light rain
                1186: 'fa-cloud-rain',    // Moderate rain at times
                1189: 'fa-cloud-rain',    // Moderate rain
                1192: 'fa-cloud-showers-heavy', // Heavy rain at times
                1195: 'fa-cloud-showers-heavy', // Heavy rain
                1198: 'fa-cloud-rain',    // Light freezing rain
                1201: 'fa-cloud-rain',    // Moderate or heavy freezing rain
                1240: 'fa-cloud-sun-rain', // Light rain shower
                1243: 'fa-cloud-rain',    // Moderate or heavy rain shower
                1246: 'fa-cloud-showers-heavy', // Torrential rain shower
                1249: 'fa-cloud-sun-rain', // Light sleet showers
                1252: 'fa-cloud-rain',    // Moderate or heavy sleet showers
                1255: 'fa-cloud-snow',    // Light snow showers
                1258: 'fa-cloud-snow',    // Moderate or heavy snow showers
                1261: 'fa-cloud-snow',    // Light showers of ice pellets
                1264: 'fa-cloud-snow',    // Moderate or heavy showers of ice pellets
                1273: 'fa-bolt',          // Patchy light rain with thunder
                1276: 'fa-bolt',          // Moderate or heavy rain with thunder
                1279: 'fa-cloud-snow',    // Patchy light snow with thunder
                1282: 'fa-cloud-snow'     // Moderate or heavy snow with thunder
            };
            
            if (weatherIcon && data.current) {
                const iconClass = iconMap[data.current.condition.code] || 'fa-sun';
                weatherIcon.className = `weather-icon fas ${iconClass}`;
            }
            
        } catch (error) {
            console.log('Weather API error, using fallback data:', error);
            
            // Fallback data for Jacksonville if API fails
            const fallbackData = {
                temp: 75,
                desc: 'partly cloudy',
                wind: 8,
                humidity: 65,
                city: 'Jacksonville',
                icon: 'fa-cloud-sun'
            };
            
            if (weatherTemp) weatherTemp.textContent = `${fallbackData.temp}°F`;
            if (weatherDesc) weatherDesc.textContent = fallbackData.desc;
            if (weatherWind) weatherWind.textContent = `${fallbackData.wind} mph`;
            if (weatherHumidity) weatherHumidity.textContent = `${fallbackData.humidity}%`;
            if (weatherCity) weatherCity.textContent = fallbackData.city;
            if (weatherIcon) {
                weatherIcon.className = `weather-icon fas ${fallbackData.icon}`;
            }
        }
    }

    // Initialize
    updateLastSeen();
    createExtraSnow();
    updateWeather();
    setInterval(updateLastSeen, 60000);
    setInterval(updateWeather, 600000); // Update weather every 10 minutes

});