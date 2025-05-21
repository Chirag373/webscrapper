import React from 'react';
import { ScrapedData, EmailWithSource, NotificationState, RecoveredData } from './types';

/**
 * Creates a CSV blob from array of emails with source information
 */
export function createCsvBlob(
    emailsWithSource: EmailWithSource[],
    profession: string,
    state: string,
    includeSource: boolean = true,
    cityName?: string
): Blob {
    // Create CSV header
    let header = includeSource 
        ? 'Email,Source,Profession,State' 
        : 'Email,Profession,State';
    
    if (cityName) header += ',City';
    
    const rows = [header];
    
    // Add each email as a row
    emailsWithSource.forEach(({ email, source }) => {
        let row = includeSource
            ? `${email},${source},${profession},${state}`
            : `${email},${profession},${state}`;
            
        if (cityName) row += `,${cityName}`;
        
        rows.push(row);
    });
    
    return new Blob([rows.join('\n')], { type: 'text/csv' });
}

/**
 * Triggers download of a file
 */
export function downloadFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Clear all stored data from browser storage
 */
export function clearStorageData(): void {
    try {
        // Clear saved results but maintain settings
        localStorage.removeItem('temporaryResults');
        localStorage.removeItem('recoveredData');
        sessionStorage.removeItem('connectionLostTimestamp');
        
        console.log('All temporary data cleared from browser storage');
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
}

/**
 * Save temporary results for recovery
 */
export function saveTemporaryResults(
    profession: string,
    state: string,
    emails: EmailWithSource[]
): void {
    try {
        // Save to localStorage for persistence across page reloads
        const recoveredData: RecoveredData = {
            profession,
            state,
            emails,
            date: new Date().toISOString(),
            autoSave: true
        };
        
        localStorage.setItem('recoveredData', JSON.stringify(recoveredData));
        console.log(`Saved ${emails.length} emails for recovery (${profession}, ${state})`);
    } catch (error) {
        console.error('Error saving temporary results:', error);
    }
}

/**
 * Load recovered data from browser storage
 */
export function loadRecoveredData(
    setRecentlyScrapedData: React.Dispatch<React.SetStateAction<ScrapedData[]>>,
    setNotification: (notification: NotificationState) => void
): void {
    try {
        const recoveredDataJson = localStorage.getItem('recoveredData');
        if (!recoveredDataJson) return;
        
        const recoveredData: RecoveredData = JSON.parse(recoveredDataJson);
        
        if (recoveredData && recoveredData.emails && recoveredData.emails.length > 0) {
            // Create a blob from recovered data
            const blob = createCsvBlob(
                recoveredData.emails, 
                recoveredData.profession, 
                recoveredData.state
            );
            
            // Create a timestamp for the filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${recoveredData.profession.replace(/\s+/g, '_')}_${recoveredData.state.replace(/\s+/g, '_')}_recovered_${timestamp}.csv`;
            
            // Create scraped data object
            const scrapedData: ScrapedData = {
                profession: recoveredData.profession,
                state: recoveredData.state,
                fileName,
                emails: recoveredData.emails,
                blob,
                date: recoveredData.date || new Date().toLocaleString(),
                totalEmailCount: recoveredData.emails.length
            };
            
            // Add recovered data to the list
            setRecentlyScrapedData(prevData => [...prevData, scrapedData]);
            
            // Show recovery notification
            setNotification({
                open: true,
                message: `Recovered ${recoveredData.emails.length} emails from previous session (${recoveredData.profession}, ${recoveredData.state})`,
                severity: 'info'
            });
            
            console.log(`Recovered ${recoveredData.emails.length} emails from previous session`);
        }
    } catch (error) {
        console.error('Error loading recovered data:', error);
    }
} 