let localStream;
const peers = {};
const socket = io();

async function getLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        document.getElementById('localVideo').srcObject = localStream;
        return true;
    } catch (err) {
        console.error('Error accessing media devices:', err);
        return false;
    }
}

function initWebRTC() {
    socket.on('user-joined', ({ id, username }) => {
        console.log('User joined:', username);
        const peer = createPeer(id, true);
        peers[id] = peer;
        
        // Update participant name in video overlay
        const videoWrapper = document.getElementById(`video-wrapper-${id}`);
        if (videoWrapper) {
            const nameSpan = videoWrapper.querySelector('.participant-name');
            if (nameSpan) nameSpan.textContent = username;
        }
    });

    socket.on('signal', ({ from, signal, username }) => {
        console.log('Signal received from:', username);
        if (!peers[from]) {
            peers[from] = createPeer(from, false);
        }
        peers[from].signal(signal);
    });

    socket.on('user-left', (userId) => {
        if (peers[userId]) {
            peers[userId].destroy();
            delete peers[userId];
            const videoElement = document.getElementById(`video-wrapper-${userId}`);
            if (videoElement) {
                videoElement.remove();
            }
        }
    });

    socket.on('room-users', (users) => {
        users.forEach(userId => {
            if (!peers[userId]) {
                createPeer(userId, false);
            }
        });
    });

    // Handle file receiving
    socket.on('file', (fileData) => {
        const { name, type, data, from, timestamp } = fileData;
        
        // Create a blob from the received data
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        // Add file to shared files list
        const filesList = document.getElementById('sharedFiles');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-file"></i>
            <span class="file-name">${name}</span>
            <span class="file-info">Shared by ${from}</span>
            <a href="${url}" download="${name}" class="download-btn">
                <i class="fas fa-download"></i>
            </a>
        `;
        filesList.appendChild(fileItem);
        
        // Show notification
        showNotification(`${from} shared a file: ${name}`, 'info');
    });

    // Handle chat messages
    socket.on('message', ({ content, from, id, timestamp }) => {
        const messages = document.getElementById('chatMessages');
        const messageElement = formatMessage(from, content, id === socket.id, timestamp);
        messages.appendChild(messageElement);
        messages.scrollTop = messages.scrollHeight;
    });
}

function createPeer(userId, initiator) {
    const peer = new SimplePeer({
        initiator,
        stream: localStream,
        trickle: false,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    peer.on('signal', (signal) => {
        socket.emit('signal', { to: userId, signal });
    });

    peer.on('stream', (stream) => {
        addVideoStream(stream, userId);
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (peers[userId]) {
            peers[userId].destroy();
            delete peers[userId];
        }
    });

    peer.on('close', () => {
        console.log('Peer connection closed:', userId);
        if (peers[userId]) {
            peers[userId].destroy();
            delete peers[userId];
            const videoElement = document.getElementById(`video-wrapper-${userId}`);
            if (videoElement) {
                videoElement.remove();
            }
        }
    });

    return peer;
}

function addVideoStream(stream, userId) {
    const videoGrid = document.getElementById('videoGrid');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    wrapper.id = `video-wrapper-${userId}`;
    
    const video = document.createElement('video');
    video.id = `video-${userId}`;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.innerHTML = `
        <div class="participant-info">
            <span class="participant-name">User</span>
            <span class="connection-quality">
                <i class="fas fa-signal"></i>
            </span>
        </div>
    `;
    
    wrapper.appendChild(video);
    wrapper.appendChild(overlay);
    videoGrid.appendChild(wrapper);

    // Monitor connection quality
    if (stream.getVideoTracks().length > 0) {
        monitorConnectionQuality(stream, userId);
    }
}

function monitorConnectionQuality(stream, userId) {
    const videoTrack = stream.getVideoTracks()[0];
    setInterval(() => {
        if (videoTrack.enabled) {
            const stats = videoTrack.getStats();
            if (stats) {
                const qualityIcon = document.querySelector(`#video-wrapper-${userId} .connection-quality i`);
                // Update connection quality indicator based on stats
                // This is a simplified version, you can make it more sophisticated
                if (qualityIcon) {
                    qualityIcon.style.color = stats.frameRate > 15 ? '#4caf50' : '#ff9800';
                }
            }
        }
    }, 2000);
}

function formatMessage(from, content, isOwn, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    
    const time = new Date(timestamp).toLocaleTimeString();
    
    messageDiv.innerHTML = `
        <div class="message-header">${from}</div>
        <div class="message-content">${content}</div>
        <div class="message-time">${time}</div>
    `;
    return messageDiv;
}

function cleanupAll() {
    // Stop all tracks in the local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close and cleanup all peer connections
    Object.values(peers).forEach(peer => {
        if (peer) {
            peer.destroy();
        }
    });
    
    // Clear peers object
    Object.keys(peers).forEach(key => delete peers[key]);
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
}
