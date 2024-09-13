// const Dropbox = require('dropbox').Dropbox;
// const { Buffer } = require('buffer'); // Node.js Buffer module

// const dbx = new Dropbox({
//     accessToken: process.env.DROPBOX_ACCESS_TOKEN
// });

// async function uploadJson(data: any, fileName: string) {
//     try {
//         // Convert JSON data to a Buffer
//         const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));

//         // Upload the buffer to Dropbox
//         await dbx.filesUpload({
//             path: `/folder/${fileName}`,
//             contents: jsonBuffer,
//             mode: { '.tag': 'overwrite' }
//         });

//         console.log(`Successfully uploaded ${fileName}`);
//     } catch (error) {
//         console.error("Error uploading JSON to Dropbox:", error);
//         throw error;
//     }
// }

// export {uploadJson}
