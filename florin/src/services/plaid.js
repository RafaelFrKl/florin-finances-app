import axios from 'axios'
import { callMyServer, showOutput } from "./plaidUtils.js";

const checkConnectedStatus = async function () {
    const connectedData = await callMyServer("/api/plaid/get_user_info");
    if (connectedData.user_status === "connected") {
        showOutput(`Plaid is connected to your financial institution`);
    }   
};

const exchangeToken = async (publicTokenToExchange, id) => {
    const result = await callMyServer("/api/plaid/swap_public_token", true, {
        public_token: publicTokenToExchange,
    })
    console.log("Done exchanging our token. I'll re-fetch our status");
    await checkConnectedStatus()
    console.log(result) 
    
    // Save hashed accessToken to User in DB
    console.log(result.accessToken) 
    const body = {
        accessToken: result.accessToken
    }
    const request = await axios.patch(`api/users/${id}`, body)
    console.log(request) 
    return request
}

// Get information about the account(s) we're connected to
const getAccountsInfo = async () => {
    const accountsData = await callMyServer('/api/plaid/get_accounts_info');
    showOutput(JSON.stringify(accountsData));
};

// Get information about the Item we're connected to
const getItemInfo = async () => {
    const itemData = await callMyServer("/api/plaid/get_item_info");
    showOutput(JSON.stringify(itemData));
};

const runTutorialPrecheck = async function () {
    const tutorialStatus = await callMyServer("/api/plaid/run_precheck");
    if (tutorialStatus.status === "error") {
        showOutput(tutorialStatus.errorMessage);
    } else {
        showOutput("Plaid is Connected");
        checkConnectedStatus();
    }
};

runTutorialPrecheck();

export default {
    exchangeToken,
    getAccountsInfo,
    getItemInfo,
    checkConnectedStatus
}