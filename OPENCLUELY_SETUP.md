# OpenCluely Setup Guide

## Overview
OpenCluely is an open-source AI interview assistant that provides real-time help during video calls and technical interviews. This guide covers the setup and advanced features integration.

## Prerequisites
- Node.js 18+
- npm
- Python 3 (for Whisper speech recognition)
- Google Gemini API key

## Quick Start

### 1. Get API Keys
**Google Gemini API Key:**
- Visit: https://aistudio.google.com/
- Create a new API key
- Copy the key

### 2. Configure Environment
Edit `OpenCluely/.env`:
```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
SPEECH_PROVIDER=whisper
WHISPER_MODEL=base
WHISPER_LANGUAGE=en
WHISPER_SEGMENT_MS=4000
```

### 3. Install Dependencies
Dependencies are already installed. To verify:
```bash
cd OpenCluely
npm install
```

### 4. Run the Application

**Development Mode (with debugging):**
```bash
cd OpenCluely
npm run dev
```

**Production Mode:**
```bash
cd OpenCluely
npm start
```

## Audio Setup for System Audio Capture

### macOS
Use **BlackHole** for system audio routing:
```bash
brew install blackhole-2ch
# Then configure in Audio MIDI Setup as described in main context
```

### Windows
Use **VB-Audio VoiceMeeter**:
1. Download from: https://vb-audio.com/Voicemeeter/
2. Install and restart
3. Set Zoom/Meet output to VoiceMeeter Input
4. Configure OpenCluely to listen to VoiceMeeter Output

## Building for Distribution

**macOS:**
```bash
npm run build:mac
```

**Windows:**
```bash
npm run build:win
```

**Linux:**
```bash
npm run build:linux
```

**All Platforms:**
```bash
npm run build:all
```

Built packages will be in the `dist/` directory.

## Advanced Features (To Be Implemented)
- Multimodal input (screenshot + transcription to Gemini)
- Local Whisper-Large-v3 for better accuracy
- Custom system prompts for different interview types
- Enhanced speaker diarization
- Enterprise-grade noise cancellation

## Troubleshooting

**App won't start:**
- Check that GEMINI_API_KEY is set correctly in .env
- Ensure Node.js version is 18+
- Try: `npm run dev` for more detailed error messages

**Audio not working:**
- Verify SPEECH_PROVIDER is set to "whisper" or "azure"
- Check that audio devices are properly configured
- Run speech test: `npm run test-speech`

**Transcription errors:**
- Update Whisper model: `pip install --upgrade openai-whisper`
- Try a larger model: `WHISPER_MODEL=small npm run dev`
