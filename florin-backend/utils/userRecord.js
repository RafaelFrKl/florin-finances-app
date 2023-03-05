//Plaid Declarations
const fs = require('fs/promises')

const CURR_USER_ID = process.env.USER_ID || 1
const USER_FILES_FOLDER = '.data'
const FIELD_ACCESS_TOKEN = 'accessToken'

//Try to retrieve the user record from our local filesystem and return it as a JSON object
const getUserRecord = async function () {
    const userDataFile = `${USER_FILES_FOLDER}/user_data_${CURR_USER_ID}.json`
    try {
        const userData = await fs.readFile(userDataFile, {
            encoding: 'utf8',
        })
        const userDataObj = await JSON.parse(userData)
        console.log(`Retrieved userData ${userData}`)

        return userDataObj
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No user object found. We\'ll make one from scratch.')
            return null
        }
        // Might happen first time, if file doesn't exist
        console.log('Got an error', error)
        return null
    }
}

// When we start up our server, we attempt to read in our "logged-in user"
// by looking for a file in the "user_files" folder
let userRecord;
(async () => {
    userRecord = await getUserRecord()
    if (userRecord === null) {
        userRecord = {}
        userRecord[FIELD_ACCESS_TOKEN] = null
        // Force a file save
        await updateUserRecord(FIELD_ACCESS_TOKEN, null)
    }
})()

// Updates the user record in memory and writes it to a file. In a real
// application, you'd be writing to a database.
const updateUserRecord = async function (key, val) {
    const userDataFile = `${USER_FILES_FOLDER}/user_data_${CURR_USER_ID}.json`
    userRecord[key] = val
    try {
        const dataToWrite = JSON.stringify(userRecord)
        await fs.writeFile(userDataFile, dataToWrite, {
            encoding: 'utf8',
            mode: 0o600,
        })
        console.log(`User record ${dataToWrite} written to file.`)
    } catch (error) {
        console.log('Got an error: ', error)
    }
}

module.exports = {
    getUserRecord,
    updateUserRecord
}
