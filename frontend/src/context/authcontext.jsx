import { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../api'

export const AuthContext = createContext(null)

const STORAGE_KEY = 'proofpurge_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password)
    localStorage.setItem(STORAGE_KEY, data.access_token)
    setToken(data.access_token)
    return data
  }, [])

  const register = useCallback(async (name, email, password) => {
    return api.register(name, email, password)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
  }, [])

  const value = { token, isAuthenticated: Boolean(token), login, register, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
 
