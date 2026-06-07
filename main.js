// 手势状态枚举
const GestureState = {
    NONE: 'none',
    OPEN: 'open',
    CLOSED: 'closed',
    LOVE: 'love',
    POINT: 'point'
};

// 全局变量
let particles = [];
let gestureState = GestureState.NONE;
let centerX, centerY;
let handX = 0, handY = 0;
let isHandDetected = false;
let isLoveMode = false;
let settings = {
    particleCount: 400,
    spreadSpeed: 8,
    contractSpeed: 5,
    particleSize: 3,
    followSpeed: 0.08,
    loveFormSpeed: 0.03
};

function getHeartPosition(t, scale, offsetX, offsetY) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return {
        x: x * scale + offsetX,
        y: y * scale + offsetY
    };
}

function formLoveShape() {
    const heartScale = Math.min(canvas.width, canvas.height) * 0.015;
    particles.forEach((particle, i) => {
        const t = (i / particles.length) * Math.PI * 2;
        const pos = getHeartPosition(t, heartScale, centerX, centerY);
        particle.targetX = pos.x;
        particle.targetY = pos.y;
    });
    isLoveMode = true;
}

// DOM 元素
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
const webcam = document.getElementById('webcam');
const handCanvas = document.getElementById('handCanvas');
const handCtx = handCanvas.getContext('2d');
const gestureIndicator = document.getElementById('gestureIndicator');
const gestureIcon = document.getElementById('gestureIcon');
const gestureText = document.getElementById('gestureText');
const permissionOverlay = document.getElementById('permissionOverlay');
const startButton = document.getElementById('startButton');
const settingsPanel = document.getElementById('settingsPanel');
const settingsToggle = document.getElementById('settingsToggle');

// 粒子类
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.baseRadius = settings.particleSize * (0.5 + Math.random() * 0.5);
        this.radius = this.baseRadius;
        this.alpha = 0.6 + Math.random() * 0.4;
        this.targetX = null;
        this.targetY = null;

        const hue = Math.random() * 60 + 160;
        this.color = `hsla(${hue}, 100%, 60%, ${this.alpha})`;
    }

    update() {
        if (isLoveMode && this.targetX !== null && this.targetY !== null) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            if (dist > 1) {
                this.vx += (dx / dist) * settings.loveFormSpeed;
                this.vy += (dy / dist) * settings.loveFormSpeed;
            }
        } else if (gestureState === GestureState.OPEN) {
            isLoveMode = false;
            this.targetX = null;
            this.targetY = null;
            const dx = this.x - centerX;
            const dy = this.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = settings.spreadSpeed * 0.01;

            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;

            this.vx += (Math.random() - 0.5) * 0.3;
            this.vy += (Math.random() - 0.5) * 0.3;
        } else if (gestureState === GestureState.CLOSED) {
            isLoveMode = false;
            this.targetX = null;
            this.targetY = null;
            const dx = centerX - this.x;
            const dy = centerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = settings.contractSpeed * 0.02;

            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
        } else if (gestureState === GestureState.POINT && isHandDetected) {
            isLoveMode = false;
            this.targetX = null;
            this.targetY = null;
            const dx = this.x - handX;
            const dy = this.y - handY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = settings.followSpeed;

            this.vx -= (dx / dist) * force;
            this.vy -= (dy / dist) * force;

            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;
        } else {
            isLoveMode = false;
            this.targetX = null;
            this.targetY = null;
        }

        this.vx *= 0.96;
        this.vy *= 0.96;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -0.5;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -0.5;

        this.radius = this.baseRadius * (0.8 + Math.abs(Math.sin(Date.now() * 0.003 + this.x)));
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2
        );
        gradient.addColorStop(0, this.color.replace(/[\d.]+\)$/, '0.3)'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    for (let i = 0; i < settings.particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 100;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        particles.push(new Particle(x, y));
    }
}

