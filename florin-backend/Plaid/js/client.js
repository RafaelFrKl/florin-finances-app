import { callMyServer, showOutput } from "./utilities.js";

let linkTokenData;
let publicTokenToExchange;

export const checkConnectedStatus = async function () {
    const connectedData = await callMyServer("/server/get_user_info");
    if (connectedData.user_status === "connected") {
        document.querySelector("#connectedUI").classList.remove("d-none");
        document.querySelector("#disconnectedUI").classList.add("d-none");
        showOutput(`Plaid is connected to your financial institution`);
    } else {
        document.querySelector("#connectedUI").classList.add("d-none");
        document.querySelector("#disconnectedUI").classList.remove("d-none");
    }
};

// Initialize link by fetching a link token and storing it as our
// linkTokenData
const initializeLink = async function () {

    linkTokenData = await callMyServer("/server/generate_link_token", true);
    showOutput(`Received link token data ${JSON.stringify(linkTokenData)}`);
    if (linkTokenData != null) {
        document.querySelector("#startLink").removeAttribute("disabled");
    }
};

// Start link using the link tokend data we have stored
const startLink = function () {
    if (linkTokenData === undefined) {
        return;
    }
    const handler = Plaid.create({
        token: linkTokenData.link_token,
        onSuccess: async (publicToken, metadata) => {
            console.log(`ONSUCCESS: Metadata ${JSON.stringify(metadata)}`);
            showOutput(
                `I have a public token: ${publicToken} I should exchange this`
            );
            publicTokenToExchange = publicToken;
            document.querySelector("#exchangeToken").removeAttribute("disabled");
        },
        onExit: (err, metadata) => {
            console.log(
                `Exited early. Error: ${JSON.stringify(err)} Metadata: ${JSON.stringify(
                    metadata
                )}`
            );
            showOutput(`Link existed early with status ${metadata.status}`)
        },
        onEvent: (eventName, metadata) => {
            console.log(`Event ${eventName}, Metadata: ${JSON.stringify(metadata)}`);
        },
    });
    handler.open();
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
    const accountsData = await callMyServer('/server/get_accounts_info');
    showOutput(JSON.stringify(accountsData));
};

// Get information about the Item we're connected to
const getItemInfo = async function () {
    const itemData = await callMyServer("/server/get_item_info");
    showOutput(JSON.stringify(itemData));
};

// Connect selectors to functions
const selectorsAndFunctions = {
    "#initializeLink": initializeLink,
    "#startLink": startLink,
    "#exchangeToken": exchangeToken,
    "#getAccountsInfo": getAccountsInfo,
    "#getItemInfo": getItemInfo,
};

Object.entries(selectorsAndFunctions).forEach(([sel, fun]) => {
    if (document.querySelector(sel) == null) {
        console.warn(`Hmm... couldn't find ${sel}`);
    } else {
        document.querySelector(sel)?.addEventListener("click", fun);
    }
});

const runTutorialPrecheck = async function () {
    const tutorialStatus = await callMyServer("/server/run_tutorial_precheck");
    if (tutorialStatus.status === "error") {
        showOutput(tutorialStatus.errorMessage);
    } else {
        showOutput("Tutorial is ready to go!");
        checkConnectedStatus();
    }
};

runTutorialPrecheck();