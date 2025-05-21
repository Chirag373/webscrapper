import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Box, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  attemptedRecovery: boolean;
  recoveryMessage: string;
}

/**
 * ErrorBoundary component to catch rendering errors and provide recovery mechanisms
 * for the web scraper application.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      attemptedRecovery: false,
      recoveryMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      attemptedRecovery: false,
      recoveryMessage: ''
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.attemptDataRecovery();
  }

  // Try to recover any partial scraping data
  attemptDataRecovery = (): void => {
    try {
      // Check if there's any data in localStorage we can recover
      const keys = ['partialScrapeResults', 'autoSaveResults'];
      let recoveredData = false;
      const downloadLinks: Array<{ fileName: string, url: string }> = [];

      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsedData = JSON.parse(data);
            if (parsedData.emails && parsedData.emails.length > 0) {
              // Create a blob from the saved data
              let csvContent = 'Email,Profession,State,Source\n';
              parsedData.emails.forEach((item: { email: string, source: string }) => {
                csvContent += `${item.email},${parsedData.profession},${parsedData.state},"${item.source}"\n`;
              });
              
              const fileName = `${parsedData.profession}_${parsedData.state}_emergency_recovery.csv`;
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              
              downloadLinks.push({ fileName, url });
              recoveredData = true;
            }
          } catch (e) {
            console.error(`Failed to parse ${key} data:`, e);
          }
        }
      });

      this.setState({
        attemptedRecovery: true,
        recoveryMessage: recoveredData
          ? `Successfully recovered data. Download the file${downloadLinks.length > 1 ? 's' : ''} below.`
          : 'No scraping data was found to recover.'
      });

      // Auto-trigger downloads for recovered files
      if (recoveredData) {
        setTimeout(() => {
          downloadLinks.forEach(link => {
            const a = document.createElement('a');
            a.href = link.url;
            a.download = link.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
        }, 1000);
      }
      
      // Clear localStorage items after recovery
      keys.forEach(key => localStorage.removeItem(key));
      
    } catch (recoveryError) {
      console.error('Failed to recover data:', recoveryError);
      this.setState({
        attemptedRecovery: true,
        recoveryMessage: 'Failed to recover data due to an error.'
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">Something went wrong</Typography>
            <Typography variant="body2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
          </Alert>

          {this.state.attemptedRecovery && (
            <Alert severity={this.state.recoveryMessage.includes('Successfully') ? 'success' : 'warning'} sx={{ mb: 3 }}>
              {this.state.recoveryMessage}
            </Alert>
          )}

          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mr: 2 }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={this.attemptDataRecovery}
            disabled={this.state.attemptedRecovery && !this.state.recoveryMessage.includes('Successfully')}
          >
            Try to Recover Data
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 