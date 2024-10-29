
import fetch from 'node-fetch';
import FormData from 'form-data';
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import dotenv from 'dotenv';
dotenv.config();

// Set the ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);


// Set the ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);
const azuretts = async (text, phoneNumber) => {
    console.log("\n=== Starting Azure TTS Process ===");
    console.log("📝 Input text:", text);
    console.log("📱 Phone number:", phoneNumber);
    
    // Configure speech service
    const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.SPEECH_KEY,
        process.env.SPEECH_REGION
    );
    speechConfig.speechSynthesisVoiceName = "en-IN-NeerjaNeural";

    // Create the file output configuration
    const audioFile = `temp_output.wav`; // Temporary WAV file
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);
    
    // Create the speech synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // Synthesize speech
    console.log("🎼 Starting speech synthesis...");
    return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
            text,
            async (result) => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log("✅ Speech synthesis completed");

                    try {
                        synthesizer.close();

                        // Convert WAV to MP3 using ffmpeg
                        const mp3File = `${phoneNumber}_audio.mp3`;
                        console.log("🔄 Starting WAV to MP3 conversion...");

                        ffmpeg(audioFile)
                            .toFormat('mp3')
                            .output(mp3File)
                            .on('end', async () => {
                                console.log("✅ Conversion to MP3 completed");

                                // Prepare to send the MP3 file to WATI API
                                const form = new FormData();
                                form.append('file', fs.createReadStream(mp3File));

                                console.log("📤 Sending to WATI API...");
                                try {
                                    const response = await fetch(
                                        `https://${process.env.WATI_URL_FOR_CERTIFICATE}/api/v1/sendSessionFile/${phoneNumber}`,
                                        {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `${process.env.WAIT_API}`,
                                                ...form.getHeaders()
                                            },
                                            body: form
                                        }
                                    );
                                    const data = await response.json();
                                    console.log("✅ WATI API response:", data);

                                    // Cleanup temporary files
                                    fs.unlinkSync(audioFile);
                                    fs.unlinkSync(mp3File);

                                    resolve(data);
                                } catch (err) {
                                    console.error("❌ Error sending to WATI API:", err);
                                    reject(err);
                                }
                            })
                            .on('error', (err) => {
                                console.error("❌ FFmpeg conversion error:", err);
                                reject(err);
                            })
                            .run();
                    } catch (error) {
                        console.error("❌ Error processing audio:", error);
                        synthesizer.close();
                        reject(error);
                    }
                } else {
                    console.error("❌ Speech synthesis canceled:", result.errorDetails);
                    synthesizer.close();
                    reject(new Error(result.errorDetails));
                }
            },
            (err) => {
                console.error("❌ Synthesis error:", err);
                synthesizer.close();
                reject(err);
            }
        );
    });
};
  export default azuretts;
