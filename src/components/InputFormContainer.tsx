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
    CardContent,
    Switch,
    FormControlLabel,
    Tooltip,
    List,
    ListItem,
    IconButton,
    useMediaQuery,
    useTheme
} from "@mui/material";
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import { handleFormSubmit, scrapeSearchResults } from "@/utils/formHandlers";
import usCities from "../data/us_cities_states.json";

interface EmailWithSource {
    email: string;
    source: string;
}

interface ScrapedData {
    city: string;
    state: string;
    fileName: string;
    emails: EmailWithSource[];
    blob: Blob;
    date: string;
}

export default function InputFormContainer() {
    const [sites, setSites] = useState<string[]>([]);
    const [email, setEmail] = useState<string[]>([]);
    const [customEmailDomain, setCustomEmailDomain] = useState('');
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
    const [isGeneralSearch, setIsGeneralSearch] = useState(false);
    const [recentlyScrapedData, setRecentlyScrapedData] = useState<ScrapedData[]>([]);

    const states = useMemo(() => Object.keys(usCities), []);
    const availableCities = useMemo(() => (
        state ? usCities[state as keyof typeof usCities] : []
    ), [state]);

    // Add theme for responsiveness
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isGeneralSearch) {
                // For general search
                const result = await handleFormSubmit({ 
                    sites: [], 
                    email, 
                    profession, 
                    city: selectedCities[0] || '', 
                    state, 
                    logic 
                });
                
                if (result?.success) {
                    const source = "google.com";
                    
                    // Convert to emails with source
                    const emailsWithSource = result.emails?.map(email => ({
                        email,
                        source
                    })) || [];
                    
                    // Create CSV content with city name and source
                    const csvContent = 'Email,City,State,Source\n' + 
                        emailsWithSource.map(item => 
                            `${item.email},${selectedCities[0] || ''},${state},"${item.source}"`
                        ).join('\n');
                    
                    processAndDownloadResults(csvContent, emailsWithSource);
                } else {
                    setNotification({ 
                        open: true, 
                        message: result?.error || 'Failed to scrape emails', 
                        severity: 'error' 
                    });
                }
            } else {
                // For site-specific searches
                const allEmails: EmailWithSource[] = [];
                
                for (const site of sites) {
                    // Extract domain name from site
                    const siteDomain = site.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
                    
                    const result = await handleFormSubmit({ 
                        sites: [site], 
                        email, 
                        profession, 
                        city: selectedCities[0] || '', 
                        state, 
                        logic 
                    });
                    
                    if (result?.success && result.emails) {
                        const emailsFromSite = result.emails.map(email => ({
                            email,
                            source: siteDomain
                        }));
                        
                        allEmails.push(...emailsFromSite);
                    }
                    
                    // Add delay between requests
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                if (allEmails.length > 0) {
                    // Create CSV content with city name and sources
                    const csvContent = 'Email,City,State,Source\n' + 
                        allEmails.map(item => 
                            `${item.email},${selectedCities[0] || ''},${state},"${item.source}"`
                        ).join('\n');
                    
                    processAndDownloadResults(csvContent, allEmails);
                } else {
                    setNotification({ 
                        open: true, 
                        message: 'No emails found', 
                        severity: 'error' 
                    });
                }
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

    const processAndDownloadResults = (csvContent: string, emails: EmailWithSource[]) => {
        // File name
        const fileName = `${state}_${selectedCities[0]}_emails.csv`;
        
        // Create blob for file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        // Check if running on Windows
        const isWindows = window.navigator.platform.indexOf('Win') > -1;
        
        // Store the scraped data for download later
        const scrapedData: ScrapedData = {
            city: selectedCities[0] || '',
            state,
            fileName,
            emails,
            blob,
            date: new Date().toLocaleString()
        };
        
        setRecentlyScrapedData(prev => [...prev, scrapedData]);
        
        // Default save method
        const defaultSave = () => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        };
        
        // Handle Windows custom save location
        if (isWindows) {
            try {
                // For now, just use the default method
                defaultSave();
            } catch (error) {
                console.error("Error saving to custom directory:", error);
                defaultSave();
            }
        } else {
            defaultSave();
        }
        
        setNotification({ 
            open: true, 
            message: `Successfully scraped ${emails.length} email addresses!`, 
            severity: 'success' 
        });
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
        
        const allEmailsWithSources: EmailWithSource[] = [];
        const emailsByCity: {[city: string]: EmailWithSource[]} = {};
        
        for (let i = 0; i < selectedCities.length; i++) {
            const city = selectedCities[i];
            setCurrentCity(city);
            setProgress(Math.round(((i) / selectedCities.length) * 100));
            
            emailsByCity[city] = [];
            
            try {
                if (isGeneralSearch) {
                    // For general search
                    const formData = { 
                        sites: [], 
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
                        const emailsWithSource = result.emails.map(email => ({
                            email,
                            source: "google.com"
                        }));
                        
                        emailsByCity[city] = emailsWithSource;
                        allEmailsWithSources.push(...emailsWithSource);
                        
                        setAllScrapedEmails(prev => ({
                            ...prev, 
                            [city]: result.emails || []
                        }));
                        
                        console.log(`Found ${result.emails.length} emails for ${city}`);
                    } else {
                        console.log(`No emails found for ${city}`);
                        emailsByCity[city] = [];
                        setAllScrapedEmails(prev => ({...prev, [city]: []}));
                    }
                } else {
                    // For site-specific searches
                    const cityEmails: EmailWithSource[] = [];
                    
                    for (const site of sites) {
                        // Extract domain name from site
                        const siteDomain = site.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
                        
                        const formData = { 
                            sites: [site], 
                            email, 
                            profession, 
                            city, 
                            state, 
                            logic,
                            pages: 2
                        };
                        
                        const result = await scrapeSearchResults(formData);
                        
                        if (result.success && result.emails && result.emails.length > 0) {
                            const emailsFromSite = result.emails.map(email => ({
                                email,
                                source: siteDomain
                            }));
                            
                            cityEmails.push(...emailsFromSite);
                        }
                        
                        // Add delay between requests
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                    
                    if (cityEmails.length > 0) {
                        emailsByCity[city] = cityEmails;
                        allEmailsWithSources.push(...cityEmails);
                        
                        // Extract just the email strings
                        const emailsOnly = cityEmails.map(item => item.email);
                        setAllScrapedEmails(prev => ({...prev, [city]: emailsOnly}));
                        
                        console.log(`Found ${cityEmails.length} emails for ${city}`);
                    } else {
                        console.log(`No emails found for ${city}`);
                        emailsByCity[city] = [];
                        setAllScrapedEmails(prev => ({...prev, [city]: []}));
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error processing ${city}:`, error);
                emailsByCity[city] = [];
                setAllScrapedEmails(prev => ({...prev, [city]: []}));
            }
        }
        
        setProgress(100);
        setCurrentCity('');
        
        if (allEmailsWithSources.length > 0) {
            // Create CSV content with city names and sources
            let csvContent = 'Email,City,State,Source\n';
            
            // For each city, add its emails with sources
            for (const [city, emails] of Object.entries(emailsByCity)) {
                for (const email of emails) {
                    csvContent += `${email.email},${city},${state},"${email.source}"\n`;
                }
            }
            
            // Create blob for file
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const fileName = `${state}_emails.csv`;
            
            // Create a batch result for download options
            const batchData: ScrapedData = {
                city: selectedCities.join(', '),
                state,
                fileName,
                emails: allEmailsWithSources,
                blob,
                date: new Date().toLocaleString()
            };
            
            setRecentlyScrapedData(prev => [...prev, batchData]);
            
            // Default save method
            const defaultSave = () => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            };
            
            // Check if running on Windows
            const isWindows = window.navigator.platform.indexOf('Win') > -1;
            
            // Handle Windows custom save location
            if (isWindows) {
                try {
                    // For now, just use the default method
                    defaultSave();
                } catch (error) {
                    console.error("Error saving to custom directory:", error);
                    defaultSave();
                }
            } else {
                defaultSave();
            }
            
            setNotification({ 
                open: true, 
                message: `Successfully scraped ${allEmailsWithSources.length} unique email addresses from ${selectedCities.length} cities!`, 
                severity: 'success' 
            });
        } else {
            setNotification({ 
                open: true, 
                message: 'No emails found in any of the selected cities', 
                severity: 'error' 
            });
        }
        
        setBatchProcessing(false);
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    const addEmailDomain = () => {
        if (!customEmailDomain) return;
        
        let formatted = customEmailDomain.trim();
        if (!formatted.startsWith('@')) {
            formatted = `@${formatted}`;
        }
        
        if (!email.includes(formatted)) {
            setEmail(prev => [...prev, formatted]);
            setCustomEmailDomain('');
        }
    };

    const handleEmailKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmailDomain();
        }
    };

    const removeEmailDomain = (domain: string) => {
        setEmail(prev => prev.filter(d => d !== domain));
    };

    const handleDownload = (data: ScrapedData) => {
        const url = window.URL.createObjectURL(data.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        setSelectedCities([]);
    }, [state]);

    const totalEmailsFound = useMemo(() => {
        return Object.values(allScrapedEmails).reduce((sum, emails) => sum + emails.length, 0);
    }, [allScrapedEmails]);

    return (
        <Box sx={{ 
            width: '80%', 
            maxWidth: '1600px',
            mx: 'auto', 
            my: 4, 
            p: isMobile ? 1 : 3 
        }}>
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 3, borderRadius: 2, p: isMobile ? 2 : 3, mb: 4 }}
            >
                <Typography variant="h5" gutterBottom>Email Scraper</Typography>
                
                <FormControlLabel
                    control={
                        <Switch
                            checked={isGeneralSearch}
                            onChange={(e) => setIsGeneralSearch(e.target.checked)}
                            disabled={loading || batchProcessing}
                            color="primary"
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            Enable General Google Search
                            <Tooltip title="When enabled, searches are performed without site restrictions. Sites like Facebook, LinkedIn, etc. will not be specifically targeted.">
                                <InfoOutlined fontSize="small" sx={{ ml: 1 }} />
                            </Tooltip>
                        </Box>
                    }
                />
                
                {isGeneralSearch && (
                    <Alert severity="info" sx={{ mb: 1 }} icon={false}>
                        General search enabled. Searches will not be restricted to specific websites.
                    </Alert>
                )}
                
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1, width: { xs: '100%', md: '50%' } }}>
                        <Autocomplete
                            multiple
                            freeSolo
                            options={[]}
                            value={sites}
                            onChange={(e, v) => setSites(v)}
                            disabled={isGeneralSearch}
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
                            renderInput={(params) => <TextField {...params} label="Websites" placeholder={isGeneralSearch ? "Disabled when general search is enabled" : "Type and press enter (e.g. linkedin.com)"} />}
                        />

                        <Typography variant="subtitle1" sx={{ mt: 2 }}>Email Domains:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                            {email.map(domain => (
                                <Chip 
                                    key={domain} 
                                    label={domain} 
                                    variant="outlined"
                                    color="primary" 
                                    onDelete={() => removeEmailDomain(domain)}
                                />
                            ))}
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                label="Add Email Domain"
                                placeholder="e.g., @gmail.com"
                                value={customEmailDomain}
                                onChange={(e) => setCustomEmailDomain(e.target.value)}
                                onKeyDown={handleEmailKeyDown}
                                fullWidth
                            />
                            <Button 
                                variant="outlined" 
                                onClick={addEmailDomain}
                                sx={{ minWidth: '100px' }}
                            >
                                Add
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, width: { xs: '100%', md: '50%' } }}>
                        <TextField
                            label="Profession"
                            value={profession}
                            onChange={e => setProfession(e.target.value)}
                            placeholder="e.g. realtor"
                            fullWidth
                            sx={{ mb: 2 }}
                        />

                        <Autocomplete
                            options={states}
                            value={state}
                            onChange={(e, v) => { setState(v || ''); }}
                            renderInput={(params) => <TextField {...params} label="State" />}
                            sx={{ mb: 2 }}
                        />

                        <Autocomplete
                            multiple
                            options={availableCities}
                            value={selectedCities}
                            onChange={(e, v) => setSelectedCities(v)}
                            disabled={!state}
                            renderInput={(params) => <TextField {...params} label="Cities" />}
                            sx={{ mb: 2 }}
                        />

                        <Autocomplete
                            options={['OR', 'AND']}
                            value={logic}
                            onChange={(e, v) => setLogic(v as 'OR' | 'AND' || 'OR')}
                            renderInput={(params) => <TextField {...params} label="Logic" />}
                            sx={{ mb: 2 }}
                        />
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || batchProcessing || !state || selectedCities.length !== 1 || email.length === 0}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ flex: 1 }}
                    >
                        {loading ? 'Scraping...' : 'Scrape Single City'}
                    </Button>
                    
                    <Button
                        variant="contained"
                        color="secondary"
                        disabled={loading || batchProcessing || !state || selectedCities.length === 0 || email.length === 0}
                        startIcon={batchProcessing ? <CircularProgress size={20} color="inherit" /> : null}
                        onClick={handleBatchProcess}
                        sx={{ flex: 1 }}
                    >
                        {batchProcessing ? 'Processing...' : 'Process All Selected Cities'}
                    </Button>
                    
                    {recentlyScrapedData.length > 0 && (
                        <Tooltip title="Download Latest Results">
                            <IconButton 
                                color="primary" 
                                onClick={() => handleDownload(recentlyScrapedData[recentlyScrapedData.length - 1])}
                            >
                                <DownloadIcon />
                            </IconButton>
                        </Tooltip>
                    )}
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
                <Card sx={{ mb: 4 }}>
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

            {/* Recently Scraped Data */}
            {recentlyScrapedData.length > 0 && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Recently Scraped Data</Typography>
                            {recentlyScrapedData.length > 0 && (
                                <Tooltip title="Download Latest Results">
                                    <IconButton 
                                        color="primary"
                                        onClick={() => handleDownload(recentlyScrapedData[recentlyScrapedData.length - 1])}
                                    >
                                        <DownloadIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                        <List>
                            {recentlyScrapedData.map((data, index) => (
                                <ListItem 
                                    key={index} 
                                    secondaryAction={
                                        <IconButton
                                            edge="end"
                                            color="primary"
                                            onClick={() => handleDownload(data)}
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                    }
                                >
                                    <Box>
                                        <Typography variant="body1">
                                            {data.city} - {data.state}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {data.emails.length} emails • {data.date}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {Array.from(new Set(data.emails.map(e => e.source))).map((source, idx) => (
                                                <Chip 
                                                    key={idx} 
                                                    label={source} 
                                                    size="small" 
                                                    variant="outlined" 
                                                    color="primary"
                                                    sx={{ fontSize: '0.7rem' }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
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