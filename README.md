# MeetMake - Video Conferencing Platform

A WebRTC-based platform for real-time video/audio communication, designed for seamless online meetings and collaborations.

## Features

- Real-time video and audio streaming
- Multiple participant support
- Chat functionality
- Room-based sessions
- Audio/Video controls
- Responsive design
- Low-latency peer-to-peer connections

## Prerequisites

- Node.js (v16 or higher)
- SSL certificates (for HTTPS)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/hasithapramuditha/MeetMake.git
cd MeetMake
```

2. Install dependencies for both server and client:
```bash
npm install
```

3. Generate SSL certificates (required for WebRTC):
```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```

4. Start the development servers:
```bash
node server/server.js
```

5. Access the application:
   - Open your browser and navigate to `http://localhost:3000`

## Technology Stack

- Frontend:
  - React.js
  - Redux Toolkit
  - Material-UI
  - Socket.IO Client
- Backend:
  - Node.js
  - Express
  - Socket.IO

## Architecture

- Server handles signaling and room management
- WebRTC for peer-to-peer media streaming
- Socket.IO for real-time communication
- STUN/TURN servers for NAT traversal

## Security Notes

- Uses HTTPS for secure communication
- Peer-to-peer encryption for media streams
- Room-based access control

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request