import express from 'express';


import cors from 'cors';
import { createCertificate } from './certificate.js';
import { course_approval } from './course_status.js';
import Airtable from 'airtable';  // Airtable is commonly used with ES Modules as well
import { sendAudio, sendText, sendTemplateMessage, sendMedia, sendInteractiveButtonsMessage, sendInteractiveDualButtonsMessage } from './wati.js';
import azuretts from './textToSpeechAz.js';
import { solveUserQuery } from './OpenAI.js';
import { set } from 'mongoose';


const webApp = express();
webApp.use(express.json());
webApp.use(cors());


const getStudentData_Created = async (waId) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Getting student data....");

        const records = await base('Student').select({
            filterByFormula: `AND({Course Status} = 'Content Created', {Phone} = '${waId}',{Progress}='Pending')`,
        })
            .all();
        console.log(records);
        const filteredRecords = records.map(record => record.fields);
        return filteredRecords; // Note : this returns list of objects
    } catch (error) {
        console.error("Failed getting approved data", error);
    }
}
const updateStudentTableNextDayModule = async (waId, NextDay, NextModule) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        let progress = "Pending";
        const CurrentDay = NextDay;
        const CurrentModule = NextModule;

        // Logic to update NextDay and NextModule
        if (NextModule == 3) {
            NextDay++;
            NextModule = 1;
        } else {
            NextModule++;
        }
        if (NextDay == 4) progress = "Completed";

        console.log("Updating student data....");

        // Fetching the record with the specified phone and other filters
        const records = await base('Student').select({
            filterByFormula: `AND({Course Status} = 'Content Created', {Phone} = '${waId}', {Progress} = 'Pending')`,
        }).all();

        if (records.length === 0) {
            console.log("No matching records found.");
            return; // Exit early if no records are found
        }

        const record = records[0];  // No need to map if we know there's a record
        const recordId = record.id;

        // Updated data to be patched into the record
        const updatedRecord = {
            "Module Completed": CurrentModule,
            "Day Completed": CurrentDay,
            "Next Day": NextDay,
            "Next Module": NextModule,
            "Progress": progress
        };

        console.log("Record ID to update:", recordId);
        console.log("Updated record data:", updatedRecord);

        // Updating the record (removed the extra "fields" key)
        await base('Student').update(recordId, updatedRecord);

        console.log("Record updated successfully");

    } catch (error) {
        console.error("Failed to update record", error);
    }
};

const getStudentData_Pending = async (waId) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Getting student data....");

        const records = await base('Student').select({
            filterByFormula: `AND({Course Status} = 'Content Created', {Phone} = '${waId}',{Progress}='Pending')`,
        })
            .all();
        console.log(records);
        const filteredRecords = records.map(record => record.fields);
        return filteredRecords; // Note : this returns list of objects
    } catch (error) {
        console.error("Failed getting approved data", error);
    }
}


const getCourseContent = async (courseTableName, NextModule, NextDay) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_COURSE_BASE_ID);
    try {
        console.log(NextDay, " ", NextModule);
        console.log("Getting course data from tables " + courseTableName + "....");
        const records = await base(courseTableName).select({
            filterByFormula: `{Day} = ${NextDay}`,
        })
            .all()
            .catch(err => console.log(err));
        console.log(records);
        return records;

    } catch (error) {
        console.error("Failed getting approved data", error);
    }
}

const getCourseCreatedStudent_airtable = async (waId) => {
    try {

        const records = await getStudentData_Created(waId);
        if (!records || records.length === 0) {
            console.log("No records found");
            return;
        }
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            let { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule } = record;
            const courseTableName = Topic + "_" + Phone;
            console.log(courseTableName, NextModule, NextDay);
            const courseData = await getCourseContent(courseTableName, NextModule, NextDay);
            if (!courseData || courseData.length === 0) {
                console.log("No course data found");
                return;
            }
            const currentModule = courseData[0].fields[`Module ${NextModule} Text`];
            const initialText = `Hello ${Name},\n\nI hope you are doing well. Here is your course content for today.\n Module ${NextModule}\n\n`;
            await sendText(initialText, Phone);
            
            console.log('Starting audio processing timeout...');
            setTimeout(async () => {
                try {
                    await sendText(currentModule, Phone);
                    console.log('Text sent, starting audio processing...');
                    const filename = `${Phone}_${Topic}_${Date.now()}`;
                    await azuretts(currentModule, Phone);
                    
                } catch (error) {
                    console.error('Error in timeout callback:', error);
                }
            }, 1000);


            await updateStudentTableNextDayModule(Phone, NextDay, NextModule);

            if (NextModule !== 3 || NextDay !== 3) {
                if (NextModule === 3) NextDay++;
                setTimeout(() => {
                    if (NextModule === 3) {
                        //Day over
                        // Now QNA time: user can ask for doubts.
                        sendInteractiveDualButtonsMessage(`Hey👋 ${Name}`, "You have completed the day's module. Do you have any doubts?", "Yes", "No", Phone);
                    } else {
                        sendInteractiveButtonsMessage(`Hey👋 ${Name}`, "Don't let the learning stop!! Start next Module", "Next Module", Phone);
                    }
                }, 10000);

            } else {
                setTimeout(async () => {
                    sendText("Congratulations🎉🎊! You have completed the course. We are preparing your certificate of completion", Phone);
                    const pdfbuffer = await createCertificate(Name, Topic);
                    setTimeout(() => {
                        sendMedia(pdfbuffer, Name, Phone, "Hey👋, your course completion certificate is ready!! Don't forget to share your achievement.");
                    }, 5000);
                })
            }

            console.log(currentModule);
        }
    } catch (error) {
        console.error("Failed getting approved data", error);

    }
}

