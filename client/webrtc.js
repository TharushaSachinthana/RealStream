let localStream = null;
let peers = {};
let socket = null;

function initWebRTC() {
    // Establish a Socket.IO connection to the same host that served the page
    socket = io({
        secure: true,
        transports: ['websocket'], // Ensures WebSocket is used
        upgrade: false
    });

    socket.on('connect', () => {
        console.log('Connected to server via Socket.IO');
    });

    socket.on('user-joined', async ({ id, username }) => {
        console.log('User joined:', id, username);
        createPeer(true, id, username);
    });

    socket.on('signal', ({ from, signal, username }) => {
        console.log('Signal received from:', from);
        handleSignal(from, signal, username);
    });

    socket.on('user-left', (userId) => {
        console.log('User left:', userId);
        if (peers[userId]) {
            peers[userId].peer.destroy();
            delete peers[userId];
        }
        const remoteVideo = document.querySelector(`#video-${userId}`);
        if (remoteVideo) {
            remoteVideo.parentElement.remove();
        }
    });

    socket.on('room-users', (users) => {
        users.forEach(userId => {
            if (!peers[userId]) {
                createPeer(false, userId);
            }
        });
    });

    // Message handler
    socket.on('message', ({ content, from, id }) => {
        const messages = document.getElementById('chatMessages');
        const messageElement = formatMessage(from, content, id === socket.id);
        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection Error:', error);
    });
}

function createPeer(isInitiator, userId, username) {
    if (peers[userId]) {
        peers[userId].peer.destroy();
    }

    const peer = new SimplePeer({
        initiator: isInitiator,
        stream: localStream,
        trickle: false,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    peers[userId] = { peer, username };

    peer.on('signal', data => {
        socket.emit('signal', { to: userId, signal: data });
    });

    peer.on('stream', stream => {
        const videoEl = createVideoElement(userId, username || 'Remote User');
        videoEl.srcObject = stream;
        videoEl.play().catch(err => console.error('Error playing video:', err));
    });

    peer.on('error', err => {
        console.error('Peer error:', err);
        if (peers[userId]) {
            peers[userId].peer.destroy();
            delete peers[userId];
        }
    });

    return peer;
}

function handleSignal(userId, signal, username) {
    if (!peers[userId]) {
        createPeer(false, userId, username);
    }
    peers[userId].peer.signal(signal);
}

async function getLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 24 }
            },
            audio: true
        });

        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        localVideo.volume = 0;
        await localVideo.play();
        return true;
    } catch (err) {
        console.error('Error accessing media devices:', err);
        return false;
    }
}

function cleanupPeer() {
    Object.keys(peers).forEach(userId => {
        if (peers[userId]) {
            peers[userId].peer.destroy();
        }
    });
    peers = {};
}

function cleanupAll() {
    cleanupPeer();
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    // Clear video grid except local video
    const videoGrid = document.getElementById('videoGrid');
    Array.from(videoGrid.children).forEach(child => {
        if (!child.classList.contains('local-video')) {
            child.remove();
        }
    });
}

function createVideoElement(userId, username) {
    const videoGrid = document.getElementById('videoGrid');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.id = `video-wrapper-${userId}`;
    
    const video = document.createElement('video');
    video.id = `video-${userId}`;
    video.autoplay = true;
    video.playsInline = true;
    
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.innerHTML = `
        <span class="participant-name">${username || 'User'}</span>
    `;

    wrapper.appendChild(video);
    wrapper.appendChild(overlay);
    videoGrid.appendChild(wrapper);
    
    return video;
}

function formatMessage(from, content, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-header">${from}</div>
        <div class="message-content">${content}</div>
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    return messageDiv;
}
