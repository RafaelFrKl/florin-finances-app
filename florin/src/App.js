import { useState, useEffect } from 'react'
import Notification from './components/Notification'
import LoginForm from './components/LoginForm'
import financeService from './services/finances'
import loginService from './services/login'

const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)

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

  const handleLogout = async (event) => {
    // Deletes logged in User from local storage
    window.localStorage.removeItem('loggedFlorinappUser')
    // reload page
    window.location.reload();
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
        </div>
      }
    </div>
  )
}

export default App