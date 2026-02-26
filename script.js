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
        const text = 'made by @zensobased';
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

    // Initialize
    updateLastSeen();
    createExtraSnow();
    setInterval(updateLastSeen, 60000);

});