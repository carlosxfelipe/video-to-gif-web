# Video to GIF Web

A fast and secure web-based application to convert MP4 and other video formats into GIFs directly in your browser.

## Overview

This project was built to provide a client-side approach to video conversion using WebAssembly. By processing files directly in the browser, it ensures total user privacy, eliminates server infrastructure costs, and delivers a highly responsive user experience.

## Features

- Local processing: All video conversion is done securely on the client side. No files are uploaded to any external server.
- High performance: Powered by FFmpeg WebAssembly for fast conversion speeds.
- Customizable parameters: Adjust the framerate (FPS), scale percentage, and infinite loop settings before converting.
- Modern UI: A clean, glassmorphism-inspired interface.

## Technologies Used

- React
- TypeScript
- Vite
- FFmpeg WebAssembly (@ffmpeg/ffmpeg and @ffmpeg/core)
- Lucide React
- Vanilla CSS

## Getting Started

### Prerequisites

Make sure you have Node.js and npm installed on your machine.

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   npm install

### Running the Application

To start the development server, run:
npm run dev

Open your browser and navigate to the local server address provided in the terminal (usually http://localhost:5173).

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the [LICENSE](LICENSE) file for details.
