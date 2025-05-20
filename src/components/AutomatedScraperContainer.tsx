import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Typography,
    LinearProgress,
    Alert,
    Snackbar,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
    Paper,
    Divider,
    TextField,
    Chip,
    Switch,
    Tooltip,
    IconButton,
    useMediaQuery,
    useTheme
} from "@mui/material";
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import { scrapeSearchResults } from "@/utils/formHandlers";
import usCities from "../data/us_cities_states.json";
import professionCategories from "../data/profession_categories";

// Define default email domains
const DEFAULT_EMAIL_DOMAINS = ["@gmail.com", "@yahoo.com", "@hotmail.com"];

// Define default sites
const DEFAULT_SITES = [
    "site:facebook.com",
    "site:linkedin.com",
    "site:twitter.com",
    "site:instagram.com",
    "site:yelp.com",
    "site:angieslist.com",
    "site:homeadvisor.com",
    "site:thumbtack.com"
];

interface ScrapingStatus {
    profession: string;
    state: string;
    city: string;
    emailsFound: number;
    emails?: string[];
    source?: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
}

interface EmailWithSource {
    email: string;
    source: string;
}

interface ScrapedData {
    profession: string;
    state: string;
    fileName: string;
    emails: EmailWithSource[];
    blob: Blob;
    date: string;
}

