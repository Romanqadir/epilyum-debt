import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

const FONT = '"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif'

// MUI has to speak the same language as the tokens in index.css, or the
// inputs and dialogs drift away from everything hand-built around them.
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary:   { main: '#27478d', dark: '#1d3a78', light: '#3457a5' },
    secondary: { main: '#071a44' },
    error:     { main: '#b42318' },
    success:   { main: '#067647' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    text: { primary: '#0b1f4d', secondary: '#5a6b92' },
    divider: '#e3e9f5',
  },
  typography: {
    fontFamily: FONT,
    fontSize: 15,
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    body2: { fontSize: '0.875rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 18, paddingBlock: 8 },
        sizeSmall: { paddingInline: 12, paddingBlock: 4 },
        containedPrimary: {
          boxShadow: '0 1px 2px rgba(7,26,68,.16)',
          '&:hover': { backgroundColor: '#1d3a78' },
        },
        outlined: { borderColor: '#ccd6ea', '&:hover': { borderColor: '#27478d', background: '#f4f6fb' } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: '#fff',
          borderRadius: 10,
          '& fieldset': { borderColor: '#e3e9f5' },
          '&:hover fieldset': { borderColor: '#ccd6ea' },
          '&.Mui-focused fieldset': { borderColor: '#27478d', borderWidth: 1.5 },
        },
        input: { paddingBlock: 12 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: '#5a6b92' } } },
    MuiFormHelperText: { styleOverrides: { root: { marginInlineStart: 2, color: '#8494b5' } } },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 18, boxShadow: '0 24px 64px -20px rgba(7,26,68,.35)' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1.15rem', fontWeight: 600, paddingBlock: 18 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '0.925rem' } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontFamily: FONT, fontSize: '0.8rem' } } },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
