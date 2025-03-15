let socket;
let localStream;
let peers = {};
let isAudioEnabled = true;
let isVideoEnabled = true;
let isScreenSharing = false;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingStartTime = null;
let screenStream = null;
let originalStream;
let sidePanelVisible = false;
let currentRoom;

// Initialize socket connection
socket = io();

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showToast('Lost connection to server. Trying to reconnect...', 'error');
});

socket.on('reconnect', () => {
    showToast('Reconnected to server!', 'success');
    if (currentRoom) {
        socket.emit('join', { username: document.getElementById('username').value, room: currentRoom });
    }
});

// Get local media stream
async function getLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        document.getElementById('localVideo').srcObject = localStream;
        return true;
    } catch (err) {
        console.error('Error accessing media devices:', err);
        showToast('Failed to access camera/microphone', 'error');
        return false;
    }
}

// Room Management
async function register() {
    const username = document.getElementById('username').value.trim();
    const roomName = document.getElementById('roomName').value.trim() || 'default';
    
    if (!username) {
        showToast('Please enter your name', 'error');
        return;
    }
    
    try {
        const success = await getLocalStream();
        if (!success) {
            showToast('Failed to access media devices', 'error');
            return;
        }

        currentRoom = roomName;
        document.getElementById('currentRoom').textContent = `Room: ${roomName}`;
        document.getElementById('login').classList.add('hidden');
        document.getElementById('main').classList.remove('hidden');
        
        initWebRTC();
        socket.emit('join', { username, room: roomName });
        generateMeetingLink();
        
        showToast('Successfully joined the room!', 'success');
    } catch (err) {
        console.error('Error during registration:', err);
        showToast('Failed to join the room', 'error');
    }
}

// WebRTC functions
function initWebRTC() {
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('signal', handleSignal);
}

function handleUserJoined(data) {
    console.log('User joined:', data);
    createPeerConnection(data.id, true);
}

function handleUserLeft(userId) {
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
    const videoEl = document.getElementById(`video-${userId}`);
    if (videoEl) {
        videoEl.parentElement.remove();
    }
}

function handleSignal(data) {
    if (!peers[data.from]) {
        createPeerConnection(data.from, false);
    }
    peers[data.from].signal(data.signal);
}

// Media Controls
function toggleAudio() {
    const audioTracks = localStream.getAudioTracks();
    isAudioEnabled = !isAudioEnabled;
    audioTracks.forEach(track => track.enabled = isAudioEnabled);
    
    const button = document.getElementById('audioToggle');
    button.innerHTML = `<i class="fas fa-microphone${isAudioEnabled ? '' : '-slash'}"></i>`;
    button.classList.toggle('active', !isAudioEnabled);
    
    showToast(`Microphone ${isAudioEnabled ? 'unmuted' : 'muted'}`, 'info');
}

function toggleVideo() {
    const videoTracks = localStream.getVideoTracks();
    isVideoEnabled = !isVideoEnabled;
    videoTracks.forEach(track => track.enabled = isVideoEnabled);
    
    const button = document.getElementById('videoToggle');
    button.innerHTML = `<i class="fas fa-video${isVideoEnabled ? '' : '-slash'}"></i>`;
    button.classList.toggle('active', !isVideoEnabled);
    
    showToast(`Camera ${isVideoEnabled ? 'started' : 'stopped'}`, 'info');
}

async function toggleScreenShare() {
    const button = document.getElementById('screenShareToggle');
    
    try {
        if (!isScreenSharing) {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true,
                audio: true 
            });
            
            originalStream = localStream;
            const videoTrack = screenStream.getVideoTracks()[0];
            
            Object.values(peers).forEach(peer => {
                const sender = peer.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            
            document.getElementById('localVideo').srcObject = screenStream;
            
            videoTrack.onended = () => {
                stopScreenSharing();
            };
            
            isScreenSharing = true;
            button.classList.add('active');
            showToast('Screen sharing started', 'success');
        } else {
            stopScreenSharing();
        }
    } catch (err) {
        console.error('Error sharing screen:', err);
        showToast('Failed to share screen', 'error');
    }
}

function stopScreenSharing() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        
        const videoTrack = originalStream.getVideoTracks()[0];
        Object.values(peers).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
                sender.replaceTrack(videoTrack);
            }
        });
        
        document.getElementById('localVideo').srcObject = originalStream;
        
        isScreenSharing = false;
        document.getElementById('screenShareToggle').classList.remove('active');
        showToast('Screen sharing stopped', 'info');
    }
}

// Recording
function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    try {
        recordedChunks = [];
        const stream = document.getElementById('localVideo').srcObject;
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            a.download = `recording-${new Date().toISOString()}.webm`;
            a.click();
            window.URL.revokeObjectURL(url);
        };

        mediaRecorder.start(1000);
        isRecording = true;
        recordingStartTime = Date.now();
        document.getElementById('recordingIndicator').classList.remove('hidden');
        document.getElementById('recordToggle').classList.add('active');
        
        updateRecordingTime();
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
        showToast('Recording started', 'success');
    } catch (err) {
        console.error('Error starting recording:', err);
        showToast('Failed to start recording', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('recordingIndicator').classList.add('hidden');
        document.getElementById('recordToggle').classList.remove('active');
        clearInterval(recordingTimer);
        showToast('Recording saved', 'success');
    }
}

function updateRecordingTime() {
    const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
    const seconds = (duration % 60).toString().padStart(2, '0');
    document.getElementById('recordingTime').textContent = `${minutes}:${seconds}`;
}

// Chat and Files
function toggleSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    sidePanelVisible = !sidePanelVisible;
    sidePanel.classList.toggle('show', sidePanelVisible);
}

function switchPanel(panelType) {
    const chatPanel = document.getElementById('chatPanel');
    const filesPanel = document.getElementById('filesPanel');
    const buttons = document.querySelectorAll('.tab-btn');

    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (panelType === 'chat') {
        chatPanel.classList.remove('hidden');
        filesPanel.classList.add('hidden');
    } else {
        chatPanel.classList.add('hidden');
        filesPanel.classList.remove('hidden');
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message) {
        socket.emit('message', message);
        addMessage({ content: message, from: 'You', id: socket.id, timestamp: new Date().toISOString() }, true);
        input.value = '';
    }
}

function addMessage(message, isOwn = false) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = `message${isOwn ? ' own' : ''}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    messageElement.innerHTML = `
        <div class="message-header">${message.from}</div>
        <div class="message-content">${message.content}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Meeting Link
function generateMeetingLink() {
    const roomId = currentRoom || 'default';
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    document.getElementById('meetingLink').value = url.toString();
}

function copyMeetingLink() {
    const linkInput = document.getElementById('meetingLink');
    linkInput.select();
    document.execCommand('copy');
    
    showToast('Meeting link copied to clipboard!', 'success');
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Event Listeners
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Socket event handlers
socket.on('message', (message) => {
    addMessage(message);
});

socket.on('participant-count', (count) => {
    document.querySelector('#participantCount span').textContent = count;
});

// Check URL for room parameter on load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        document.getElementById('roomName').value = roomFromUrl;
    }
});
