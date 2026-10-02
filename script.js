const canvas = document.getElementById('gameCanvas');
// const canvas = ...: gameCanvas ID'li <canvas> HTML 
// elemanını bulup canvas adında bir değişkene atar (üzerinde çalışacağımız tuvali seçer).
//document.getElementById('gameCanvas'): Sayfadaki ID'si 'gameCanvas' olan elemanı yakalayan JavaScript metodudur.
const ctx = canvas.getContext('2d');
// const ctx = ...: Çizim yapmayı sağlayacak olan bağlamı (context) alır ve ctx değişkenine kaydeder.
// canvas.getContext('2d'): Tuvale iki boyutlu (2D) çizim yapacağını bildirir; dikdörtgen, çizgi, daire veya resim çizmeye yarayan tüm fonksiyonları (adeta bir "çizim fırçası") ctx içine yükler.


let gameRunning = true;
let score = 0;
let cameraX = 0; // Dünya kaydırma (kamera) pozisyonu
let currentWordIndex = 0;

// ------------ Süre ve Seviye Takip Sistemi ------------
let gameStartTime = Date.now();
let elapsedTime = 0; // Saniye cinsinden geçen zaman
let currentLevel = 1; // 1.5 Dk'da bir artar

// ------------ Görsel Resim Nesnelerini Yükleme ------------
const skinsList = ['default', 'witch', 'pirate', 'ninja', 'astronaut', 'superhero', 'king', 'detective', 'chef', 'dino', 'wizard', 'robot', 'angel'];
const images = { chest: new Image(), enemy: new Image() };

skinsList.forEach(skin => {
    images['cat_' + skin] = new Image();
    images['cat_' + skin].src = 'cat_' + skin + '.jpg';
});

images.chest.src = 'chest.png';
images.enemy.src = 'enemy.png';

// Kostüm Durumları
let currentSkin = 'default';
const ownedSkins = { default: true };

//Kelimeleri Karıştır
wordsList.sort(() => Math.random() - 0.5);

// Klavye durumları
const keys = { left: false, right: false, up: false };

// Kedi Nesnesi (55x55)
const cat = { x: 100, y: 280, width: 55, height: 55, color: '#ff80ab', velocityX: 0, velocityY: 0, speed: 6, jumpPower: -13, gravity: 0.65, isGrounded: false };

// Dünya Nesneleri (Dinamik Parkurlar)
let platforms = [
  { x: 300, y: 320, width: 130, height: 180 },
  { x: 500, y: 240, width: 120, height: 260 },
  { x: 670, y: 170, width: 110, height: 330 }, // Yüksek askı platform
  { x: 860, y: 290, width: 140, height: 210 },
  { x: 1080, y: 220, width: 130, height: 280 }
];

let powerups = [
  { x: 345, y: 260, width: 40, height: 40, active: true },
  { x: 540, y: 180, width: 40, height: 40, active: true },
  { x: 705, y: 110, width: 40, height: 40, active: true },
  { x: 910, y: 230, width: 40, height: 40, active: true },
  { x: 1125, y: 160, width: 40, height: 40, active: true }
];

let enemies = [
  { x: 400, y: 372, width: 48, height: 48, color: '#e53935', active: true, speed: 2, startX: 350, endX: 450, type: 'ground', lastShoot: 0 },
  { x: 880, y: 242, width: 48, height: 48, color: '#e53935', active: true, speed: 1.5, startX: 860, endX: 980, type: 'ground', lastShoot: 0 },
  { x: 600, y: 100, width: 48, height: 48, color: '#e53935', active: true, speed: 2.5, type: 'flying', floatOffset: 0, lastShoot: 0 }
];

// Tehlike Sistemleri
let projectiles = [];
let hazardZones = [{ x: 750, width: 80, type: 'lava' }];
let lightnings = [];
let lastLightningTime = 0;

let lastGeneratedX = 1200;
let activePowerup = null;

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') && cat.isGrounded) {
        cat.velocityY = cat.jumpPower;
        cat.isGrounded = false;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

