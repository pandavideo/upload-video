const fs = require('fs')
const path = require('path')
const {randomUUID} = require('crypto')
const tus = require('tus-js-client')

const API_KEY = 'API_KEY'
const FOLDER_ID = null
const FILENAME = null // video title; defaults to the file name
const DESCRIPTION = null
const VIDEO_ID = randomUUID() // the video is created with this id

// Uploads go to the global TUS endpoint, not to api-v2.pandavideo.com.br
const UPLOADER_URL = 'https://uploader.pandavideo.com/files/'
const CHUNK_SIZE = 64 * 1024 * 1024 // 64 MiB per PATCH

// Keep the load balancer cookie so every PATCH of this upload hits the same server
const cookies = {}
const rememberCookies = (res) => {
  const setCookie = res.getHeader('set-cookie')
  if(!setCookie) return
  for(const cookie of [].concat(setCookie)){
    const [pair] = cookie.split(';')
    const [name, ...value] = pair.split('=')
    cookies[name.trim()] = value.join('=')
  }
}

const uploadVideo = (filename) => new Promise((resolve, reject) => {

  // Metadata values are base64-encoded by the TUS client
  const metadata = {
    authorization: API_KEY,
    filename: FILENAME || path.basename(filename),
    video_id: VIDEO_ID,
  }
  if(FOLDER_ID){
    metadata.folder_id = FOLDER_ID
  }
  if(DESCRIPTION){
    metadata.description = DESCRIPTION
  }

  const upload = new tus.Upload(fs.createReadStream(filename), {
    endpoint: UPLOADER_URL,
    uploadSize: fs.statSync(filename).size,
    chunkSize: CHUNK_SIZE,
    // On failure the client asks the server for the current offset and resumes from there
    retryDelays: [0, 3000, 10000, 30000, 60000],
    metadata,
    onBeforeRequest(req){
      const cookie = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ')
      if(cookie) req.setHeader('Cookie', cookie)
    },
    onAfterResponse(req, res){
      rememberCookies(res)
    },
    onProgress(sent, total){
      process.stdout.write(`\r${((sent / total) * 100).toFixed(1)}%`)
    },
    onError(error){
      // Rejections come back as HTTP 400 with {"errCode": ..., "errMsg": "..."}
      const body = error.originalResponse && error.originalResponse.getBody()
      reject(new Error(body || error.message))
    },
    onSuccess(){
      resolve(VIDEO_ID)
    },
  })

  console.log(`Starting upload of ${filename} (video_id ${VIDEO_ID})`)
  upload.start()
})

uploadVideo('video.mp4')
  .then((videoId) => {
    // Next: poll GET https://api-v2.pandavideo.com.br/videos/{videoId} until status is CONVERTED
    console.log(`\nUpload concluido com sucesso. video_id=${videoId}`)
  })
  .catch((error) => {
    console.log('\nUPLOAD ERROR')
    console.log(error.message)
    process.exitCode = 1
  })
