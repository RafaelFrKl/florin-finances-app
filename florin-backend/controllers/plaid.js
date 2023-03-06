const plaidrouter = require('express').Router()
const { PlaidApi } = require('plaid')
const bcrypt = require('bcrypt')
const User = require('../models/user')
const config = require('../utils/config')
const plaidClient = new PlaidApi(config.PLAID_CONFIG)


const FIELD_ACCESS_TOKEN = 'accessToken'
const FIELD_USER_STATUS = 'userStatus'
const CURR_USER_ID = 'testuser'

// Make sure Plaid is working correctly
// eslint-disable-next-line no-unused-vars
plaidrouter.get('/run_precheck', async (req, res, next) => {
    try {
        if (process.env.PLAID_CLIENT_ID === null || process.env.PLAID_CLIENT_ID === '') {
            res.json({
                status: 'error', errorMessage: `We didn't find a client ID in the .env file. Please make sure to copy 
      the appropriate variable from the Plaid dashboard` })
            return
        } else if (process.env.PLAID_SECRET === null || process.env.PLAID_SECRET === '') {
            res.json({
                status: 'error',
                errorMessage: `We didn't find a secret in the .env file. Please make sure to copy 
      the appropriate variable from the Plaid dashboard`,
            })
            return
        } else if (typeof plaidConfig !== 'undefined' && config.PLAID_CONFIG.basePath.indexOf('sandbox') < 0) {
            res.json({ status: 'error', errorMessage: 'You\'re using a non-sandbox environment in a publicly-accessible URL that has no real sign-in system and anybody can access your user\'s info. This is probably a terrible idea.' })
            return
        } else {
            res.json({ status: 'ready' })
        }
    } catch (error) {
        console.log('Got an error: ', error)
    }

})

// Generates a Link token to be used by the client.\
plaidrouter.post('/generate_link_token', async (req, res, next) => {
    try {
        const linkTokenConfig = {
            user: { client_user_id: CURR_USER_ID },
            client_name: 'Plaid Tutorial',
            language: 'en',
            products: ['auth'],
            country_codes: ['CA'],
            webhook: 'https://www.example.com/webhook',
        }
        const tokenResponse = await plaidClient.linkTokenCreate(linkTokenConfig)
        const tokenData = tokenResponse.data
        res.json(tokenData)
    } catch (error) {
        console.log(
            'Running into an error! Note that if you have an error when creating a ' +
            'link token, it\'s frequently because you have the wrong client_id ' +
            'or secret for the environment, or you forgot to copy over your ' +
            '.env.template file to.env.'
        )
        next(error)
    }
})

// Swap the public token for an access token, so we can access account info in the future
plaidrouter.post('/swap_public_token', async (request, res, next) => {
    try {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: request.body.public_token,
        })
        console.log(request.body.public_token)
        if (response.data !== null && response.data.access_token !== null) {
            res.json({
                status: 'success', accessToken: response.data.access_token
            })
        }
    } catch (error) {
        next(error)
    }
})

// Just grabs the results for calling item/get. Useful for debugging purposes
plaidrouter.get('/get_item_info', async (req, res, next) => {
    try {
        const itemResponse = await plaidClient.itemGet({
            //access_token: userRecord[FIELD_ACCESS_TOKEN]
        })
        res.json(itemResponse.data)
    } catch (error) {
        next(error)
    }
})

// Just grabs the results for calling accounts/get. Useful for debugging purposes
plaidrouter.get('/get_accounts_info', async (req, res, next) => {
    try {
        const accountResult = await plaidClient.accountsGet({
            //access_token: userRecord[FIELD_ACCESS_TOKEN],
        })
        res.json(accountResult.data)
    } catch (error) {
        next(error)
    }
})

module.exports = plaidrouter