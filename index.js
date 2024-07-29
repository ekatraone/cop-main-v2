require('dotenv').config("./env");
const airtable = require('./airtable_methods')
const WA = require('./wati')
// https://openai-wa.onrender.com/qna
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.apiKey,
    organization: process.env.orgKey
});
const openai = new OpenAIApi(configuration);


async function ask(course_name, language) {
    console.log("1. Asking question ", course_name, language)

    let question = `Write a 3-day lesson plan on the topic "${course_name}". Each day should be divided into 3 modules, each module should only have the content. 

Strictly follow and create a valid JSON structure as given below:

{
  "Day 1": {
    "Day 1 - Module 1": {
      "[module-content]"
    },
    "Day 1 - Module 2": {
      "[module-content]"
    },
    "Day 1 - Module 3": {
      "[module-content]"
    }
  },
  "Day 2": {
    "Day 2 - Module 1": {
      "[module-content]"
    },
    "Day 2 - Module 2": {
      "[module-content]"
    },
    "Day 2 - Module 3": {
      "[module-content]"
    }
  },
  "Day 3": {
    "Day 3 - Module 1": {
      "[module-content]"
    },
    "Day 3 - Module 2": {
      "[module-content]"
    },
    "Day 3 - Module 3": {
      "[module-content]"
    }
  }
}`;
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages:
                [{ "role": "system", "content": "You are a subject matter expert. Provide only the JSON structure without any additional text." },
                { "role": "user", "content": question }

                ],
            temperature: 0
        });
        return completion.data.choices[0].message.content


    } catch (error) {
        console.log("Error in asking question ", error)
        return "Error in asking question"
    }




}




async function create_table_fields(course_name, module_number) {
    console.log("1. Creating table ", course_name)
    airtable_fields = []

    day_field = {
        "name": "Day",
        "type": 'number',
        "options": {
            'precision': 0,
        }
    }
    airtable_fields.push(day_field)

    for (i = 1; i <= module_number; i++) {
        // console.log(i)
        field_module_topic = {

            "name": "Module " + i + " Text",
            "type": 'multilineText'

        }
        airtable_fields.push(field_module_topic)
    }
    // airtable_fields.push(field_module_topic)
    console.log("airtable_fields ", airtable_fields)
    try {
        let table_id = await airtable.createTable(course_name, airtable_fields);
        // console.log("Table id ", table_id)
        return table_id;
    }
    // if (table_id['error']?.['type'] === 'DUPLICATE_TABLE_NAME' || table_id['error']) { 
    //     table_id = airtable.createTable(course_name, airtable_fields)
    // }
    catch (error) {
        console.error("Error creating table: ", error);
    }
}



// async function iterate_through_module(course_outline, goal, style, language) {
//     console.log("0. Iterating through module ", course_outline)
//     course_outline = JSON.parse(course_outline)
//     console.log("1. Iterating through module ", course_outline)

//     module_details_dict = {}
//     day_count = 1
//     try {
//         for (const key in course_outline) {
//             // console.log("Key ", key)

//             const value = course_outline[key];
//             let value_length = Object.keys(value).length
//             console.log('Value ', course_outline[key])
//             module_details_day_count = []

//             console.log(key == "Day " + day_count, key, "Day " + day_count )

//             if (key == "Day " + day_count) {
//                 // console.log("2. Value Length ", Object.keys(value).length, value)
//                 for (i = 0; i < value_length; i++) {
//                     // console.log("Inside loop 1 ", value_length)

//                     for (i = 0; i < value_length; i++) {
//                         console.log("Inside loop 2 ", value)
//                         console.log("3. Key", course_outline[key][i])
//                         let module = course_outline[key][i];
//                         // if(module.inclded)
//                         // console.log(`module ${module}`);
//                         // let moduleArray = Object.entries(module).map(([key, value]) => value);
//                         // console.log("Module Array ", moduleArray)
//                         // let module_topic = moduleArray.map(topic => topic.split(':')[1].trim());
//                         // console.log("module_topic", module_topic)

//                         let moduleArray = Object.entries(module).map(([key, value]) => value);
//                         console.log("Module Array ", moduleArray);

//                         let module_topic = moduleArray.map(topic => {
//                             let parts = topic.split(':');
//                             parts.length > 1 ? parts[1].trim() : topic;
//                         });
//                         console.log("module_topic", module_topic);

//                         // let module_topic = module.split(":")[1]
//                         //
//                         module_content = await module_gen(module_topic, goal, style, language).then().catch(e => console.error("iterate_through_module Error " + e));

//                         console.log(`${module_topic}\n\n ${module_content}`);

//                         module_details_day_count.push(module_content)

//                         module_details_dict[key] = module_details_day_count

//                     }
//                 }
//                 day_count++

//             }
//             console.log("2", module_details_dict)

//         }
//         return module_details_dict

//     }
//     catch (e) {
//         console.log("iterate_through_module error", e)
//         return "iterate_through_module error"
//     }

// }

async function iterate_through_module(course_outline, goal, style, language) {
    console.log("0. Iterating through module ", course_outline)
    course_outline = JSON.parse(course_outline)
    console.log("1. Iterating through module ", course_outline)

    let module_details_dict = {}
    let day_count = 1

    try {
        for (const key in course_outline) {
            console.log('Value ', course_outline[key])
            let value = course_outline[key]
            let value_length = Object.keys(value).length
            let module_details_day_count = []

            console.log(key === "Day " + day_count, key, "Day " + day_count)

            if (key === "Day " + day_count) {
                for (const module_key in value) {
                    let module_content = value[module_key].content

                    console.log("Processing module ", module_content)

                    let module_topic = module_content.split(":").length > 1 ? module_content.split(":")[1].trim() : module_content
                    console.log("module_topic", module_topic)

                    module_content = await module_gen(module_topic, goal, style, language).then().catch(e => console.error("iterate_through_module Error " + e))

                    console.log(`${module_topic}\n\n ${module_content}`)

                    module_details_day_count.push(module_content)

                    module_details_dict[key] = module_details_day_count
                }
                day_count++
            }
            console.log("2", module_details_dict)
        }
        return module_details_dict
    } catch (e) {
        console.log("iterate_through_module error", e)
        return "iterate_through_module error"
    }
}

