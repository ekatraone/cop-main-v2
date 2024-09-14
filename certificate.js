require('dotenv').config("./env");
const getStream = require('get-stream');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

async function createCertificate(name, course_name) {
    try {
        console.log("Creating certificate for ", name, course_name);

        // Create a new PDF document
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
        });

        // Create a PassThrough stream to capture the PDF output
        const stream = new PassThrough();
        doc.pipe(stream);

        // Add content to the PDF
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fff');
        doc.image('./assets/corners.png', -1, 0, { scale: 0.585, fit: [doc.page.width, doc.page.height], align: 'center' });
        doc.font('fonts/RozhaOne-Regular.ttf').fontSize(60).fill('#292929').text('CERTIFICATE', 80, 30, { align: 'center' });
        doc.font('fonts/RozhaOne-Regular.ttf').fontSize(35).fill('#292929').text('OF COMPLETION', 100, 105, { align: 'center' });
        doc.font('fonts/Rufina-Regular.ttf').fontSize(23).fill('#125951').text('This certificate is awarded to', 100, 185, { align: 'center' });
        doc.font('fonts/Pinyon Script 400.ttf').fontSize(65).fill('#125951').text(`${name}`, 0, 250, { align: 'center' });
        doc.image('assets/ekatra logo.png', 725, 490, { fit: [75, 75] });

        // Add more content to the PDF
        doc.lineWidth(2).moveTo(200, 320).lineTo(700, 320).fillAndStroke('#125951');
        doc.font('fonts/Rufina-Regular.ttf').fontSize(25).fill('#292929').text('For Completing The Topic on ' + course_name, 140, 343, { align: 'center' });
        doc.image('assets/Sign.png', 560, 405, { fit: [120, 120] });
        doc.font('fonts/Rufina-Regular.ttf').fontSize(20).fill('#292929').text('Abhijeet K.', 490, 460, { align: 'center' });
        doc.lineWidth(2).moveTo(560, 490).lineTo(690, 490).fillAndStroke('#125951');
        doc.font('fonts/Rufina-Regular.ttf').fontSize(20).fill('#292929').text('Founder, Ekatra', 490, 497, { align: 'center' });

        doc.end(); // Finalize the PDF document

        // Convert the PassThrough stream into a buffer
        const pdfBuffer = await getStream.buffer(stream);

        console.log("Certificate created! Returning the buffer.");
        return pdfBuffer;
    } catch (error) {
        console.log("Error in creating certificate", error);
    }
}

module.exports = { createCertificate };
