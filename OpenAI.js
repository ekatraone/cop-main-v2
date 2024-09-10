var Airtable = require('airtable');
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const {sendTemplateMessage} = require('./wati');

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
        let dayno =1;
      for (const [day, modules] of Object.entries(courseData)) {
        console.log(`Creating record for ${day}...`);
        // Extract module content as strings
      const module1Content = modules.module1.content || "";
      const module2Content = modules.module2.content || "";
      const module3Content = modules.module3.content || "";
        await base(tableId).create([
          {
            fields: {
              "Day": Number(dayno++),
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
async function cleanUpStudentTable(phoneNumber, status = "Content Created") {
    try {
      console.log("Updating record for phone number:", phoneNumber);
        const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
        
        // Step 1: Find the record by phone number
        const records = await base('Student').select({
            filterByFormula: `AND({Phone} = ${phoneNumber},{Course Status}= "Approved")`
        }).all();
        console.log("Records",records);
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
              const {Phone,Topic,Name,Goal,Style,Language,"Next Day":NextDay} = record;
            //   console.log("Generating course for ",id);
              try {
                const prompt=`Create a 3-day micro-course on ${Topic} in ${Language}, using the teaching style of ${Style}. The course will be delivered via WhatsApp, and the students' goal is to ${Goal}.

Highly Strict Guidelines:
1. Structure: 3 days, 3 short modules per day (9 modules total)
2. Content: Provide brief, engaging content for each module
3. Module length: Maximum 4-5 short sentences
4. Style: Incorporate the specified teaching style
5. Language: All content in the specified language
6. Engagement: Include 1-2 relevant emojis per module to enhance engagement
7. Formatting: Use '\n' for new lines

Content Approach:
- Start each module with a hook or key point
- Focus on one core concept or skill per module
- Use clear, simple language suitable for mobile reading
- Include a brief actionable task or reflection question at the end of each module

Output Format:
Provide the micro-course in JSON format:

{
  "day1": {
    "module1": {
      "content": "Concise content for Day 1, Module 1..."
    },
    "module2": {
      "content": "Concise content for Day 1, Module 2..."
    },
    "module3": {
      "content": "Concise content for Day 1, Module 3..."
    }
  },
  "day2": {
    "module1": {
      "content": "Concise content for Day 2, Module 1..."
    },
    "module2": {
      "content": "Concise content for Day 2, Module 2..."
    },
    "module3": {
      "content": "Concise content for Day 2, Module 3..."
    }
  },
  "day3": {
    "module1": {
      "content": "Concise content for Day 3, Module 1..."
    },
    "module2": {
      "content": "Concise content for Day 3, Module 2..."
    },
    "module3": {
      "content": "Concise content for Day 3, Module 3..."
    }
  }
}

Ensure each module is brief yet informative, engaging, and contributes directly to the students' goal. The content should be optimized for quick reading and easy understanding on a mobile device.
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
                    await updateCourseRecords(Tableid, courseData);
                    await cleanUpStudentTable(Phone);
                    console.log("-->",NextDay, Topic, "generic_course_template", Phone);
                    await sendTemplateMessage(NextDay, Topic, "generic_course_template", Phone);
                    

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
