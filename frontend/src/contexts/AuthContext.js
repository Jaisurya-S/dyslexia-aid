// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Try to get user from localStorage on initial load
    const savedUser = localStorage.getItem('dyslexiaUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user exists in localStorage on mount
    const savedUser = localStorage.getItem('dyslexiaUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      // Sign in with Firebase first
      await signInWithEmailAndPassword(auth, email, password);

      // Then fetch user profile from backend using email
      const response = await axios.post('https://dyslexia-aid.onrender.com/api/login', {
        email,
        password
      });

      if (response.status === 200) {
        const userData = {
          user_id: response.data.user_id,
          username: response.data.username,
          user_type: response.data.user_type,
          email: response.data.email || email
        };
        setUser(userData);
        localStorage.setItem('dyslexiaUser', JSON.stringify(userData));
        return { success: true, data: userData };
      }
    } catch (error) {
      console.error('Login error:', error);
      const msg = error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found'
        ? 'Invalid email or password'
        : error.response?.data?.error || 'Login failed';
      return { success: false, error: msg };
    }
  };

  const register = async (formData) => {
    try {
      // Create Firebase user first
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // Then register in backend
      const response = await axios.post('https://dyslexia-aid.onrender.com/api/register', formData);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      console.error('Register error:', error);
      // If backend fails, clean up Firebase user
      if (auth.currentUser) await auth.currentUser.delete();
      const msg = error.code === 'auth/email-already-in-use'
        ? 'Email already in use'
        : error.response?.data?.error || 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const googleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { email, displayName } = result.user;

      // Retry up to 3 times to handle Render cold start
      let response, lastError;
      for (let i = 0; i < 3; i++) {
        try {
          response = await axios.post('https://dyslexia-aid.onrender.com/api/login', {
            email,
            display_name: displayName || '',
            google: true
          }, { timeout: 30000 });
          break;
        } catch (e) {
          lastError = e;
          if (i < 2) await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (!response) throw lastError;

      const userData = {
        user_id: response.data.user_id,
        username: response.data.username,
        user_type: response.data.user_type,
        email: response.data.email || email
      };
      setUser(userData);
      localStorage.setItem('dyslexiaUser', JSON.stringify(userData));
      return { success: true, data: userData };
    } catch (error) {
      console.error('Google login error:', error.code, error.message, error.response?.data);

      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Sign-in cancelled' };
      }
      if (error.code === 'auth/popup-blocked') {
        return { success: false, error: 'Popup blocked by browser. Please allow popups for this site.' };
      }
      if (error.code?.startsWith('auth/')) {
        return { success: false, error: error.message };
      }
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return { success: false, error: 'Cannot reach server. Please try again in a moment.' };
      }
      const msg = error.response?.data?.error || `Error: ${error.message}`;
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      const msg = error.code === 'auth/user-not-found'
        ? 'No account found with this email'
        : 'Failed to send reset email';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('dyslexiaUser');
    
    // Sign out from Firebase
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase logout error:', error);
    }
  };

  const value = {
    user,
    firebaseUser,
    login,
    register,
    googleLogin,
    resetPassword,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};