// Çeşitli ve Eğlenceli Parkur Üreteci
function generateNextPlatform() {
    const patternType = Math.floor(Math.random() * 3); // 3 Farklı Parkur Deseni
    let startX = lastGeneratedX + 160 + Math.random() * 40;

    if (patternType === 0) {
        // MERDİVEN PARKURU (Yükselen basamaklar)
        for (let i = 0; i < 3; i++) {
            const pX = startX + (i * 140);
            const pY = 320 - (i * 60);
            platforms.push({ x: pX, y: pY, width: 110, height: 500 - pY });
            
            if (i === 2) {
                powerups.push({ x: pX + 35, y: pY - 55, width: 40, height: 40, active: true });
            }
        }
        lastGeneratedX = startX + 420;
    } else if (patternType === 1) {
        // YÜZEN UÇAN PLATFORMLAR (Aşağıda boşluk var)
        const pY = 200 + Math.random() * 60;
        platforms.push({ x: startX, y: pY, width: 160, height: 40 }); // İnce askı platform
        powerups.push({ x: startX + 60, y: pY - 55, width: 40, height: 40, active: true });

        // Seviye 3+ ise Lav Bölgesi ekle
        if (currentLevel >= 3) {
            hazardZones.push({ x: startX - 50, width: 100, type: 'lava' });
        }
        lastGeneratedX = startX + 180;
    } else {
        // STANDART DENGELİ KOLON
        const pY = 240 + Math.random() * 80;
        const pW = 120 + Math.random() * 40;
        platforms.push({ x: startX, y: pY, width: pW, height: 500 - pY });
        powerups.push({ x: startX + pW / 2 - 20, y: pY - 55, width: 40, height: 40, active: true });
        lastGeneratedX = startX + pW;
    }

    // Düşman Üretimi
    if (Math.random() > 0.3) {
        const isFlying = Math.random() > 0.5;
        if (isFlying) {
            enemies.push({ x: lastGeneratedX, y: 70 + Math.random() * 110, width: 48, height: 48, color: '#e53935', active: true, speed: 2 + currentLevel * 0.5, type: 'flying', floatOffset: Math.random() * Math.PI * 2, lastShoot: 0 });
        } else {
            enemies.push({ x: lastGeneratedX - 60, y: 372, width: 48, height: 48, color: '#e53935', active: true, speed: 1.5 + currentLevel * 0.3, startX: lastGeneratedX - 120, endX: lastGeneratedX, type: 'ground', lastShoot: 0 });
        }
    }
}

function updateTimer() {
    elapsedTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    // Her 90 Saniyede (1.5 Dakika) Bir Seviye Artar
    currentLevel = Math.floor(elapsedTime / 90) + 1;

    const timerText = document.getElementById('timer-text');
    const levelText = document.getElementById('level-text');
    if (timerText) timerText.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (levelText) levelText.innerText = currentLevel;
}

