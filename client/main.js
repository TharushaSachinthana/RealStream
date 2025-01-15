let isAudioEnabled = true;
let isVideoEnabled = true;
let originalStream;

async function register() {
    const username = document.getElementById('username').value.trim();
    const roomName = document.getElementById('roomName').value.trim();
    
    if (!username) {
        alert('Please enter a username');
        return;
    }

    try {
        const success = await getLocalStream();
        if (!success) {
            alert('Failed to access media devices');
            return;
        }

        document.getElementById('login').classList.add('hidden');
        document.getElementById('main').classList.remove('hidden');
        document.getElementById('currentRoom').textContent = roomName || 'Main Lobby';

        initWebRTC();
        socket.emit('join', { username, room: roomName });
    } catch (err) {
        console.error('Error during registration:', err);
        alert('Failed to join the room. Please try again.');
    }
}

function toggleAudio() {
    const audioTracks = localStream.getAudioTracks();
    isAudioEnabled = !isAudioEnabled;
    audioTracks.forEach(track => track.enabled = isAudioEnabled);
    
    const icon = document.querySelector('#audioToggle i');
    icon.className = isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
}

function toggleVideo() {
    const videoTracks = localStream.getVideoTracks();
    isVideoEnabled = !isVideoEnabled;
    videoTracks.forEach(track => track.enabled = isVideoEnabled);
    
    const icon = document.querySelector('#videoToggle i');
    icon.className = isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message) {
        socket.emit('message', message);
        input.value = '';
    }
}

// Remove these functions as they are now in webrtc.js
// socket.on('message', ...) 
// function formatMessage(...)

function leaveSession() {
    if (confirm('Are you sure you want to leave the session?')) {
        cleanupAll();
        
        // Reset UI elements
        document.getElementById('main').classList.add('hidden');
        document.getElementById('login').classList.remove('hidden');
        
        // Clear chat messages
        document.getElementById('chatMessages').innerHTML = '';
        
        // Reset local video
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = null;
        }
        
        // Reset control buttons
        document.querySelector('#audioToggle i').className = 'fas fa-microphone';
        document.querySelector('#videoToggle i').className = 'fas fa-video';
        isAudioEnabled = true;
        isVideoEnabled = true;
    }
}

function toggleChat() {
    const chatPanel = document.getElementById('chatPanel');
    chatPanel.classList.toggle('hidden');
}

// Event listener for Enter key in message input
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
