# Video to GIF Web

**[Live Demo](https://video-to-gif-web.netlify.app/)**

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

## Known Limitations

- **AV1 WebM files:** The standard WebAssembly build of FFmpeg (`@ffmpeg/core`) does not include an AV1 decoder due to file size constraints. To work around this, when an AV1 `.webm` file is detected, the app decodes it using the browser's native AV1 decoder (available in Chrome, Firefox and Edge), captures the frames, and assembles the GIF with FFmpeg. This path is slightly slower than the regular conversion and requires a browser with AV1 playback support (older versions of Safari may not work).
- **Other unsupported codecs:** If a complex conversion fails due to an unsupported codec or color profile, the app will automatically try a fallback simpler conversion, but some files may still be incompatible.

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
