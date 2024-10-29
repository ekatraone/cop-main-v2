import request from 'request';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Load environment variables
dotenv.config();


export const getMessages = async (senderID, at) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: `https://${process.env.URL}/api/v1/getMessages/${senderID}`,
            headers: {
                Authorization: process.env.API
            },
            formData: {
                pageSize: '10',
                pageNumber: '1'
            }
        };

        request(options, (error, response) => {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                at = Number(at);
                try {
                    const result = JSON.parse(response.body);
                    if (result && result.messages && result.messages.items[at]) {
                        resolve(result.messages.items[at]);
                    } else {
                        reject(new Error('Message not found'));
                    }
                } catch (error) {
                    console.log(error);
                    reject(error);
                }
            }
        });
    });
};

export const sendMedia = async (buffer, filename, senderID, msg) => {
    const form = new FormData();
    form.append('file', buffer, {
        contentType: 'application/pdf',
        filename: filename
    });

    try {
        const response = await axios.post(
            `https://${process.env.WATI_URL_FOR_CERTIFICATE}/api/v1/sendSessionFile/${senderID}?caption=${msg}`,
            form,
            {
                headers: {
                    Authorization: process.env.WAIT_API,
                    ...form.getHeaders()
                }
            }
        );
        console.log('File sent successfully');
    } catch (error) {
        console.error('Error sending file:', error);
    }
};

export const sendAudio = async (file, phone) => {
    const filename =file+'.mp3';
    try {
        console.log("Sending audio to ", phone, "file name", filename);
        
        // Construct absolute file path
        const filePath = path.join(__dirname, filename);
        console.log("File path:", filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('File not found at:', filePath);
            throw new Error('Audio file not found');
        }

        const url = `https://${process.env.WATI_URL_FOR_CERTIFICATE}/api/v1/sendSessionFile/${phone}`;
        
        const form = new FormData();
        
        // Create read stream with absolute path
        const fileStream = fs.createReadStream(filePath);
        form.append('file', fileStream, {
            filename: filename,
            contentType: 'audio/mp3'
        });

        // Log form contents for debugging
        console.log("Form contents:", form);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `${process.env.WAIT_API}`,
                ...form.getHeaders()
            },
            body: form
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', errorText);
            throw new Error(`API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        return data;

    } catch (error) {
        console.error('Error in sendAudio:', error);
        throw error;
    }
};

export const sendInteractiveButtonsMessage = async (hTxt, bTxt, btnTxt, senderID) => {
    const options = {
        method: 'POST',
        url: `https://${process.env.URL}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${senderID}`,
        headers: {
            Authorization: process.env.API,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            header: {
                type: 'Text',
                text: hTxt
            },
            body: bTxt,
            buttons: [
                {
                    text: btnTxt
                }
            ]
        })
    };

    request(options, (error, response) => {
        if (error) {
            console.log(error);
        } else {
            console.log(response.body);
        }
    });
};

export const sendInteractiveDualButtonsMessage = async (hTxt, bTxt, btnTxt1, btnTxt2, senderID) => {
    const options = {
        method: 'POST',
        url: `https://${process.env.URL}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${senderID}`,
        headers: {
            Authorization: process.env.API,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            header: {
                type: 'Text',
                text: hTxt
            },
            body: bTxt,
            buttons: [
                {
                    text: btnTxt1
                },
                {
                    text: btnTxt2
                }
            ]
        })
    };

    request(options, (error, response) => {
        if (error) {
            console.log(error);
        } else {
            console.log(response.body);
        }
    });
};

export const sendText = async (msg, senderID) => {
    console.log("Sending message to ", senderID);
    const options = {
        method: 'POST',
        url: `https://${process.env.URL}/api/v1/sendSessionMessage/${senderID}`,
        headers: {
            Authorization: process.env.API,
        },
        formData: {
            messageText: msg,
        }
    };

    request(options, (error, response) => {
        if (error) {
            console.log(error);
        } else {
            const body = JSON.parse(response.body);
            const result = body.result;
            console.log("Message sent:", result);
        }
    });
};

export const sendListInteractive = async (data, body, btnText, senderID) => {
    const options = {
        method: 'POST',
        url: `https://${process.env.URL}/api/v1/sendInteractiveListMessage?whatsappNumber=${senderID}`,
        headers: {
            Authorization: process.env.API,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            header: "",
            body: body,
            footer: "",
            buttonText: btnText,
            sections: [
                {
                    title: "Options",
                    rows: data
                }
            ]
        })
    };

    request(options, (error, response) => {
        if (error) {
            console.error(error);
        } else {
            console.log("Result returned", response.body);
        }
    });
};

export const sendDynamicInteractiveMsg = async (data, body, senderID) => {
    const options = {
        method: 'POST',
        url: `https://${process.env.URL}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${senderID}`,
        headers: {
            Authorization: process.env.API,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            body: body,
            buttons: data
        })
    };

    request(options, (error, response) => {
        if (error) {
            console.error(error);
        } else {
            console.log(response.body);
        }
    });
};

export async function sendTemplateMessage(day, course_name, template_name, senderID) {
    const params = [{ name: "day", value: day }, { name: "course_name", value: course_name }];
    const options = {
        method: 'POST',
        url: `https://${process.env.URL}/api/v1/sendTemplateMessage/${senderID}`,
        headers: {
            Authorization: process.env.API,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            template_name: template_name,
            broadcast_name: template_name,
            parameters: JSON.stringify(params)
        })
    };

    request(options, (error, response) => {
        if (error || JSON.parse(response.body).result === false) {
            console.log("WATI error " + response.body);
        } else {
            console.log("Res " + JSON.parse(response.body).result);
        }
    });
}