const get_student_table_send_remainder = async () => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    const records = await base('Student').select({
        filterByFormula: `AND({Course Status} = 'Content Created', {Progress} = 'Pending')`,
    }).all();
    for (let i = 0; i < records.length; i++) {
        let { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule } = records[i].fields;
        sendTemplateMessage(NextDay, Topic, "generic_course_template", Phone); sendText("Press Start Day to get started with next Module", Phone);

    }
}

const setDountBit = async (waId, doubtBit, Title) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Setting doubt bit....");

        // Fetching the record with the specified phone and other filters
        const records = await base('Student').select({
            filterByFormula: `AND({Phone} = '${waId}', {Progress} = 'Pending',{Topic}='${Title}')`,
        }).all();

        if (records.length === 0) {
            console.log("No matching records found.");
            return; // Exit early if no records are found
        }

        const record = records[0];  // No need to map if we know there's a record
        const recordId = record.id;

        // Updated data to be patched into the record
        const updatedRecord = {
            "Doubt": doubtBit
        };

        console.log("Record ID to update:", recordId);
        console.log("Updated record data:", updatedRecord);

        // Updating the record (removed the extra "fields" key)
        await base('Student').update(recordId, updatedRecord);

        console.log("Record updated successfully");

    } catch (error) {
        console.error("Failed to update record", error);
    }
}

const getDoubtBit = async (waId, Title) => {
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        console.log("Getting doubt bit....");

        // Fetching the record with the specified phone and other filters
        const records = await base('Student').select({
            filterByFormula: `AND({Phone} = '${waId}', {Progress} = 'Pending',{Topic}='${Title}')`,
        }).all();

        if (records.length === 0) {
            console.log("No matching records found.");
            return; // Exit early if no records are found
        }


        return record.fields.Doubt;

    } catch (error) {
        console.error("getdoubtbit fucntion: Failed to update record", error);
    }
}

webApp.get('/nextday', async (req, res) => {
    get_student_table_send_remainder();
    res.send("Sending Remainder to students");
});