export default function AutomatedScraperContainer() {
    // Selected data states
    const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
    const [selectedStates, setSelectedStates] = useState<string[]>([]);
    const [selectedSites, setSelectedSites] = useState<string[]>([]);
    const [customEmailDomains, setCustomEmailDomains] = useState<string[]>([]);
    const [isGeneralSearch, setIsGeneralSearch] = useState(false);
    const [customEmailDomain, setCustomEmailDomain] = useState('');
    const [recentlyScrapedData, setRecentlyScrapedData] = useState<ScrapedData[]>([]);
    
    // Scraping process states
    const [isRunning, setIsRunning] = useState(false);
    const [totalTasks, setTotalTasks] = useState(0);
    const [completedTasks, setCompletedTasks] = useState(0);
    const [currentTask, setCurrentTask] = useState<ScrapingStatus | null>(null);
    const [scrapingHistory, setScrapingHistory] = useState<ScrapingStatus[]>([]);
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    // Theme for responsive design
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Get all states from the imported JSON
    const allStates = Object.keys(usCities);
    
    // Toggle profession selection
    const toggleProfession = (profession: string) => {
        setSelectedProfessions(prev => 
            prev.includes(profession) 
                ? prev.filter(p => p !== profession) 
                : [...prev, profession]
        );
    };

    // Toggle state selection
    const toggleState = (state: string) => {
        setSelectedStates(prev => 
            prev.includes(state) 
                ? prev.filter(s => s !== state) 
                : [...prev, state]
        );
    };

    // Select all professions
    const selectAllProfessions = () => {
        setSelectedProfessions([...professionCategories]);
    };

    // Clear all professions
    const clearAllProfessions = () => {
        setSelectedProfessions([]);
    };

    // Select all states
    const selectAllStates = () => {
        setSelectedStates([...allStates]);
    };

    // Clear all states
    const clearAllStates = () => {
        setSelectedStates([]);
    };

    // Toggle site selection
    const toggleSite = (site: string) => {
        setSelectedSites(prev => 
            prev.includes(site) 
                ? prev.filter(s => s !== site) 
                : [...prev, site]
        );
    };

    // Select all sites
    const selectAllSites = () => {
        setSelectedSites([...DEFAULT_SITES]);
    };

    // Clear all sites
    const clearAllSites = () => {
        setSelectedSites([]);
    };

    // Calculate total tasks to be performed
    useEffect(() => {
        if (isRunning) return; // Don't recalculate during execution
        
        let count = 0;
        for (let i = 0; i < selectedProfessions.length; i++) {
            for (const state of selectedStates) {
                const cities = usCities[state as keyof typeof usCities] || [];
                count += cities.length;
            }
        }
        setTotalTasks(count);
    }, [selectedProfessions, selectedStates, isRunning]);

    // Main function to start the scraping process
    const startScraping = async () => {
        if (selectedProfessions.length === 0 || selectedStates.length === 0) {
            setNotification({
                open: true,
                message: 'Please select at least one profession and one state',
                severity: 'error'
            });
            return;
        }

        if (!isGeneralSearch && selectedSites.length === 0) {
            setNotification({
                open: true,
                message: 'Please select at least one site to search or enable general search',
                severity: 'error'
            });
            return;
        }

        setIsRunning(true);
        setCompletedTasks(0);
        setScrapingHistory([]);

        // Combine default and custom email domains
        const emailDomains = [...DEFAULT_EMAIL_DOMAINS, ...customEmailDomains];

        // Create a map to track which emails were found in which cities and from which source
        const emailCityMap = new Map<string, { city: string, source: string }>();

        // Create a queue of all tasks to be performed
        const scrapingQueue: ScrapingStatus[] = [];
        
        for (const profession of selectedProfessions) {
            for (const state of selectedStates) {
                const cities = usCities[state as keyof typeof usCities] || [];
                for (const city of cities) {
                    scrapingQueue.push({
                        profession,
                        state,
                        city,
                        emailsFound: 0,
                        status: 'pending'
                    });
                }
            }
        }

        // Process the queue
        const results: { [profession: string]: { [state: string]: EmailWithSource[] } } = {};
        
        for (let i = 0; i < scrapingQueue.length; i++) {
            const task = scrapingQueue[i];
            setCurrentTask({ ...task, status: 'processing' });
            
            try {
                // Initialize result structure if needed
                if (!results[task.profession]) {
                    results[task.profession] = {};
                }
                if (!results[task.profession][task.state]) {
                    results[task.profession][task.state] = [];
                }
                
                console.log(`Processing: ${task.profession} in ${task.city}, ${task.state}`);
                
                if (isGeneralSearch) {
                    // For general search
                    const formData = {
                        sites: [],
                        email: emailDomains,
                        profession: task.profession,
                        city: task.city,
                        state: task.state,
                        logic: 'OR',
                        pages: 3
                    };
                    
                    // Perform the scraping
                    const result = await scrapeSearchResults(formData);
                    
                    if (result.success && result.emails && result.emails.length > 0) {
                        // Convert plain emails to EmailWithSource objects
                        const emailsWithSource = result.emails.map(email => ({
                            email: email,
                            source: "google.com"
                        }));
                        
                        // Add emails to results
                        results[task.profession][task.state] = [
                            ...results[task.profession][task.state],
                            ...emailsWithSource
                        ];
                        
                        // Track which emails were found in which city and from which source
                        emailsWithSource.forEach(item => {
                            emailCityMap.set(item.email, { 
                                city: task.city,
                                source: item.source
                            });
                        });
                        
                        // Update task status
                        const updatedTask = {
                            ...task,
                            emailsFound: result.emails.length,
                            emails: result.emails,
                            source: "google.com",
                            status: 'completed' as const
                        };
                        
                        setCurrentTask(updatedTask);
                        setScrapingHistory(prev => [...prev, updatedTask]);
                    } else {
                        // Update task status with error
                        const updatedTask = {
                            ...task,
                            emailsFound: 0,
                            status: 'error' as const,
                            error: result.error || 'No emails found'
                        };
                        
                        setCurrentTask(updatedTask);
                        setScrapingHistory(prev => [...prev, updatedTask]);
                    }
                } else {
                    // For site-specific searches, search each site separately to track the source
                    for (const site of selectedSites) {
                        // Extract domain name from site
                        const siteDomain = site.replace('site:', '');
                        
                        const formData = {
                            sites: [site],
                            email: emailDomains,
                            profession: task.profession,
                            city: task.city,
                            state: task.state,
                            logic: 'OR',
                            pages: 2
                        };
                        
                        // Perform the scraping
                        const result = await scrapeSearchResults(formData);
                        
                        if (result.success && result.emails && result.emails.length > 0) {
                            // Convert plain emails to EmailWithSource objects
                            const emailsWithSource = result.emails.map(email => ({
                                email: email,
                                source: siteDomain
                            }));
                            
                            // Add emails to results
                            results[task.profession][task.state] = [
                                ...results[task.profession][task.state],
                                ...emailsWithSource
                            ];
                            
                            // Track which emails were found in which city and from which source
                            emailsWithSource.forEach(item => {
                                emailCityMap.set(item.email, { 
                                    city: task.city,
                                    source: item.source
                                });
                            });
                            
                            console.log(`Found ${result.emails.length} emails from ${siteDomain}`);
                        }
                        
                        // Add delay to avoid overwhelming the server
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    // Update task status only after all site searches are done
                    const totalEmails = results[task.profession][task.state].filter(
                        item => emailCityMap.get(item.email)?.city === task.city
                    ).length;
                    
                    if (totalEmails > 0) {
                        const updatedTask = {
                            ...task,
                            emailsFound: totalEmails,
                            source: "Multiple Sites",
                            status: 'completed' as const
                        };
                        
                        setCurrentTask(updatedTask);
                        setScrapingHistory(prev => [...prev, updatedTask]);
                    } else {
                        const updatedTask = {
                            ...task,
                            emailsFound: 0,
                            status: 'error' as const,
                            error: 'No emails found'
                        };
                        
                        setCurrentTask(updatedTask);
                        setScrapingHistory(prev => [...prev, updatedTask]);
                    }
                }
                
                // Add delay to avoid overwhelming the server between cities
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                // Handle errors
                const updatedTask = {
                    ...task,
                    emailsFound: 0,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                
                setCurrentTask(updatedTask);
                setScrapingHistory(prev => [...prev, updatedTask]);
            }
            
            // Update progress
            setCompletedTasks(i + 1);
        }
        
        // Once all tasks are completed, export results to CSV files
        for (const profession in results) {
            for (const state in results[profession]) {
                // Get all emails with their sources
                const emailsWithSources = results[profession][state];
                
                if (emailsWithSources.length > 0) {
                    // Create CSV content with actual city names and sources
                    let csvContent = 'Email,Profession,State,City,Source\n';
                    
                    // Deduplicate emails (keep first occurrence with its source)
                    const uniqueEmails = new Map<string, EmailWithSource>();
                    for (const item of emailsWithSources) {
                        if (!uniqueEmails.has(item.email)) {
                            uniqueEmails.set(item.email, item);
                        }
                    }
                    
                    for (const [email, item] of uniqueEmails.entries()) {
                        // Get the city and source this email was found in
                        const emailData = emailCityMap.get(email);
                        const city = emailData?.city || "Unknown";
                        const source = item.source || "Unknown";
                        csvContent += `${email},${profession},${state},"${city}","${source}"\n`;
                    }
                    
                    // File name
                    const fileName = `${profession.replace(/\s+/g, '_')}_${state.replace(/\s+/g, '_')}_emails.csv`;
                    
                    // Create Blob for file
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    
                    // Check if running on Windows
                    const isWindows = window.navigator.platform.indexOf('Win') > -1;
                    
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
                    
                    // Save to custom directory on Windows
                    if (isWindows) {
                        try {
                            // Create a reference to the scraped data
                            const scrapedData: ScrapedData = {
                                profession,
                                state,
                                fileName,
                                emails: Array.from(uniqueEmails.values()),
                                blob,
                                date: new Date().toLocaleString()
                            };
                            
                            // Add to recently scraped data for download later
                            setRecentlyScrapedData(prev => [...prev, scrapedData]);
                            
                            // For now, just use the default method
                            defaultSave();
                        } catch (error) {
                            console.error("Error saving to custom directory:", error);
                            defaultSave();
                        }
                    } else {
                        const scrapedData: ScrapedData = {
                            profession,
                            state,
                            fileName,
                            emails: Array.from(uniqueEmails.values()),
                            blob,
                            date: new Date().toLocaleString()
                        };
                        
                        // Add to recently scraped data for download later
                        setRecentlyScrapedData(prev => [...prev, scrapedData]);
                        defaultSave();
                    }
                }
            }
        }
        
        setIsRunning(false);
        setCurrentTask(null);
        setNotification({
            open: true,
            message: `Scraping completed! Processed ${completedTasks} tasks across ${selectedProfessions.length} professions and ${selectedStates.length} states.`,
            severity: 'success'
        });
    };

    // Handle notification close
    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    // Calculate progress percentage
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Add custom email domain
    const addCustomEmailDomain = () => {
        if (!customEmailDomain) return;
        
        let formatted = customEmailDomain.trim();
        if (!formatted.startsWith('@')) {
            formatted = `@${formatted}`;
        }
        
        if (!customEmailDomains.includes(formatted)) {
            setCustomEmailDomains(prev => [...prev, formatted]);
            setCustomEmailDomain('');
        }
    };
    
    // Remove custom email domain
    const removeCustomEmailDomain = (domain: string) => {
        setCustomEmailDomains(prev => prev.filter(d => d !== domain));
    };

    // Handle email domain input keydown
    const handleEmailKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomEmailDomain();
        }
    };

    // Handle download for a specific file
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

    return (
        <Box sx={{ 
            width: '80%', 
            maxWidth: '1600px', 
            mx: 'auto', 
            my: 4, 
            p: isMobile ? 1 : 3 
        }}>
            <Card sx={{ mb: 4, p: isMobile ? 1 : 2 }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom>Automated Multi-Level Scraper</Typography>
                    <Typography variant="body2" gutterBottom color="text.secondary">
                        This tool automatically loops through selected professions, states, and cities to scrape email addresses.
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: isMobile ? 2 : 3,
                        mt: 2
                    }}>
                        <Box sx={{ flex: 1, width: { xs: '100%', md: '33%' } }}>
                            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6">Professions</Typography>
                                    <Box>
                                        <Button size="small" onClick={selectAllProfessions}>Select All</Button>
                                        <Button size="small" onClick={clearAllProfessions}>Clear</Button>
                                    </Box>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <List dense>
                                        {professionCategories.map((profession, index) => (
                                            <ListItem key={`${profession}-${index}`} disablePadding>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox 
                                                            checked={selectedProfessions.includes(profession)}
                                                            onChange={() => toggleProfession(profession)}
                                                            disabled={isRunning}
                                                        />
                                                    }
                                                    label={profession}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            </Paper>
                        </Box>
                        
                        <Box sx={{ flex: 1, width: { xs: '100%', md: '33%' } }}>
                            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6">States</Typography>
                                    <Box>
                                        <Button size="small" onClick={selectAllStates}>Select All</Button>
                                        <Button size="small" onClick={clearAllStates}>Clear</Button>
                                    </Box>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <List dense>
                                        {allStates.map((state) => (
                                            <ListItem key={state} disablePadding>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox 
                                                            checked={selectedStates.includes(state)}
                                                            onChange={() => toggleState(state)}
                                                            disabled={isRunning}
                                                        />
                                                    }
                                                    label={state}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            </Paper>
                        </Box>

                        <Box sx={{ flex: 1, width: { xs: '100%', md: '33%' } }}>
                            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6">Sites</Typography>
                                    <Box>
                                        <Button size="small" onClick={selectAllSites}>Select All</Button>
                                        <Button size="small" onClick={clearAllSites}>Clear</Button>
                                    </Box>
                                </Box>
                                
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={isGeneralSearch}
                                            onChange={(e) => setIsGeneralSearch(e.target.checked)}
                                            disabled={isRunning}
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
                                    <Alert severity="info" sx={{ mt: 1, mb: 1 }} icon={false}>
                                        General search enabled. Searches will not be restricted to specific websites.
                                    </Alert>
                                )}
                                
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <List dense>
                                        {DEFAULT_SITES.map((site) => (
                                            <ListItem key={site} disablePadding>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox 
                                                            checked={selectedSites.includes(site)}
                                                            onChange={() => toggleSite(site)}
                                                            disabled={isRunning || isGeneralSearch}
                                                        />
                                                    }
                                                    label={site.replace('site:', '')}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            </Paper>
                        </Box>
                    </Box>
                    
                    {/* Email Domains and Summary */}
                    <Box sx={{ mt: 3 }}>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: 2,
                            width: '100%'
                        }}>
                            <Box sx={{ flex: 1, width: { xs: '100%', md: '100%' } }}>
                                <Typography variant="subtitle1">Default Email Domains:</Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                    {DEFAULT_EMAIL_DOMAINS.map(domain => (
                                        <Chip key={domain} label={domain} color="primary" variant="outlined" />
                                    ))}
                                </Box>
                                
                                <Typography variant="subtitle1">Custom Email Domains:</Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                    {customEmailDomains.map(domain => (
                                        <Chip 
                                            key={domain} 
                                            label={domain} 
                                            color="secondary" 
                                            variant="outlined" 
                                            onDelete={() => removeCustomEmailDomain(domain)}
                                        />
                                    ))}
                                </Box>
                                
                                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                                    <TextField
                                        label="Add Custom Email Domain"
                                        placeholder="e.g., @company.com"
                                        value={customEmailDomain}
                                        onChange={(e) => setCustomEmailDomain(e.target.value)}
                                        onKeyDown={handleEmailKeyDown}
                                        fullWidth
                                    />
                                    <Button 
                                        variant="outlined" 
                                        onClick={addCustomEmailDomain}
                                        sx={{ minWidth: '100px' }}
                                    >
                                        Add
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                        
                        {/* Task Summary - Full Width */}
                        <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
                            <Typography variant="body1" fontWeight="medium" gutterBottom>
                                Total tasks to process: <strong>{totalTasks}</strong> (Professions × States × Cities)
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    disabled={isRunning || selectedProfessions.length === 0 || selectedStates.length === 0}
                                    onClick={startScraping}
                                    startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : null}
                                    size="large"
                                    sx={{ py: 1.5 }}
                                >
                                    {isRunning ? 'Processing...' : 'Start Automated Scraping'}
                                </Button>
                                
                                {recentlyScrapedData.length > 0 && (
                                    <Tooltip title="Download Latest Results">
                                        <IconButton 
                                            color="primary" 
                                            sx={{ ml: 1 }}
                                            onClick={() => handleDownload(recentlyScrapedData[recentlyScrapedData.length - 1])}
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
            
            {/* Progress Card */}
            {isRunning && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6">Scraping Progress</Typography>
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress 
                                variant="determinate" 
                                value={progressPercentage} 
                                sx={{ height: 10, borderRadius: 5, mb: 2 }} 
                            />
                            <Typography variant="body2" align="center">
                                {Math.round(progressPercentage)}% Complete ({completedTasks}/{totalTasks})
                            </Typography>
                        </Box>
                        
                        {currentTask && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="subtitle1">
                                    Currently Processing:
                                </Typography>
                                <Typography variant="body2">
                                    Profession: <strong>{currentTask.profession}</strong>
                                </Typography>
                                <Typography variant="body2">
                                    Location: <strong>{currentTask.city}, {currentTask.state}</strong>
                                </Typography>
                                <Typography variant="body2">
                                    Source: <strong>{isGeneralSearch ? "General Search" : "Specific Sites"}</strong>
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {/* Results Summary */}
            {scrapingHistory.length > 0 && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Results Summary</Typography>
                        <Typography variant="body2" gutterBottom>
                            Total tasks completed: {completedTasks}/{totalTasks}
                        </Typography>
                        
                        <Box sx={{ maxHeight: 300, overflow: 'auto', mt: 2 }}>
                            <List dense>
                                {scrapingHistory.slice(-20).map((item, index) => (
                                    <ListItem key={index} sx={{ 
                                        bgcolor: item.status === 'completed' ? 'rgba(76, 175, 80, 0.1)' : 
                                                 item.status === 'error' ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                                        borderRadius: 1,
                                        mb: 1
                                    }}>
                                        <Box>
                                            <Typography variant="body2">
                                                {item.profession} - {item.city}, {item.state}
                                            </Typography>
                                            <Typography variant="caption" color={
                                                item.status === 'completed' ? 'success.main' : 
                                                item.status === 'error' ? 'error.main' : 'text.secondary'
                                            }>
                                                {item.status === 'completed' 
                                                    ? `Found ${item.emailsFound} emails (${item.source})` 
                                                    : item.status === 'error' 
                                                        ? `Error: ${item.error}` 
                                                        : 'Processing...'}
                                            </Typography>
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </CardContent>
                </Card>
            )}
            
            {/* Recent Downloads */}
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
                                            {data.profession} - {data.state}
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