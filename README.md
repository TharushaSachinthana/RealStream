# RealStream

RealStream is a secure and efficient WebRTC-based video conferencing platform that supports real-time video/audio communication, text chat, and dynamic room management. With a focus on simplicity and accessibility, it provides seamless connectivity for users across various domains.

---

## Features

- **Real-time Video and Audio Communication**: High-quality, low-latency video and audio streams.
- **Text Chat Integration**: Chat alongside video calls for additional communication.
- **Dynamic Room Creation and Management**: Create and join custom rooms effortlessly.
- **Responsive and Intuitive UI**: Designed for ease of use across devices.
- **Secure Communication**: Uses HTTPS and STUN servers for secure connections.

---

## Architecture

The platform employs a client-server model:

- **Frontend (Client)**: Handles user interface and WebRTC functionalities.
- **Backend (Server)**: Manages signaling, user sessions, and static file serving.

### Data Flow

1. Users register and join rooms.
2. Backend establishes WebSocket connections.
3. WebRTC manages peer-to-peer media streams.

---

## Key Technologies Used

- **WebRTC**: Peer-to-peer video/audio communication.
- **Socket.IO**: Real-time signaling and data exchange.
- **Express.js**: Lightweight backend framework.
- **Node.js**: JavaScript runtime environment.
- **HTML/CSS/JavaScript**: For frontend development.
- **STUN/TURN Servers**: Ensuring reliable communication.

---

## Installation and Setup

### Prerequisites

- Node.js installed on your system.

### Steps

1. Clone the repository:
   ```bash
   git clone <https://github.com/TharushaSachinthana/RealStream.git>
   ```
2. Navigate to the project directory:
   ```bash
   cd RealStream
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate SSL certificates for secure communication.
5. Start the server:
   ```bash
   npm start
   ```
6. Open the application in your browser.

---

## Testing

- Tested on major browsers: Chrome, Firefox.
- Stress-tested for concurrent user connections.

---

## Challenges and Solutions

- **NAT Traversal**: Integrated STUN servers to resolve NAT traversal issues.
- **Concurrent Users**: Optimized WebSocket communication for efficiency.

---

## Future Enhancements

- Add recording functionality for video calls.
- Implement TURN servers for improved reliability.
- Enhance UI with advanced CSS frameworks.
- Develop a mobile application for iOS and Android.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Author

**Tharusha Sachinthana Thilakarathna**

---

Feel free to contribute, report issues, or suggest new features. Happy coding!