webApp.post('/cop', async (req, res) => {
    const event = req.body;


    if ((event.eventType === 'message' && event.buttonReply && event.buttonReply.text === 'Start Day')) {
        console.log("Button Clicked");

        getCourseCreatedStudent_airtable(event.waId);

        console.log(event);


        const buttonText = event.buttonReply.text;
        const buttonPayload = event.buttonReply.payload;

        // console.log(`Button Text: ${buttonText}`);
        // console.log(`Button Payload: ${buttonPayload}`);


    } else if (event.type === 'interactive' && event.text === 'Next Module') {
        console.log("Button Clicked");

        getCourseCreatedStudent_airtable(event.waId);


    } else if (event.type === 'interactive' && event.text === 'Yes') {
        console.log("Button Clicked Yes");
        try {
            const records = await getStudentData_Pending(event.waId);
            const record = records[0];
            const { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule, "Doubt": Doubt } = record;
            //set doubt bit to true;
            setDountBit(event.waId, 1, Topic);
        } catch (error) {
            console.error("Failed getting approved data", error);
        }
        sendText("Please type your query", event.waId);
    } else if (event.type === 'interactive' && event.text === 'No') {
        //set doubt bit to false;
        try {
            const records = await getStudentData_Pending(event.waId);
            const record = records[0];
            const { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay, "Next Module": NextModule, "Doubt": Doubt } = record;
            //set doubt bit to true;
            setDountBit(event.waId, 0, Topic);
        } catch (error) {
            console.error("Failed getting approved data", error);
        }

        console.log("Button Clicked No");
        sendText("Great!! Keep learning and See you tomorrow!", event.waId);
    } else if (event.type === 'image') {
        console.log("Image Received");
        (async () => {
            const fetch = (await import('node-fetch')).default; // Dynamic import of node-fetch
            const { BlobServiceClient } = require('@azure/storage-blob'); // Import Azure Storage Blob SDK

            const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_BLOB_CONNECTION_STRING_key;
            const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME;

            // Function to fetch image with auth headers
            const fetchImage = async (url, authHeaders) => {
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: authHeaders
                    });

                    // Check if the response is ok and log headers for debugging
                    console.log(`Fetch Response Status: ${response.status}`);
                    console.log(`Fetch Response Headers:`, response.headers.raw());

                    if (!response.ok) {
                        throw new Error(`Image not accessible: ${response.status}`);
                    }

                    // Check if the response is of image type
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.startsWith('image/')) {
                        throw new Error(`Expected an image but got: ${contentType}`);
                    }

                    const buffer = await response.buffer(); // Await buffer creation
                    return buffer;
                } catch (error) {
                    console.error('Error fetching image:', error);
                    return null; // Return null on error
                }
            };

            // Function to upload image to Azure Blob Storage
            const uploadImageToBlob = async (imageBuffer, blobName) => {
                const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
                const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

                // Create the container if it does not exist
                await containerClient.createIfNotExists();

                // Upload the image
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.upload(imageBuffer, imageBuffer.length, {
                    blobHTTPHeaders: {
                        blobContentType: 'image/jpg',
                        blobContentDisposition: 'inline' // Set to inline for viewing
                    }
                });

                console.log(`Image uploaded to Azure Blob Storage: ${blobName}`);
                console.log(`Public URL: ${blockBlobClient.url}`);
                return blockBlobClient.url; // Return the public URL of the uploaded image
            };

            // Function to call the vision model API
            const callVisionModel = async (imageUrl) => {
                const apiEndpoint = "https://proxy.tune.app/chat/completions";
                const apiKey = process.env.TUNE_STUDIO_API_KEY;

                try {
                    const response = await fetch(apiEndpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": apiKey,
                        },
                        body: JSON.stringify({
                            temperature: 0.8,
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "text",
                                            text: "\n"
                                        }
                                    ]
                                },
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "text",
                                            text: "what is it"
                                        },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                url: imageUrl // Use the public URL from Azure
                                            }
                                        }
                                    ]
                                }
                            ],
                            model: "meta/llama-3.2-90b-vision",
                            stream: false,
                            frequency_penalty: 0,
                            max_tokens: 900
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log("Response Data:", data);
                    const message = data.choices[0].message;
                    console.log("Message Content:", message.content);
                    sendText(message.content, event.waId);
                    return message.content; // Return the message content
                } catch (error) {
                    console.error("Error fetching data:", error);
                    return null; // Return null or an appropriate value to indicate failure
                }
            };

            // Example usage
            const imageUrl = `${event.data}`;
            const authHeaders = {
                "Authorization": `${process.env.WATI_API}`
            };

            const imageBuffer = await fetchImage(imageUrl, authHeaders);
            if (imageBuffer) {
                const blobName = "uploaded_image.jpg"; // Name for the uploaded image
                const publicUrl = await uploadImageToBlob(imageBuffer, blobName);
                await callVisionModel(publicUrl);
            }
        })();

    }
    else if (event.eventType === 'message') {
        let flag = false;
        let doubt = 0;
        let name = "User";
        let Phone = event.waId;
        try {
            const records = await getStudentData_Pending(event.waId);
            const record = records[0];
            const { Name, "Doubt": Doubt } = record;
            flag = true;
            doubt = Doubt;
            name = Name;

        } catch (error) {
            console.error("Failed getting approved data", error);
        }
        if (flag && doubt == 1) {
            //User query
            console.log("User Query", event.text);
            await solveUserQuery(event.text, event.waId);
            setTimeout(async () => {
                await sendInteractiveDualButtonsMessage(
                    `Hey👋 ${name}`,
                    "Any other doubts?",
                    "Yes",
                    "No",
                    Phone
                );
            }, 1000);  // 10 seconds delay

        }

    };


    res.sendStatus(200);//send acknowledgement to wati server
});


webApp.get("/ping", async (req, res) => {
    console.log("Pinging whatsapp server")
    course_approval()
    res.send("Booting Up AI Engine.........")
})

const port = process.env.port || 3000;
webApp.listen(port, () => {
    console.log(`Server is up and running at ${port}`);
});
