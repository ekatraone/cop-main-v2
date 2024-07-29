const WA = require('./wati');
const airtable = require("./airtable_methods");
require('dotenv').config();
let axios = require('axios');
let cop = require('./index');

// let Airtable = require('airtable');
let course_base = process.env.course_base

let base_student = process.env.studentBase
let student_table = process.env.studentTable

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
    result = axios.request(config)
        .then((response) => {

            res = response.data
            return response.data.records

        })
        .catch((error) => {
            if (error.response) {
                console.log("Alfred Record Error", error.response.data);
                return error.response.data;
            } else {
                console.log("Error occurred but no response received from the server:", error);
                // Handle the error further if necessary
                return null; // or any default value you want to return
            }
        });
    return result
}

async function course_approval() {
    let course_to_create = await find_course_to_create()
    console.log(course_to_create.length == 0, course_to_create)
    if (course_to_create.length != 0) {
        let id = course_to_create[0].id
        let phone = course_to_create[0].fields.Phone
        let topic = course_to_create[0].fields.Topic
        let name = course_to_create[0].fields.Name
        let goal = course_to_create[0].fields.Goal
        let style = course_to_create[0].fields.Style
        let language = course_to_create[0].fields.Language
        let course_status = course_to_create[0].fields["Course Status"]

        console.log(phone, topic, course_status, language, style, goal, name, id)

        let generate_course_status = await cop.generate_course(phone, topic, goal, style, language).then().catch(e => console.log("Generate course error 1" + e));
        if (generate_course_status == 200) {
            console.log("Course Generated", id);

            airtable.updateAlfredData(id, "Last_Msg", "course generated").then().catch(e => console.log("Update last msg error " + e));

            airtable.updateAlfredData(id, "Course Status", "Content Created").then().catch(e => console.log("Update last msg error " + e));


            let does_student_exist = await airtable.find_student_record(phone).then().catch(e => console.error("Error finding Student " + e));
            airtable.update_student_record(id)
            airtable.updateField(id, "Last_Msg", "Start Course").then().catch(e => console.log("Update student record error " + e))


        } else {
            console.log("Course Not Generated 1");
            airtable.updateAlfredData(id, "Course Status", "Failed").then().catch(e => console.log("Update last msg error " + e));
        }

    }
}



async function test() {
    // result = await find_course_to_create()
    // console.log(result)

    let phone = 918779171731
    let topic = "Farming"
    let goal = "To study"
    let style = "Beginner"
    let language = "English"
    let id = "recv4zQmrJ6EIgXYs"

    let generate_course_status = await cop.generate_course(phone, topic, goal, style, language).then().catch(e => console.log("Generate course error 2" + e));
    if (generate_course_status == 200) {
        // console.log("Course Generated 1 ", id);

        // let id = generate_course_status.data.id;

    } else {
        console.log("Course Not Generated 2");
        airtable.updateAlfredData(id, "Course Status", "Failed").then().catch(e => console.log("Update last msg error " + e));
    }
}

// test()

module.exports = {
    find_course_to_create,
    course_approval
}