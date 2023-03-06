import { callMyServer, showOutput } from "./plaidUtils.js";

const checkConnectedStatus = async function () {
    const connectedData = await callMyServer("/api/plaid/get_user_info");
    if (connectedData.user_status === "connected") {
        showOutput(`Plaid is connected to your financial institution`);
    }   
};

// TODO: Get information about the account(s) we're connected to
const getAccountsInfo = async function () {
    const accountsData = await callMyServer('/api/plaid/get_accounts_info');
    showOutput(JSON.stringify(accountsData));
};

// Get information about the Item we're connected to
const getItemInfo = async function () {
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
// eslint-disable-next-line import/no-anonymous-default-export
export default { 
    getAccountsInfo,
    getItemInfo,
    checkConnectedStatus
}