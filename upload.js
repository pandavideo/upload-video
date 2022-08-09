const axios = require('axios')
const {v4: uuidv4} = require('uuid')
const fs = require('fs')

const API_KEY = 'panda-d97d5c544c45ab15e22889a742614cd958b32a9e6f9f6e2a39cddc0067b2da5f'
const FOLDER_ID = null
const FILENAME = 'NOME DO VIDEO 2'
const VIDEO_ID = uuidv4()


const parseToBase64 = string=>Buffer.from(string).toString('base64')

const uploadVideo = async (filename) => {
  
  const binaryFile = fs.readFileSync(filename)

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
    })
    const allHosts = Object.values(uploadServers.hosts).reduce((acc,curr)=>([...acc,...curr]),[])
    const host = allHosts[Math.floor(Math.random() * allHosts.length)]
    console.log(`Starting upload to ${host}`)
    await axios.post(`https://${host}.pandavideo.com.br/files`,Buffer.from(binaryFile, 'binary'),{
      headers:{
        'Tus-Resumable': '1.0.0', 
        'Upload-Length': binaryFile.byteLength, 
        'Content-Type': 'application/offset+octet-stream', 
        'Upload-Metadata': metadata
      }
    })
    console.log('Upload concluido com sucesso')
  } catch (error) {
    console.log('UPLOAD ERROR')
    console.log(error)
  }

}

uploadVideo('video.mp4')