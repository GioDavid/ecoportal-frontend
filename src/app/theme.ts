import { createTheme } from '@mui/material/styles'
import { green } from '@mui/material/colors'

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: green[700],
      dark: green[800],
      light: green[500],
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f6f4',
      paper: '#ffffff',
    },
    divider: '#d7e0d7',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `3px solid ${green[300]}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&:focus-visible': {
            outline: `3px solid ${green[300]}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: green[700],
            borderWidth: 2,
          },
        },
      },
    },
  },
})
