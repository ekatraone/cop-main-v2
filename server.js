// external packages
const express = require('express');
require('dotenv').config("./env");
const test = require('./test.js');
const cors = require('cors');
const {createCertificate} = require('./certificate')
const course_approval = require('./course_status');
var Airtable = require('airtable');
const WA = require('./wati');
const airtable = require("./airtable_methods");
const outro = require('./outroflow');
// const cert = require('./certificate')
const mongoose = require("mongoose");
const mongodb = require('./mongodb');
const cop = require('./index');
const fs = require('fs');
const request = require('request');
const webApp = express();
const { sendText, sendTemplateMessage ,sendMedia} = require('./wati');
const { create } = require('domain');

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
            setTimeout(() => { sendText(currentModule, Phone); }, 1000);

            await updateStudentTableNextDayModule(Phone, NextDay, NextModule);
            if (NextModule !== 3 || NextDay !== 3) {
                if (NextModule === 3) NextDay++;
                setTimeout(() => { sendTemplateMessage(NextDay, Topic, "generic_course_template", Phone); sendText("Press Start Day to get started with next Module", Phone); }, 10000);

            } else {
                setTimeout(async() => {
                    sendText("Congratulations🎉🎊! You have completed the course. We are preparing your certificate of completion", Phone);
                    createCertificate(Name, Topic);
                    setTimeout(() => {
                        sendMedia("certificate.pdf",Name,"919405785390","Hey👋, your course completion certificate is ready!! Don't forget to share your achievement.");
                    },5000);
                })
            }

            console.log(currentModule);
        }
    } catch (error) {
        console.error("Failed getting approved data", error);

    }
}


webApp.post('/cop', async (req, res) => {
    const event = req.body;


    if (event.eventType === 'message' && event.buttonReply && event.buttonReply.text === 'Start Day') {
        console.log("Button Clicked");

        getCourseCreatedStudent_airtable(event.waId);

        console.log(event);


        const buttonText = event.buttonReply.text;
        const buttonPayload = event.buttonReply.payload;

        console.log(`Button Text: ${buttonText}`);
        console.log(`Button Payload: ${buttonPayload}`);


    }


    res.sendStatus(200);//send acknowledgement to wati server
});


webApp.get("/ping", async (req, res) => {
    console.log("Pinging whatsapp server")
    course_approval.course_approval()
    res.send("Booting Up AI Engine.........")
})

webApp.listen(process.env.PORT, () => {
    console.log(`Server is up and running at ${process.env.PORT}`);
});