function update() {
    if (!gameRunning) return;

    updateTimer();
    const now = Date.now();

    // Yatay Hareket
    if (keys.left) cat.velocityX = -cat.speed;
    else if (keys.right) cat.velocityX = cat.speed;
    else cat.velocityX = 0;

    cat.velocityY += cat.gravity;
    cat.x += cat.velocityX;
    cat.y += cat.velocityY;

    if (cat.x < 0) cat.x = 0;

    // Zemin Teması (Y=420)
    const groundY = 420;
    cat.isGrounded = false;

    if (cat.y + cat.height >= groundY) {
        cat.y = groundY - cat.height;
        cat.velocityY = 0;
        cat.isGrounded = true;
    }

    // Platform Çarpışmaları
    platforms.forEach(p => {
        if (cat.x + cat.width > p.x && cat.x < p.x + p.width && cat.y + cat.height >= p.y && cat.y + cat.height <= p.y + 22 && cat.velocityY >= 0) {
            cat.y = p.y - cat.height;
            cat.velocityY = 0;
            cat.isGrounded = true;
        }
    });

    // SEVİYE 3 (3.0 Dk+): LAV BÖLGELERİ
    if (currentLevel >= 3 && cat.isGrounded && cat.y + cat.height >= groundY) {
        hazardZones.forEach(zone => {
            if (cat.x + cat.width > zone.x && cat.x < zone.x + zone.width) {
                score = Math.max(0, score - 10);
                document.getElementById('score-text').innerText = score;
                cat.velocityY = -8;
            }
        });
    }

    // SEVİYE 4 (4.5 Dk+): ŞİMŞEK FIRTINASI
    if (currentLevel >= 4 && now - lastLightningTime > 3500) {
        lastLightningTime = now;
        lightnings.push({ x: cat.x + (Math.random() * 200 - 100), timer: now + 1000, active: true });
    }

    lightnings.forEach(l => {
        if (l.active && now > l.timer) {
            if (Math.abs(cat.x + cat.width / 2 - l.x) < 35 && cat.y + cat.height >= 380) {
                score = Math.max(0, score - 15);
                document.getElementById('score-text').innerText = score;
                cat.velocityX = -12;
            }
            l.active = false;
        }
    });

    if (cat.x + 800 > lastGeneratedX) generateNextPlatform();

    cameraX = cat.x - canvas.width / 3;
    if (cameraX < 0) cameraX = 0;

    // Güçlendirici Toplama
    powerups.forEach(p => {
        if (p.active && cat.x < p.x + p.width && cat.x + cat.width > p.x && cat.y < p.y + p.height && cat.y + cat.height > p.y) {
            activePowerup = p;
            gameRunning = false;
            showQuiz();
        }
    });

    // SEVİYE 2 (1.5 Dk+): DÜŞMANLAR ATEŞ EDER
    enemies.forEach(enemy => {
        if (enemy.active) {
            if (enemy.type === 'flying') {
                enemy.x -= enemy.speed * 0.7;
                enemy.floatOffset += 0.05;
                enemy.y += Math.sin(enemy.floatOffset) * 2;
            } else if (enemy.speed !== 0) {
                enemy.x += enemy.speed;
                if (enemy.x <= enemy.startX || enemy.x >= enemy.endX) enemy.speed = -enemy.speed;
            }

            if (currentLevel >= 2 && now - enemy.lastShoot > 2200) {
                enemy.lastShoot = now;
                projectiles.push({ x: enemy.x, y: enemy.y + 20, vx: -5, active: true });
            }

            if (cat.x < enemy.x + enemy.width && cat.x + cat.width > enemy.x && cat.y < enemy.y + enemy.height && cat.y + cat.height > enemy.y) {
                enemy.active = false;
                score = Math.max(0, score - 5);
                document.getElementById('score-text').innerText = score;
                cat.velocityX = -10;
                cat.velocityY = -7;
            }
        }
    });

    // Mermiler
    projectiles.forEach(proj => {
        if (proj.active) {
            proj.x += proj.vx;
            if (cat.x < proj.x + 12 && cat.x + cat.width > proj.x && cat.y < proj.y + 12 && cat.y + cat.height > proj.y) {
                proj.active = false;
                score = Math.max(0, score - 5);
                document.getElementById('score-text').innerText = score;
                cat.velocityX = -8;
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Zemin
    ctx.fillStyle = '#81c784';
    ctx.fillRect(-500, 420, 20000, 80);

    // SEVİYE 3+: LAV BÖLGELERİ
    if (currentLevel >= 3) {
        hazardZones.forEach(zone => {
            ctx.fillStyle = '#ff3d00';
            ctx.fillRect(zone.x, 420, zone.width, 20);
            ctx.fillStyle = '#ff9100';
            ctx.fillRect(zone.x, 420, zone.width, 5);
        });
    }

    // Platformlar
    ctx.fillStyle = '#4caf50';
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(p.x, p.y, p.width, 10);
        ctx.fillStyle = '#4caf50';
    });

    // Ödül Sandıkları
    powerups.forEach(p => {
        if (p.active) {
            if (images.chest.complete && images.chest.naturalWidth !== 0) ctx.drawImage(images.chest, p.x, p.y, p.width, p.height);
            else { ctx.fillStyle = '#ffeb3b'; ctx.fillRect(p.x, p.y, p.width, p.height); }
        }
    });

    // Düşmanlar
    enemies.forEach(enemy => {
        if (enemy.active) {
            if (images.enemy.complete && images.enemy.naturalWidth !== 0) ctx.drawImage(images.enemy, enemy.x, enemy.y, enemy.width, enemy.height);
            else { ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height); }
        }
    });

    // SEVİYE 2+: ATEŞ TOPLARI
    projectiles.forEach(proj => {
        if (proj.active) {
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // SEVİYE 4+: ŞİMŞEKLER
    const now = Date.now();
    lightnings.forEach(l => {
        if (l.active) {
            if (now < l.timer) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(l.x, 0); ctx.lineTo(l.x, 420);
                ctx.stroke();
            } else {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(l.x, 0); ctx.lineTo(l.x, 420);
                ctx.stroke();
            }
        }
    });

    // Kedi Çizimi
    const activeCatImage = images['cat_' + currentSkin];
    if (activeCatImage && activeCatImage.complete && activeCatImage.naturalWidth !== 0) {
        ctx.drawImage(activeCatImage, cat.x, cat.y, cat.width, cat.height);
    } else {
        ctx.fillStyle = cat.color;
        ctx.fillRect(cat.x, cat.y, cat.width, cat.height);
    }

    ctx.restore();
}

// ------------ MAĞAZA MANTIĞI ------------
function toggleShop() {
    const shopModal = document.getElementById('shop-modal');
    shopModal.classList.toggle('hidden');
    const quizModal = document.getElementById('quiz-modal');
    const isQuizHidden = quizModal ? quizModal.classList.contains('hidden') : true;

    if (shopModal.classList.contains('hidden') && isQuizHidden) {
        gameRunning = true;
        gameLoop();
    } else {
        gameRunning = false;
    }
}

function buyOrSelectSkin(skinKey, price) {
    if (ownedSkins[skinKey]) {
        selectSkin(skinKey);
    } else if (score >= price) {
        score -= price;
        ownedSkins[skinKey] = true;
        document.getElementById('score-text').innerText = score;
        const btn = document.getElementById('btn-' + skinKey);
        if (btn) btn.innerText = "Giydir";
        selectSkin(skinKey);
    } else {
        alert("Yeterli puanın yok! 🐾 Soruları çözerek puan toplayabilirsin.");
    }
}

function selectSkin(skinKey) {
    currentSkin = skinKey;
    alert("Kostüm giydirildi! 🐾");
}

// ------------ SESLENDİRME ------------
function speakCurrentWord() {
    const currentData = wordsList[currentWordIndex];
    if (currentData && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentData.en);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

function showQuiz() {
    const quizModal = document.getElementById('quiz-modal');
    const wordTitle = document.getElementById('english-word');
    const optionsContainer = document.getElementById('options-container');

    const currentData = wordsList[currentWordIndex];
    wordTitle.innerText = currentData.en;
    optionsContainer.innerHTML = '';

    speakCurrentWord();

    const shuffledOptions = [...currentData.options].sort(() => Math.random() - 0.5);

    shuffledOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = option;
        btn.onclick = () => checkAnswer(option, currentData.tr);
        optionsContainer.appendChild(btn);
    });

    quizModal.classList.remove('hidden');
}

function checkAnswer(selected, correct) {
    const quizModal = document.getElementById('quiz-modal');

    if (selected === correct) {
        quizModal.classList.add('hidden');
        if (activePowerup) { activePowerup.active = false; activePowerup = null; }
        score += 10;
        document.getElementById('score-text').innerText = score;
        currentWordIndex = (currentWordIndex + 1) % wordsList.length;
        gameRunning = true;
        gameLoop();
    } else {
        alert("Yanlış cevap, tekrar dene");
    }
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Oyunu Başlat
gameLoop();