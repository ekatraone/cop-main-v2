var Airtable = require('airtable');
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app= express();
const port =3000;





const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey:    process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_KEY
});
const openai = new OpenAIApi(configuration);




const getApprovedRecords = async()=>{
    var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        const records = await base('Student').select({
            filterByFormula:`{Course Status} = 'Approved'`,
        })
        .all();
        // console.log("Approved records",records);
        const filteredRecords = records.map(record=>record.fields);
        // console.log(filteredRecords);
        return filteredRecords; // Note : this returns list of objects
    } catch (error) {
        console.error("Failed getting approved data",error);
    }
}
async function createTable(courseName, moduleNumber=3) {
    console.log("Creating table ");

    const airtableFields = [];

    const dayField = {
        "name": "Day",
        "type": "number",
        "options": {
            "precision": 0
        }
    };
    airtableFields.push(dayField);

    for (let i = 1; i <= moduleNumber; i++) {
        const fieldModuleTopic = {
            "name": "Module " + i + " Text",
            "type": "multilineText" // or "multilineText" based on Airtable's API requirements
        };
        airtableFields.push(fieldModuleTopic);
    }

    const requestBody = {
        "name": courseName,
        "description": "A description of the course topics", // Optional
        "fields": airtableFields
    };

    try {
        const response = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_COURSE_BASE_ID}/tables`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        if (response.ok) {
            console.log("Table created successfully:");
            return responseData.id;
        } else {
            console.error("Error creating table:", responseData);
        }
    } catch (error) {
        console.error("Error creating table:", error);
    }
}


async function updateCourseRecords(tableId, courseData) {
    try {
        var base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_COURSE_BASE_ID);
        // console.log(day, modules);
      for (const [day, modules] of Object.entries(courseData)) {
        console.log(`Creating record for ${day}...`);
        // Extract module content as strings
      const module1Content = modules.module1.content || "";
      const module2Content = modules.module2.content || "";
      const module3Content = modules.module3.content || "";
        await base(tableId).create([
          {
            fields: {
              "Day": Number(day),
              "Module 1 Text": module1Content,
              "Module 2 Text": module2Content,
              "Module 3 Text": module3Content
            }
          }
        ]);
        console.log(`Record for ${day} created successfully.`);
      }
    } catch (error) {
      console.error('Error creating records:', error);
    }
}
async function cleanUpStudentTable(phoneNumber, status = "Approved") {
    try {
        const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
        
        // Step 1: Find the record by phone number
        const records = await base('Student').select({
            filterByFormula: `{Phone} = "${phoneNumber}"`
        }).firstPage();

        if (records.length === 0) {
            console.log("No record found with the specified phone number.");
            return;
        }

        // Step 2: Update the record
        const recordId = records[0].id;
        await base('Student').update([
            {
                id: recordId,
                fields: {
                    "Course Status": status
                }
            }
        ]);

        console.log("Record updated successfully");
    } catch (error) {
        console.error("Failed to update record", error);
    }
}


const generateCourse = async()=>{
    const approvedRecords = await getApprovedRecords();
    console.log("Running AI Engine.....");
    if(approvedRecords.length>0){
       for(let i=0;i<approvedRecords.length;i++){
              const record =approvedRecords[i];
            //   const id = approvedRecords[i][0];
              const {Phone,Topic,Name,Goal,Style,Language} = record;
            //   console.log("Generating course for ",id);
              try {
                const prompt=`I want to teach on the topic of ${Topic} for a 3-day program in ${Language} in teaching style of ${Style} my students goal is to ${Goal}. Each day should have three modules, with each module including comprehensive and complete content suitable for teaching. I dont know anyhting about topic give me a word to word script that i will read there .Provide the content in JSON format for easy integration into Airtable.



**Format Template:**


{
  "day1": {
    "module1": {
      "content": "Detailed lecture content for Module 1..."
    },
    "module2": {
      "content": "Detailed lecture content for Module 2..."
    },
    "module3": {
      "content": "Detailed lecture content for Module 3..."
    }
  },
  "day2": {
    "module1": {
      "content": "Detailed lecture content for Module 1..."
    },
    "module2": {
      "content": "Detailed lecture content for Module 2..."
    },
    "module3": {
      "content": "Detailed lecture content for Module 3..."
    }
  },
  "day3": {
    "module1": {
      "content": "Detailed lecture content for Module 1..."
    },
    "module2": {
      "content": "Detailed lecture content for Module 2..."
    },
    "module3": {
      "content": "Detailed lecture content for Module 3..."
    }
  }
}
Instructions:

Please ensure that each modules content dont talk about what we are going to learn in this module or day just start teaching .In one lne you can tell what we are going to learn then quickly start teaching in detail  Replace the placeholder text in "content" with the complete and detailed lecture material for each module.
`
                messages=[{ "role": "system", "content": "You are a subject matter expert. Provide only the JSON structure without any additional text." },
                    { "role": "user", "content": prompt }]

                const response = await openai.createChatCompletion({
                    model: "gpt-4o-mini-2024-07-18",
                    messages: messages,
                    temperature: 0
                   
                })
                if(response.data.choices[0].message.content){
                    console.log("Course generated successfully");
                    // console.log(response.data.choices[0].message.content);
                    const courseData = JSON.parse(response.data.choices[0].message.content);
                    // console.log(courseData);
                    const Tableid = await createTable(Topic+"_"+Phone);
                    updateCourseRecords(Tableid, courseData);
                    cleanUpStudentTable(Phone,"Content Created");
                    

                }else{
                    console.log("Failed to generate course");
                    cleanUpStudentTable(Phone,"Failed");
                }
            }catch (error) {
                console.error("Failed to create course");
                cleanUpStudentTable(Phone,"Failed");
            }
       }
    }else{
        console.log("No approved records found");
    }
}

module.exports = {generateCourse};
