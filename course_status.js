
import dotenv from 'dotenv';
import axios from 'axios';

import {generateCourse} from './OpenAI.js';

// Load environment variables
dotenv.config();


let course_base = process.env.course_base;
let base_student = process.env.studentBase;
let student_table = process.env.studentTable;
let apiKey = process.env.personal_access_token;

async function find_course_to_create() {
    let config = {
        method: 'GET',
        url: `https://api.airtable.com/v0/${base_student}/${student_table}?fields%5B%5D=Phone&fields%5B%5D=Topic&fields%5B%5D=Course+Status&fields%5B%5D=Name&fields%5B%5D=Language&fields%5B%5D=Goal&fields%5B%5D=Style&filterByFormula=OR(%7BCourse+Status%7D+%3D+%22Approved%22%2C%7BCourse+Status%7D+%3D+%22Failed%22+)&maxRecords=1&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=asc`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        }
    };

    try {
        const response = await axios.request(config);
        if (response.data && response.data.records) {
            return response.data.records; // Return records if they exist
        }
        return []; // Return empty array if no records found
    } catch (error) {
        if (error.response) {
            console.log("Alfred Record Error", error.response.data);
            return null; // Return null if an error occurred
        } else {
            console.log("Error occurred but no response received from the server:", error);
            return null; // or any default value you want to return
        }
    }
}

export async function course_approval() {
    try {
        await generateCourse(); // Ensure this function is awaited
    } catch (error) {
        console.log("Error generating course", error);
    }
}


