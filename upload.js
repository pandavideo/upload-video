const axios = require('axios')
const {v4: uuidv4} = require('uuid')
const fs = require('fs')

const API_KEY = 'API_KEY'
const FOLDER_ID = null
const FILENAME = 'VIDEO NAME'
const VIDEO_ID = uuidv4()


const parseToBase64 = string=>Buffer.from(string).toString('base64')

const uploadVideo = async (filename) => {
  
  const binaryFile = fs.readFileSync(filename)

  // You must set each part of the metadata converted to base64 individually
  // Make sure you follow this step correctly
  let metadata = `authorization ${parseToBase64(API_KEY)}`
  if(FOLDER_ID){
    metadata += `, folder_id ${parseToBase64(FOLDER_ID)}`
  }
  metadata += `, filename ${parseToBase64(FILENAME)}`
  metadata += `, video_id ${parseToBase64(VIDEO_ID)}`

  try {
    const {data: uploadServers} = await axios.get('https://api-v2.pandavideo.com.br/hosts/uploader',{
      headers:{
        'Authorization': API_KEY,
      }
    });
    const allHosts = Object.values(uploadServers.hosts).reduce((acc,curr)=>([...acc,...curr]),[]);
    const host = allHosts[Math.floor(Math.random() * allHosts.length)];
    console.log(`Starting upload to ${host}`);

    // The binary file must be in the body of the POST request
    await axios.post(`https://${host}.pandavideo.com.br/files`,Buffer.from(binaryFile, 'binary'),{
      headers:{
        'Tus-Resumable': '1.0.0', 
        'Upload-Length': binaryFile.byteLength, 
        'Content-Type': 'application/offset+octet-stream', 
        'Upload-Metadata': metadata
      }
    });
    console.log('Upload concluido com sucesso');
  } catch (error) {
    console.log('UPLOAD ERROR');
    console.log(error);
  }

}

uploadVideo('video.mp4')
