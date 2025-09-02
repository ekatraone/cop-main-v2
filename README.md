# AI Micro‑Course Generator

This project powers **Ekatra's WhatsApp micro‑learning platform**.  It uses AI to generate short courses, stores the content in Airtable, and delivers lessons to learners through WhatsApp using the WATI API.  Additional features include text‑to‑speech audio generation and automatic PDF certificates on course completion.

## Features

- **Course generation** – Creates three‑day courses with three modules per day using Azure OpenAI models.
- **Airtable integration** – Stores student records and generated course content in separate bases.
- **WhatsApp delivery** – Sends text, interactive buttons, lists, media, and templates via the WATI API.
- **Text‑to‑speech** – Converts lesson text to speech with Microsoft Cognitive Services and delivers MP3 files to the learner.
- **Certificates** – Generates completion certificates as PDFs and sends them through WhatsApp.
- **Image analysis** – Optionally uploads images to Azure Blob Storage and queries vision models.

## Getting Started

### Prerequisites

- Node.js 18+
- An Airtable account and bases for students and courses
- WATI account for WhatsApp messaging
- Azure OpenAI or equivalent LLM endpoint
- Microsoft Speech Service for text‑to‑speech
- (Optional) Azure Blob Storage for vision features

### Installation

```bash
npm install
```

### Environment Variables
Create a `.env` file and supply the required keys.  Common variables include:

```dotenv
# Airtable
AIRTABLE_PERSONAL_ACCESS_TOKEN=...
AIRTABLE_STUDENT_BASE_ID=...
AIRTABLE_COURSE_BASE_ID=...

# WATI WhatsApp API
URL=...
API=...
WATI_URL_FOR_CERTIFICATE=...
WAIT_API=...

# Azure / LLM
AZURE_LLAMA_API_KEY=...
AZURE_LLAMA_ENDPOINT=...
SPEECH_KEY=...
SPEECH_REGION=...

# Optional image handling
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER=...
TUNE_STUDIO_API_KEY=...

# Server
PORT=3000
```

### Run the Server

```bash
npm start
```
The server listens for webhooks and sends learning modules to learners via WhatsApp.

## Project Structure

| Path | Description |
| --- | --- |
| `server.js` | Express server handling webhooks and message routing |
| `OpenAI.js` | Course generation and Airtable helpers |
| `wati.js` | Wrapper around the WATI WhatsApp API |
| `textToSpeechAz.js` | Microsoft TTS integration |
| `certificate.js` | PDF certificate generator |
| `airtable_methods.js`, `test.js`, etc. | Legacy or experimental utilities |

## Testing

No automated test suite is provided. Running `npm test` will report the missing script.

## License

[ISC](LICENSE)

