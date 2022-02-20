import fs from 'fs'
import readline from 'readline'
import path from 'path'
import open from 'open'
import { google } from 'googleapis'
import dotenv from 'dotenv'
import parseLines from './parseLines.js'

dotenv.config()

// Adapted from https://github.com/googleworkspace/node-samples/blob/master/drive/quickstart/index.js

// This allows downloading files
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
const TOKEN_PATH = 'token.json'

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err)
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), getFiles)
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback)
    oAuth2Client.setCredentials(JSON.parse(token))
    callback(oAuth2Client)
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  console.log('Authorize your app here:', authUrl)
  open(authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close()
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err)
      oAuth2Client.setCredentials(token)
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err)
        console.log('Token stored to', TOKEN_PATH)
      })
      callback(oAuth2Client)
    })
  })
}

function getFiles(auth) {
  const drive = google.drive({ version: 'v3', auth })
  drive.files.list(
    {
      fields: 'nextPageToken, files(*)',
      spaces: 'drive',
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
    },

    (err, res) => {
      if (err) return console.log('API error: ' + err)
      const files = res.data.files
      if (files.length) {
        const dir = ensureDir(process.env.DEST_DIR)
        console.log('Downloading and parsing files:')
        files.map((file) => downloadFile(drive, file, dir))
      } else {
        console.log('No files found.')
      }
    }
  )
}

async function downloadFile(drive, file, destdir) {
  const destPath = path.join(destdir, `${file.name}.md`)
  const writer = fs.createWriteStream(destPath)
  const res = await drive.files.export(
    { fileId: file.id, mimeType: 'text/plain' },
    { responseType: 'stream' }
  )

  const reader = readline.createInterface({
    input: res.data,
  })

  let i = 0
  return reader
    .on('line', (line) => {
      if (i === 0) console.log(`  ${file.name}`)
      parseLines(writer, line, i++)
    })
    .on('error', (err) => console.log('Error downloading file: ', err))
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir
}