function adjustParticleCount() {
    const diff = settings.particleCount - particles.length;

    if (diff > 0) {
        for (let i = 0; i < diff; i++) {
            particles.push(new Particle(centerX, centerY));
        }
    } else if (diff < 0) {
        particles.splice(0, -diff);
    }
}

function animate() {
    ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    requestAnimationFrame(animate);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    handCanvas.width = 200;
    handCanvas.height = 150;

    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
}

let hands = null;
let animationId = null;

async function initHandDetection() {
    return new Promise((resolve, reject) => {
        if (typeof Hands === 'undefined') {
            console.error('MediaPipe Hands library not loaded');
            reject(new Error('MediaPipe Hands library not loaded'));
            return;
        }
        
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.3
        });

        hands.onResults(onHandResults);

        resolve();
    });
}

async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: 640,
                height: 480
            }
        });
        
        webcam.srcObject = stream;
        
        await new Promise((resolve) => {
            webcam.onloadedmetadata = () => {
                webcam.play();
                resolve();
            };
        });

        startDetectionLoop();
    } catch (error) {
        throw error;
    }
}

function startDetectionLoop() {
    async function detect() {
        if (hands && webcam.readyState === 4) {
            try {
                await hands.send({ image: webcam });
            } catch (error) {
                console.warn('Detection error:', error);
            }
        }
        animationId = requestAnimationFrame(detect);
    }
    detect();
}

function onHandResults(results) {
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        let handedness = 'Unknown';
        if (results.multiHandedness && results.multiHandedness.length > 0) {
            if (results.multiHandedness[0].classification && results.multiHandedness[0].classification[0]) {
                handedness = results.multiHandedness[0].classification[0].label;
            } else if (results.multiHandedness[0].label) {
                handedness = results.multiHandedness[0].label;
            }
        }

        if (handedness === 'Right') {
            drawHandLandmarks(landmarks);
            
            const wrist = landmarks[0];
            handX = (1 - wrist.x) * canvas.width;
            handY = wrist.y * canvas.height;
            isHandDetected = true;

            const gesture = detectGesture(landmarks);
            updateGestureUI(gesture);

            if (gesture === GestureState.LOVE) {
                formLoveShape();
            }
        } else if (handedness === 'Left') {
            drawHandLandmarks(landmarks);
            
            const wrist = landmarks[0];
            handX = (1 - wrist.x) * canvas.width;
            handY = wrist.y * canvas.height;
            isHandDetected = true;
            
            updateGestureUI(GestureState.NONE);
            handCtx.fillStyle = '#ff6b6b';
            handCtx.font = '14px Inter';
            handCtx.textAlign = 'center';
            handCtx.fillText('请使用右手', 100, 75);
        } else {
            drawHandLandmarks(landmarks);
            
            const wrist = landmarks[0];
            handX = (1 - wrist.x) * canvas.width;
            handY = wrist.y * canvas.height;
            isHandDetected = true;
            
            updateGestureUI(GestureState.NONE);
            handCtx.fillStyle = '#ff6b6b';
            handCtx.font = '12px Inter';
            handCtx.textAlign = 'center';
            handCtx.fillText('检测到手部', 100, 70);
            handCtx.fillText('请使用右手', 100, 90);
        }
    } else {
        isHandDetected = false;
        updateGestureUI(GestureState.NONE);
    }
}

function drawHandLandmarks(landmarks) {
    const w = handCanvas.width;
    const h = handCanvas.height;

    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
    ];

    handCtx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
    handCtx.lineWidth = 2;

    connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        handCtx.beginPath();
        handCtx.moveTo(p1.x * w, p1.y * h);
        handCtx.lineTo(p2.x * w, p2.y * h);
        handCtx.stroke();
    });

    landmarks.forEach((point, index) => {
        handCtx.beginPath();
        handCtx.arc(point.x * w, point.y * h, 4, 0, Math.PI * 2);
        handCtx.fillStyle = index % 4 === 0 ? '#00f5ff' : '#ec4899';
        handCtx.fill();
    });
}

