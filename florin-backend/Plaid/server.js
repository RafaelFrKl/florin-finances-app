console.log(`Your node version is ${process.version}`);

("use strict");
require("dotenv").config();
const fs = require("fs/promises");
const express = require("express");
const bodyParser = require("body-parser");
const moment = require("moment");
const {
    Configuration,
    PlaidEnvironments,
    PlaidApi,
} = require("plaid");

const APP_PORT = process.env.APP_PORT || 8000;
const CURR_USER_ID = process.env.USER_ID || 1;
const USER_FILES_FOLDER = ".data";
const FIELD_ACCESS_TOKEN = "accessToken";
const FIELD_USER_STATUS = "userStatus";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

const server = app.listen(APP_PORT, function () {
    console.log(`Server is up and running at http://localhost:${APP_PORT}/`);
});

// Set up the Plaid client - Initialize the Plaid client library for NodeJS
const plaidConfig = new Configuration({
    basePath: PlaidEnvironments['sandbox'],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": process.env.PLAID_SECRET,
            "Plaid-Version": "2020-09-14",
        },
    },
});
const plaidClient = new PlaidApi(plaidConfig);

app.get("/server/run_tutorial_precheck", async (req, res, next) => {
    // Let's double-check a few things to make sure our tutorial is 
    // running smoothly
    try {
        if (process.env.PLAID_CLIENT_ID == null || process.env.PLAID_CLIENT_ID === "") {
            res.json({
                status: "error", errorMessage: `We didn't find a client ID in the .env file. Please make sure to copy 
      the appropriate variable from the Plaid dashboard`});
            return;
        } else if (process.env.PLAID_SECRET == null || process.env.PLAID_SECRET === "") {
            res.json({
                status: "error",
                errorMessage: `We didn't find a secret in the .env file. Please make sure to copy 
      the appropriate variable from the Plaid dashboard`,
            });
            return;
        } else if (typeof plaidConfig !== 'undefined' && plaidConfig.basePath.indexOf("sandbox") < 0) {
            res.json({ status: "error", errorMessage: `You're using a non-sandbox environment in a publicly-accessible URL that has no real sign-in system and anybody can access your user's info. This is probably a terrible idea.` });
            return
        } else {
            res.json({ status: "ready" });
        }
    } catch (error) {
        console.log("Got an error: ", error);
    }

})

/**
 * Try to retrieve the user record from our local filesystem and return it
 * as a JSON object
 */
const getUserRecord = async function () {
    const userDataFile = `${USER_FILES_FOLDER}/user_data_${CURR_USER_ID}.json`;
    try {
        const userData = await fs.readFile(userDataFile, {
            encoding: "utf8",
        });
        const userDataObj = await JSON.parse(userData);
        console.log(`Retrieved userData ${userData}`);

        return userDataObj;
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log("No user object found. We'll make one from scratch.");
            return null;
        }
        // Might happen first time, if file doesn't exist
        console.log("Got an error", error);
        return null;
    }
};

// When we start up our server, we attempt to read in our "logged-in user"
// by looking for a file in the "user_files" folder
let userRecord;
(async () => {
    userRecord = await getUserRecord();
    if (userRecord == null) {
        userRecord = {};
        userRecord[FIELD_ACCESS_TOKEN] = null;
        // Force a file save
        await updateUserRecord(FIELD_ACCESS_TOKEN, null);
    }
})();

/**
 * Updates the user record in memory and writes it to a file. In a real
 * application, you'd be writing to a database.
 */
const updateUserRecord = async function (key, val) {
    const userDataFile = `${USER_FILES_FOLDER}/user_data_${CURR_USER_ID}.json`;
    userRecord[key] = val;
    try {
        const dataToWrite = JSON.stringify(userRecord);
        await fs.writeFile(userDataFile, dataToWrite, {
            encoding: "utf8",
            mode: 0o600,
        });
        console.log(`User record ${dataToWrite} written to file.`);
    } catch (error) {
        console.log("Got an error: ", error);
    }
};

/**
 * Fetches some info about our user from our "database" and returns it to
 * the client
 */
app.get("/server/get_user_info", async (req, res, next) => {
    try {
        res.json({
            user_status: userRecord[FIELD_USER_STATUS],
            user_id: CURR_USER_ID,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Generates a Link token to be used by the client.
 */
app.post("/server/generate_link_token", async (req, res, next) => {
    try {
        const linkTokenConfig = {
            user: { client_user_id: CURR_USER_ID },
            client_name: "Plaid Tutorial",
            language: "en",
            products: ["auth"],
            country_codes: ["CA"],
            webhook: "https://www.example.com/webhook",
        };
        const tokenResponse = await plaidClient.linkTokenCreate(linkTokenConfig);
        const tokenData = tokenResponse.data;
        res.json(tokenData);
    } catch (error) {
        console.log(
            "Running into an error! Note that if you have an error when creating a " +
            "link token, it's frequently because you have the wrong client_id " +
            "or secret for the environment, or you forgot to copy over your " +
            ".env.template file to.env."
        );
        next(error);
    }
});

/**
 * Swap the public token for an access token, so we can access account info
 * in the future
 */
app.post("/server/swap_public_token", async (req, res, next) => {
    try {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: req.body.public_token,
        });
        if (response.data != null && response.data.access_token != null) {
            await updateUserRecord(FIELD_ACCESS_TOKEN, response.data.access_token);
            await updateUserRecord(FIELD_USER_STATUS, "connected");
        }
        res.json({ status: "success" })
    } catch (error) {
        next(error);
    }
});


/**
 * Just grabs the results for calling item/get. Useful for debugging
 * purposes.
 */
app.get("/server/get_item_info", async (req, res, next) => {
    try {
        const itemResponse = await plaidClient.itemGet({
            access_token: userRecord[FIELD_ACCESS_TOKEN]
        });
        res.json(itemResponse.data);
    } catch (error) {
        next(error);
    }
});

/**
 * Just grabs the results for calling accounts/get. Useful for debugging
 * purposes.
 */
app.get("/server/get_accounts_info", async (req, res, next) => {
    try {
        const accountResult = await plaidClient.accountsGet({
            access_token: userRecord[FIELD_ACCESS_TOKEN],
        });
        res.json(accountResult.data);
    } catch (error) {
        next(error);
    }
});


const errorHandler = function (err, req, res, next) {
    console.error(`Your error:`);
    console.error(err);
    if (err.response?.data != null) {
        res.status(500).send(err.response.data);
    } else {
        res.status(500).send({
            error_code: "OTHER_ERROR",
            error_message: "I got some other message on the server.",
        });
    }
};

app.use(errorHandler);