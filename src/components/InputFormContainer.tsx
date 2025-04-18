import React, { useState, useMemo, useEffect } from "react";
import {
    Autocomplete,
    Chip,
    TextField,
    Button,
    Box,
    CircularProgress,
    Snackbar,
    Alert,
    Typography,
    LinearProgress,
    Card,
    CardContent
} from "@mui/material";
import { handleFormSubmit, scrapeSearchResults } from "@/utils/formHandlers";
import usCities from "../data/us_cities_states.json";

export default function InputFormContainer() {
    const [sites, setSites] = useState<string[]>([]);
    const [email, setEmail] = useState<string[]>([]);
    const [profession, setProfession] = useState('');
    const [state, setState] = useState('');
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [logic, setLogic] = useState<'OR' | 'AND'>('OR');
    const [loading, setLoading] = useState(false);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [currentCity, setCurrentCity] = useState('');
    const [progress, setProgress] = useState(0);
    const [totalCities, setTotalCities] = useState(0);
    const [allScrapedEmails, setAllScrapedEmails] = useState<{[city: string]: string[]}>({});
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const states = useMemo(() => Object.keys(usCities), []);
    const availableCities = useMemo(() => (
        state ? usCities[state as keyof typeof usCities] : []
    ), [state]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await handleFormSubmit({ 
                sites, 
                email, 
                profession, 
                city: selectedCities[0] || '', 
                state, 
                logic 
            });
            
            if (result?.success) {
                // Create and download CSV
                const csvContent = 'Email,City,State\n' + 
                    result.emails?.map(email => `${email},${selectedCities[0] || ''},${state}`).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'scraped_emails.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                setNotification({ 
                    open: true, 
                    message: `Successfully scraped ${result.emailCount} email addresses!`, 
                    severity: 'success' 
                });
            } else {
                setNotification({ 
                    open: true, 
                    message: result?.error || 'Failed to scrape emails', 
                    severity: 'error' 
                });
            }
        } catch (error) {
            setNotification({ 
                open: true, 
                message: error instanceof Error ? error.message : 'An unknown error occurred', 
                severity: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBatchProcess = async () => {
        if (!state || selectedCities.length === 0) {
            setNotification({ 
                open: true, 
                message: 'Please select a state and at least one city', 
                severity: 'error' 
            });
            return;
        }

        setBatchProcessing(true);
        setProgress(0);
        setTotalCities(selectedCities.length);
        setAllScrapedEmails({});
        
        const allEmailsResult: {[city: string]: string[]} = {};
        
        for (let i = 0; i < selectedCities.length; i++) {
            const city = selectedCities[i];
            setCurrentCity(city);
            setProgress(Math.round(((i) / selectedCities.length) * 100));
            
            try {
                const formData = { 
                    sites, 
                    email, 
                    profession, 
                    city, 
                    state, 
                    logic,
                    pages: 3
                };
                
                console.log(`Processing city ${i + 1}/${selectedCities.length}: ${city}`);
                
                const result = await scrapeSearchResults(formData);
                
                if (result.success && result.emails && result.emails.length > 0) {
                    allEmailsResult[city] = result.emails;
                    setAllScrapedEmails(prev => ({...prev, [city]: result.emails || []}));
                    console.log(`Found ${result.emails.length} emails for ${city}`);
                } else {
                    console.log(`No emails found for ${city}`);
                    allEmailsResult[city] = [];
                    setAllScrapedEmails(prev => ({...prev, [city]: []}));
                }
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.error(`Error processing ${city}:`, error);
                allEmailsResult[city] = [];
                setAllScrapedEmails(prev => ({...prev, [city]: []}));
            }
        }
        
        setProgress(100);
        setCurrentCity('');
        
        let csvContent = 'Email,City,State\n';
        
        Object.entries(allEmailsResult).forEach(([city, emails]) => {
            emails.forEach(email => {
                csvContent += `${email},${city},${state}\n`;
            });
        });
        
        const totalUniqueEmails = Object.values(allEmailsResult).flat().length;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state}_emails.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setNotification({ 
            open: true, 
            message: `Successfully scraped ${totalUniqueEmails} unique email addresses from ${selectedCities.length} cities!`, 
            severity: 'success' 
        });
        
        setBatchProcessing(false);
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    const addEmailDomain = (domain: string) => {
        if (!domain) return;
        let formatted = domain.trim();
        if (!formatted.startsWith('@')) formatted = `@${formatted}`;
        if (!email.includes(formatted)) setEmail([...email, formatted]);
    };

    useEffect(() => {
        setSelectedCities([]);
    }, [state]);

    const totalEmailsFound = useMemo(() => {
        return Object.values(allScrapedEmails).reduce((sum, emails) => sum + emails.length, 0);
    }, [allScrapedEmails]);

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', my: 4, p: 3 }}>
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 3, borderRadius: 2, p: 3, mb: 4 }}
            >
                <Typography variant="h5" gutterBottom>Email Scraper</Typography>
                
                <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={sites}
                    onChange={(e, v) => setSites(v)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const input = (e.target as HTMLInputElement).value.trim();
                            if (input && !sites.includes(input)) setSites([...sites, input]);
                            e.preventDefault();
                        }
                    }}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip
                                    key={key}
                                    label={option}
                                    variant="outlined"
                                    {...tagProps}
                                />
                            );
                        })
                    }                    
                    renderInput={(params) => <TextField {...params} label="Websites" placeholder="Type and press enter (e.g. linkedin.com)" />}
                />

                <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={email}
                    onChange={(e, v) => setEmail(v)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const input = (e.target as HTMLInputElement).value;
                            addEmailDomain(input);
                            e.preventDefault();
                        }
                    }}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip
                                    key={key}
                                    label={option}
                                    variant="outlined"
                                    {...tagProps}
                                />
                            );
                        })
                    }    
                    renderInput={(params) => <TextField {...params} label="Email Domains" placeholder="Type and press enter (e.g. @gmail.com)" />}
                />

                <TextField
                    label="Profession"
                    value={profession}
                    onChange={e => setProfession(e.target.value)}
                    placeholder="e.g. realtor"
                    fullWidth
                />

                <Autocomplete
                    options={states}
                    value={state}
                    onChange={(e, v) => { setState(v || ''); }}
                    renderInput={(params) => <TextField {...params} label="State" />}
                />

                <Autocomplete
                    multiple
                    options={availableCities}
                    value={selectedCities}
                    onChange={(e, v) => setSelectedCities(v)}
                    disabled={!state}
                    renderInput={(params) => <TextField {...params} label="Cities" />}
                />

                <Autocomplete
                    options={['OR', 'AND']}
                    value={logic}
                    onChange={(e, v) => setLogic(v as 'OR' | 'AND' || 'OR')}
                    renderInput={(params) => <TextField {...params} label="Logic" />}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || batchProcessing || !state || selectedCities.length !== 1}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ mt: 2, flex: 1 }}
                    >
                        {loading ? 'Scraping...' : 'Scrape Single City'}
                    </Button>
                    
                    <Button
                        variant="contained"
                        color="secondary"
                        disabled={loading || batchProcessing || !state || selectedCities.length === 0}
                        startIcon={batchProcessing ? <CircularProgress size={20} color="inherit" /> : null}
                        onClick={handleBatchProcess}
                        sx={{ mt: 2, flex: 1 }}
                    >
                        {batchProcessing ? 'Processing...' : 'Process All Selected Cities'}
                    </Button>
                </Box>
            </Box>

            {batchProcessing && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Processing Cities...
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            Currently processing: {currentCity || 'Preparing...'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            Progress: {progress}% ({Object.keys(allScrapedEmails).length}/{totalCities} cities)
                        </Typography>
                        <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
                        <Typography variant="body2">
                            Total emails found so far: {totalEmailsFound}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {Object.keys(allScrapedEmails).length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Results Summary</Typography>
                        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                            {Object.entries(allScrapedEmails).map(([city, emails]) => (
                                <Box key={city} sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2">
                                        {city}: {emails.length} emails
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}