import { useState, useEffect } from 'react'
import { callMyServer, showOutput } from "./services/plaidUtils.js";
import { usePlaidLink } from 'react-plaid-link';
import Notification from './components/Notification'
import LoginForm from './components/LoginForm'
import Button from './components/Button'
import financeService from './services/finances'
import loginService from './services/login'
import plaidService from './services/plaid'

const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)

  const [linkTokenData, setLinkTokenData] = useState('')
  const [publicToken, setPublicToken] = useState('')
  const [publicTokenToExchange, setPublicTokenToExchange] = useState('')

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedFlorinappUser')
    if (loggedUserJSON) {
      const user = JSON.parse(loggedUserJSON)
      setUser(user)
      financeService.setToken(user.token)
    }
  }, [])

  const handleLogin = async (event) => {
    event.preventDefault()
    try {
      const user = await loginService.login({
        username, password,
      })
      console.log(user)
      financeService.setToken(user.token)
      window.localStorage.setItem(
        'loggedFlorinappUser', JSON.stringify(user)
      )
      setUser(user)
      setUsername('')
      setPassword('')
    } catch (exception) {
      setErrorMessage('wrong credentials')
      setTimeout(() => {
        setErrorMessage(null)
      }, 5000)
    }
  }

  const handleLogout = (event) => {
    // Deletes logged in User from local storage
    window.localStorage.removeItem('loggedFlorinappUser')
    // reload page
    window.location.reload();
  }

  // Initialize link by fetching a link token and storing it as our linkTokenData
  const handleInitializeLink = async (event) => {
    setLinkTokenData(await callMyServer("/api/plaid/generate_link_token", true))
    showOutput(`Received link token data ${JSON.stringify(linkTokenData)}`);
    if (linkTokenData === undefined) {
      return;
    }
    console.log("linkToken:", linkTokenData.link_token)
  }
 
  // Start link using the link token data we have stored
  const { open } = usePlaidLink( {
    token: linkTokenData.link_token,
    onSuccess: (publicToken, metadata) => {
      console.log(`ONSUCCESS: Metadata ${JSON.stringify(metadata)}`);
      showOutput(
        `I have a public token: ${publicToken} I should exchange this`
      );
      setPublicTokenToExchange(publicToken)
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

  async function handleExchangeToken() {
    console.log("publicToken: ", publicToken)
    console.log("publicTokenToExchange: ", publicTokenToExchange)
    await callMyServer("/api/plaid/swap_public_token", true, {
      public_token: publicTokenToExchange,
    });
    console.log("Done exchanging our token. I'll re-fetch our status");
    await plaidService.checkConnectedStatus();
  }

  return (
    <div>
      <h1>Florin Finances App</h1>
      <Notification message={errorMessage} />
      {!user &&
        <LoginForm
          username={username}
          password={password}
          handleUsernameChange={({ target }) => setUsername(target.value)}
          handlePasswordChange={({ target }) => setPassword(target.value)}
          handleSubmit={handleLogin}
        />
      }
      {user &&
        <div>
          <p>{user.name} logged in <button onClick={handleLogout}>logout</button></p>
          <h2>Personal Finance App</h2>
          <p>Let's connect to a bank!</p>
          <Button handleClick={handleInitializeLink} text="Step 1: Start Plaid Link" />
          <Button handleClick={open} text="Step 2: Connect a bank account" />
          <Button handleClick={handleExchangeToken} text="Step 3: Exchange a public token" />
          <p>Basic "get my account status" functions</p>
          <Button handleClick={plaidService.getAccountsInfo} text="Get into about my Item" />
          <Button handleClick={plaidService.getItemInfo} text="Get info about my account(s)" />
          <div>
            Results will go here
          </div>
          <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
        </div>
      }
    </div>
  )
}

export default App