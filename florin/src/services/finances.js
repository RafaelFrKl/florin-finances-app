import axios from 'axios'
const baseUrl = '/api/finances'

let token = null

const setToken = newToken => {
  token = `Bearer ${newToken}`
}

// eslint-disable-next-line import/no-anonymous-default-export
export default { 
  setToken 
}