function detectGesture(landmarks) {
    const palmCenter = {
        x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
        y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3
    };

    const fingerTips = [4, 8, 12, 16, 20];
    let totalDistance = 0;

    fingerTips.forEach(index => {
        const dx = landmarks[index].x - palmCenter.x;
        const dy = landmarks[index].y - palmCenter.y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
    });

    const avgDistance = totalDistance / fingerTips.length;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const loveDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) +
        Math.pow(thumbTip.y - indexTip.y, 2)
    );

    if (loveDistance < 0.15) {
        return GestureState.LOVE;
    }

    const indexDistance = Math.sqrt(
        Math.pow(indexTip.x - palmCenter.x, 2) +
        Math.pow(indexTip.y - palmCenter.y, 2)
    );

    const otherFingers = [4, 12, 16, 20];
    let otherAvgDistance = 0;
    otherFingers.forEach(index => {
        const dx = landmarks[index].x - palmCenter.x;
        const dy = landmarks[index].y - palmCenter.y;
        otherAvgDistance += Math.sqrt(dx * dx + dy * dy);
    });
    otherAvgDistance /= otherFingers.length;

    if (indexDistance > 0.3 && otherAvgDistance < 0.25) {
        return GestureState.POINT;
    }

    if (avgDistance > 0.32) {
        return GestureState.OPEN;
    } else if (avgDistance < 0.28) {
        return GestureState.CLOSED;
    }

    return gestureState;
}

function updateGestureUI(gesture) {
    gestureState = gesture;

    gestureIndicator.classList.remove('open', 'closed', 'love', 'point');

    if (gesture === GestureState.OPEN) {
        gestureIcon.textContent = '🤚';
        gestureText.textContent = '张开 - 扩散';
        gestureIndicator.classList.add('open');
    } else if (gesture === GestureState.CLOSED) {
        gestureIcon.textContent = '✊';
        gestureText.textContent = '合拢 - 收缩';
        gestureIndicator.classList.add('closed');
    } else if (gesture === GestureState.LOVE) {
        gestureIcon.textContent = '💕';
        gestureText.textContent = '爱心 - 特效';
        gestureIndicator.classList.add('love');
    } else if (gesture === GestureState.POINT) {
        gestureIcon.textContent = '👉';
        gestureText.textContent = '指向 - 跟随';
        gestureIndicator.classList.add('point');
    } else {
        gestureIcon.textContent = '👋';
        gestureText.textContent = '等待检测';
    }
}

function initSettings() {
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
    });

    const particleCountInput = document.getElementById('particleCount');
    const particleCountValue = document.getElementById('particleCountValue');
    const spreadSpeedInput = document.getElementById('spreadSpeed');
    const contractSpeedInput = document.getElementById('contractSpeed');
    const particleSizeInput = document.getElementById('particleSize');

    particleCountInput.addEventListener('input', (e) => {
        settings.particleCount = parseInt(e.target.value);
        particleCountValue.textContent = settings.particleCount;
        adjustParticleCount();
    });

    spreadSpeedInput.addEventListener('input', (e) => {
        settings.spreadSpeed = parseInt(e.target.value);
    });

    contractSpeedInput.addEventListener('input', (e) => {
        settings.contractSpeed = parseInt(e.target.value);
    });

    particleSizeInput.addEventListener('input', (e) => {
        settings.particleSize = parseInt(e.target.value);
        particles.forEach(p => {
            p.baseRadius = settings.particleSize * (0.5 + Math.random() * 0.5);
        });
    });
}

async function start() {
    try {
        console.log('Initializing hand detection...');
        await initHandDetection();
        console.log('Hand detection initialized');
        
        console.log('Starting webcam...');
        await startWebcam();
        console.log('Webcam started');
        
        permissionOverlay.classList.add('hidden');
        initParticles();
        animate();
    } catch (error) {
        console.error('启动失败:', error);
        alert('启动失败: ' + error.message);
    }
}

function init() {
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        if (particles.length === 0) {
            initParticles();
        }
    });

    initSettings();

    startButton.addEventListener('click', start);
}

init();
