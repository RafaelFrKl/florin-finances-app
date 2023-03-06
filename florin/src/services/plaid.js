let publicTokenToExchange;

const callMyServer = async function (
    endpoint,
    isPost = false,
    postData = null
) {
    const optionsObj = isPost ? { method: "POST" } : {};
    if (isPost && postData !== null) {
        optionsObj.headers = { "Content-type": "application/json" };
        optionsObj.body = JSON.stringify(postData);
    }
    const response = await fetch(endpoint, optionsObj);
    if (response.status === 500) {
        await handleServerError(response);
        return;
    }
    const data = await response.json();
    console.log(`Result from calling ${endpoint}: ${JSON.stringify(data)}`);
    return data;
};

const showOutput = function (textToShow) {
    if (textToShow == null) return;
    console.log(textToShow)
};

const handleServerError = async function (responseObject) {
    const error = await responseObject.json();
    console.error("I received an error ", error);
    if (error.hasOwnProperty("error_message")) {
        showOutput(`Error: ${error.error_message} -- See console for more`);
    }
};

export const checkConnectedStatus = async function () {
    const connectedData = await callMyServer("/api/plaid/get_user_info");
    if (connectedData.user_status === "connected") {
        showOutput(`Plaid is connected to your financial institution`);
    }   
};

async function exchangeToken() {
    await callMyServer("/server/swap_public_token", true, {
        public_token: publicTokenToExchange,
    });
    console.log("Done exchanging our token. I'll re-fetch our status");
    await checkConnectedStatus();
}


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
    exchangeToken,
    getAccountsInfo,
    getItemInfo
}