async function generate_course(senderID, course_name, goal, style, language) {
    let table_id;

    try {
        table_id = await create_table_fields(course_name, 3);
        console.log("Table ID", table_id, table_id['error']?.['type'] === 'DUPLICATE_TABLE_NAME');
    } catch (e) {
        console.error("generate course error 1" + e);
    }


    if (table_id['error']?.['type'] === 'DUPLICATE_TABLE_NAME') {
        console.log(course_name, "Table already exists")
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        // table_id = course_name
        let getRecords = await airtable.ListCourseFields(course_name)
        if (getRecords.records?.length == 0) {
            console.log("table exists - No records found")
            table_update = await airtable.updateCourseTable(course_name, course_name + randomNumber).then().catch(e => console.error("generate course error " + e));

            if (table_update == 200) {

                console.log("table updated")
                table_id = await create_table_fields(course_name, 3).then().catch(e => console.error("generate course error " + e));

                if (typeof (table_id) === "string") {
                    let course_outline = await ask(course_name, language).then().catch(e => console.error("Course outline error " + e));
                    console.log("Course OUTLINE generated ", course_outline)

                    if (course_outline != "Error in asking question") {
                        let course_details = await iterate_through_module(course_outline, goal, style, language).then().catch(e => console.error("course_details error " + e));


                        if (course_details != "iterate_through_module error") {
                            let populate_field_status = await populate_fields(3, course_details, course_name, senderID).then().catch(e => console.error("populate_field_status error " + e));

                            if (populate_field_status == 200) {
                                console.log("Populate Field Status", populate_field_status)

                                return populate_field_status
                            }

                            else {
                                console.log("Error in Populating Fields", populate_field_status)
                                return populate_field_status
                            }
                        }
                    }



                }
            }


        }
        else {
            console.log("table exists - Records found")
            return 200
        }

        // airtable.updateCourseTable(course_name, 3)

    }
    else if (table_id['error']) {
        console.log("Error in creating table", table_id['error'])
        return 404
    }

    else if (typeof (table_id) === "string") {
        console.log(typeof (table_id) === "string")
        let course_outline = await ask(course_name, language).then().catch(e => console.error("Course outline error " + e));

        if (course_outline != "Error in asking question") {
            let course_details = await iterate_through_module(course_outline, goal, style, language).then().catch(e => console.error("course_details error " + e));


            if (course_details != "iterate_through_module error") {
                let populate_field_status = await populate_fields(3, course_details, course_name, senderID).then().catch(e => console.error("populate_field_status error " + e));

                if (populate_field_status == 200) {
                    console.log("Populate Field Status", populate_field_status)

                    return populate_field_status
                }

                else {
                    console.log("Error in Populating Fields", populate_field_status)
                    return populate_field_status
                }
            }
        }



    }

    else {
        console.log("In Else")
    }

}

async function populate_fields(module_number, module_details, course_name, senderID) {
    console.log("3.1 Module Details", typeof (module_details))

    // module_details = module_details.rep("'", '"')
    if (module_details != undefined) {


        console.log("3.2 Module Details", module_details)
        day_count = 1
        module_dict = []
        module_fields_arr = []

        for (const key in module_details) {


            const value = module_details[key];
            let value_length = Object.keys(value).length

            for (i = 0; i < value_length; i++) {
                if (key == "Day " + day_count) {
                    console.log("Day " + day_count)
                    record_array =
                    {
                        "fields": {
                            "Day": day_count,
                            "Module 1 Text": module_details['Day ' + day_count][0],
                            "Module 2 Text": module_details['Day ' + day_count][1],
                            "Module 3 Text": module_details['Day ' + day_count][2]
                        },
                    }


                    module_dict.push(record_array)



                    day_count++
                }



            }

        }



        let create_status = await airtable.create_record(module_dict, course_name).then().catch(e => console.error("Error creating Day field " + e));

        return create_status
    }
    else {
        console.log("Module Details not found")
    }





}

async function module_gen(module_topic, goal, style, language) {
    console.log("Module Topic - ", module_topic, language)
    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages:
            [{ "role": "system", "content": "You are a multilingual subject matter expert." },
            {
                "role": "user", "content": `Please generate engaging and concise content for the following module ${module_topic} in the language ${language}:
                
As an AI language model, you are here to assist the student in creating a microlearning module for ${module_topic} in language ${language}. The ${module_topic} will be tailored to meet the needs and preferences of a learner with the following profile:

Current Knowledge Level: ${style}
Learning Goals: ${goal}
Preferred Learning Style: ${style}
Language: ${language}

please incorporate appropriate emojis within the text, ensuring they are used sparingly and do not occur in every sentence.
`
            }


            ],
        temperature: 0.2
    });

    return completion.data.choices[0].message.content


}

// Please generate engaging and concise content for the following module ${module_topic}:

// The content should be designed to meet the learner’s learning goals and align with their preferred learning style. To ensure the content remains light and engaging, please incorporate appropriate emojis within the text, ensuring they are used sparingly and do not occur in every sentence.`
module.exports = { generate_course }