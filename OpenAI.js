
const Airtable = require('airtable');
require('dotenv').config();
const express = require('express');
const { sendTemplateMessage } = require('./wati');
const axios = require('axios');




const getApprovedRecords = async () => {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    try {
        const records = await base('Student').select({
            filterByFormula: `{Course Status} = 'Approved'`,
        }).all();
        return records.map(record => record.fields);
    } catch (error) {
        console.error("Failed getting approved data", error);
    }
};

async function createTable(courseName, moduleNumber = 3) {
    const airtableFields = [
        { name: "Day", type: "number", options: { precision: 0 } },
        ...Array.from({ length: moduleNumber }, (_, i) => ({
            name: `Module ${i + 1} Text`,
            type: "multilineText"
        }))
    ];

    const requestBody = {
        name: courseName,
        description: "A description of the course topics",
        fields: airtableFields
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

        if (response.ok) {
            const responseData = await response.json();
            return responseData.id;
        } else {
            const responseData = await response.json();
            console.error("Error creating table:", responseData);
        }
    } catch (error) {
        console.error("Error creating table:", error);
    }
}

async function updateCourseRecords(tableId, courseData) {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_COURSE_BASE_ID);
    let dayno = 1;
    for (const [day, modules] of Object.entries(courseData)) {
        const moduleContents = [
            modules.module1?.content || "",
            modules.module2?.content || "",
            modules.module3?.content || ""
        ];
        await base(tableId).create([{
            fields: {
                "Day": Number(dayno++),
                "Module 1 Text": moduleContents[0],
                "Module 2 Text": moduleContents[1],
                "Module 3 Text": moduleContents[2]
            }
        }]);
    }
}

async function cleanUpStudentTable(phoneNumber, status = "Content Created") {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(process.env.AIRTABLE_STUDENT_BASE_ID);
    const records = await base('Student').select({
        filterByFormula: `AND({Phone} = ${phoneNumber},{Course Status}= "Approved")`
    }).all();
    if (records.length > 0) {
        await base('Student').update([{ id: records[0].id, fields: { "Course Status": status } }]);
    }
}

const generateCourse = async () => {
    const approvedRecords = await getApprovedRecords();
    console.log("Running AI Engine.....");
    if (approvedRecords.length > 0) {
        for (let i = 0; i < approvedRecords.length; i++) {
            const record = approvedRecords[i];
            //   const id = approvedRecords[i][0];
            const { Phone, Topic, Name, Goal, Style, Language, "Next Day": NextDay } = record;
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
                
                Ensure each module is brief yet informative, engaging, and contributes directly to the students' goal. The content should be optimized for quick reading and easy understanding on a mobile device.
                `
                const headers = {
                    "Content-Type": "application/json",
                    "api-key": process.env.AZURE_OPENAI_API_KEY,
                };

                const payload = {
                    messages: [
                        {
                            role: "system",
                            content: prompt,
                        }
                    ],
                    temperature: 0
                };

                const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;

                // Send request to OpenAI API
                const response = await axios.post(ENDPOINT, payload, { headers: headers });
                if (response.data.choices[0].message.content) {
                    console.log("Course generated successfully");
                    console.log(response.data.choices[0].message.content);
                    const courseData = JSON.parse(response.data.choices[0].message.content);
                    // console.log(courseData);
                    const Tableid = await createTable(Topic + "_" + Phone);
                    await updateCourseRecords(Tableid, courseData);
                    await cleanUpStudentTable(Phone);
                    console.log("-->", NextDay, Topic, "generic_course_template", Phone);
                    await sendTemplateMessage(NextDay, Topic, "generic_course_template", Phone);


                } else {
                    console.log("Failed to generate course");
                    cleanUpStudentTable(Phone, "Failed");
                }
            } catch (error) {
                console.error("Failed to create course",error);
                cleanUpStudentTable(Phone, "Failed");
            }
        }
    } else {
        console.log("No approved records found");
    }
}


module.exports = { generateCourse };


