import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Alert,
    Snackbar,
    Container
} from "@mui/material";
import { scrapeSearchResults } from "@/utils/formHandlers";
import usCities from "../data/us_cities_states.json";
import professionCategories from "../data/profession_categories";
import { ScrapingStatus, ScrapedData, EmailWithSource, NotificationState } from "@/utils/types";
import { setupHeartbeatMonitor, setupNetworkMonitor } from "@/utils/network";
import { 
    clearStorageData, 
    downloadFile, 
    createCsvBlob, 
    loadRecoveredData,
    saveTemporaryResults 
} from "@/utils/storage";
import ScraperControls from "./scraper/ScraperControls";
import EmailDomainSettings from "./scraper/EmailDomainSettings";
import ScrapingResults from "./scraper/ScrapingResults";

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

export default function AutomatedScraperContainer() {
    // Selected data states
    const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
    const [selectedStates, setSelectedStates] = useState<string[]>([]);
    const [selectedSites, setSelectedSites] = useState<string[]>([]);
    const [customEmailDomains, setCustomEmailDomains] = useState<string[]>([]);
    const [isGeneralSearch, setIsGeneralSearch] = useState(false);
    const [recentlyScrapedData, setRecentlyScrapedData] = useState<ScrapedData[]>([]);
    
    // Scraping process states
    const [isRunning, setIsRunning] = useState(false);
    const [totalTasks, setTotalTasks] = useState(0);
    const [completedTasks, setCompletedTasks] = useState(0);
    const [currentTask, setCurrentTask] = useState<ScrapingStatus | null>(null);
    const [scrapingHistory, setScrapingHistory] = useState<ScrapingStatus[]>([]);
    const [notification, setNotification] = useState<NotificationState>({
        open: false,
        message: '',
        severity: 'success'
    });
    // Track completed states for auto-download
    const [completedStates, setCompletedStates] = useState<Map<string, Set<string>>>(new Map());

    // Get all states from the imported JSON
    const allStates = Object.keys(usCities);
    
    // Load saved data on component mount
    useEffect(() => {
        loadRecoveredData(setRecentlyScrapedData, setNotification);
    }, []);

    // Calculate total tasks based on selections
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

    // Set up network monitoring for when scraping is running
    useEffect(() => {
        if (!isRunning) return;
        
        // Set up heartbeat monitor
        const heartbeatMonitor = setupHeartbeatMonitor(() => {
            // What to do when connection is lost
            handleConnectionLost();
        });
        
        // Set up network status monitor
        const networkMonitor = setupNetworkMonitor(
            // What to do when browser goes offline
            handleConnectionLost,
            // What to do when browser comes back online
            () => {
                const connectionLostTimestamp = sessionStorage.getItem('connectionLostTimestamp');
                if (connectionLostTimestamp) {
                    const disconnectionTime = parseInt(connectionLostTimestamp);
                    const timeSinceDisconnection = Math.round((Date.now() - disconnectionTime) / 1000);
                    
                    setNotification({
                        open: true,
                        message: `Network reconnected after ${timeSinceDisconnection} seconds.`,
                        severity: 'info'
                    });
                }
            }
        );
        
        // Start monitors
        heartbeatMonitor.start();
        networkMonitor.start();
        
        // Set up error handling
        const handleError = (event: ErrorEvent) => {
            console.error('Error caught by global handler:', event);
            handleConnectionLost();
        };
        
        window.addEventListener('error', handleError);
        
        // Clean up
        return () => {
            heartbeatMonitor.stop();
            networkMonitor.stop();
            window.removeEventListener('error', handleError);
        };
    }, [isRunning]);

    // Detect when a state has completed all cities and auto-download results
    useEffect(() => {
        if (!isRunning || !currentTask) return;
        
        // Check if we've completed all cities for a state
        for (const [profession, stateSet] of completedStates.entries()) {
            for (const state of stateSet) {
                // Find the state file in recentlyScrapedData
                const stateFile = recentlyScrapedData.find(data => 
                    data.profession === profession && 
                    data.state === state && 
                    !data.cityName
                );
                
                if (stateFile) {
                    // Auto download the state file
                    downloadFile(stateFile.blob, stateFile.fileName);
                    
                    // Remove this state from our tracking to prevent multiple downloads
                    const newCompletedStates = new Map(completedStates);
                    newCompletedStates.get(profession)?.delete(state);
                    if (newCompletedStates.get(profession)?.size === 0) {
                        newCompletedStates.delete(profession);
                    }
                    setCompletedStates(newCompletedStates);
                    
                    // Notify user
                    setNotification({
                        open: true,
                        message: `Auto-downloaded results for ${profession} in ${state}.`,
                        severity: 'success'
                    });
                }
            }
        }
    }, [recentlyScrapedData, completedStates, isRunning, currentTask]);

    // Toggle profession selection
    const toggleProfession = useCallback((profession: string) => {
        setSelectedProfessions(prev => 
            prev.includes(profession) 
                ? prev.filter(p => p !== profession) 
                : [...prev, profession]
        );
    }, []);

    // Toggle state selection
    const toggleState = useCallback((state: string) => {
        setSelectedStates(prev => 
            prev.includes(state) 
                ? prev.filter(s => s !== state) 
                : [...prev, state]
        );
    }, []);

    // Toggle site selection
    const toggleSite = useCallback((site: string) => {
        setSelectedSites(prev => 
            prev.includes(site) 
                ? prev.filter(s => s !== site) 
                : [...prev, site]
        );
    }, []);

    // Select all professions
    const selectAllProfessions = useCallback(() => {
        setSelectedProfessions([...professionCategories]);
    }, []);

    // Clear all professions
    const clearAllProfessions = useCallback(() => {
        setSelectedProfessions([]);
    }, []);

    // Select all states
    const selectAllStates = useCallback(() => {
        setSelectedStates([...allStates]);
    }, [allStates]);

    // Clear all states
    const clearAllStates = useCallback(() => {
        setSelectedStates([]);
    }, []);

    // Select all sites
    const selectAllSites = useCallback(() => {
        setSelectedSites([...DEFAULT_SITES]);
    }, []);

    // Clear all sites
    const clearAllSites = useCallback(() => {
        setSelectedSites([]);
    }, []);

    // Handle download of a scraped data file
    const handleDownload = useCallback((data: ScrapedData) => {
        downloadFile(data.blob, data.fileName);
    }, []);

    // Handle connection loss during scraping
    const handleConnectionLost = useCallback(() => {
        // Only proceed if we're actually running
        if (!isRunning) return;
        
        console.warn('Connection lost during scraping - emergency stop');
        
        // Stop the scraping process
        setIsRunning(false);
        
        // Record the time of disconnection for recovery attempts
        sessionStorage.setItem('connectionLostTimestamp', Date.now().toString());
        
        setNotification({
            open: true,
            message: 'Connection lost. Scraping has been stopped.',
            severity: 'warning'
        });
    }, [isRunning]);

    // Handle close of notification
    const handleCloseNotification = useCallback(() => {
        setNotification(prev => ({ ...prev, open: false }));
    }, []);

    // Start the scraping process
    const startScraping = useCallback(async () => {
        // First confirm if the user wants to clear previous results
        const clearPreviousData = window.confirm(
            'Do you want to clear previous scraping results? ' +
            'This will remove all previously downloaded files from the list, but won\'t affect files you\'ve already downloaded to your computer.'
        );
        
        if (clearPreviousData) {
            setRecentlyScrapedData([]);
        }
        
        // Clear local storage before starting
        clearStorageData();
        
        setIsRunning(true);
        setCompletedTasks(0);
        setScrapingHistory([]);
        setCompletedStates(new Map()); // Reset completed states tracking

        // Safety check - warn if starting while offline
        if (!navigator.onLine) {
            setNotification({
                open: true,
                message: 'Warning: You appear to be offline. Scraping may not work properly.',
                severity: 'warning'
            });
        }

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
        
        // Track completed cities per state to determine when a state is fully processed
        const totalCitiesPerState: { [professionState: string]: { total: number, completed: number } } = {};
        
        // Initialize city counters
        for (const profession of selectedProfessions) {
            for (const state of selectedStates) {
                const cities = usCities[state as keyof typeof usCities] || [];
                const key = `${profession}_${state}`;
                totalCitiesPerState[key] = {
                    total: cities.length,
                    completed: 0
                };
            }
        }
        
        try {
            for (let i = 0; i < scrapingQueue.length; i++) {
                // Check if internet connection was lost
                if (!navigator.onLine) {
                    console.warn('Internet connection lost during processing - stopping scraper');
                    break;
                }

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
                        
                        // Check internet connection again before making the API call
                        if (!navigator.onLine) {
                            throw new Error('Internet connection lost during API request preparation');
                        }
                        
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
                        // For site-specific searches
                        let totalEmailsForCity = 0;
                        
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
                                
                                totalEmailsForCity += result.emails.length;
                            }
                        }
                        
                        // Update task status only after all site searches are done
                        if (totalEmailsForCity > 0) {
                            const updatedTask = {
                                ...task,
                                emailsFound: totalEmailsForCity,
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
                                error: 'No emails found on any site'
                            };
                            
                            setCurrentTask(updatedTask);
                            setScrapingHistory(prev => [...prev, updatedTask]);
                        }
                    }
                    
                    // Increment completed city counter for this profession-state pair
                    const stateKey = `${task.profession}_${task.state}`;
                    if (totalCitiesPerState[stateKey]) {
                        totalCitiesPerState[stateKey].completed++;
                    }
                    
                    // After each city, save current results for each profession-state combination
                    // This creates a continuous save of progress that can be recovered if something goes wrong
                    for (const profession in results) {
                        for (const state in results[profession]) {
                            const emailsWithSources = results[profession][state];
                            if (emailsWithSources.length > 0) {
                                // Create city-specific emails map
                                const cityEmails: { [cityKey: string]: EmailWithSource[] } = {};
                                
                                // Group emails by city to maintain city-specific emails
                                for (const emailData of emailsWithSources) {
                                    const cityInfo = emailCityMap.get(emailData.email);
                                    if (cityInfo) {
                                        const cityKey = `${profession}_${state}_${cityInfo.city}`;
                                        if (!cityEmails[cityKey]) {
                                            cityEmails[cityKey] = [];
                                        }
                                        cityEmails[cityKey].push(emailData);
                                    }
                                }
                                
                                // Create main CSV blob with ALL emails, preserving city information
                                const blob = createCsvBlob(emailsWithSources, profession, state, true, undefined, emailCityMap);
                                
                                // Format date and time for filenames
                                const now = new Date();
                                const formattedDate = now.toLocaleDateString().replace(/\//g, '-');
                                const formattedTime = now.toLocaleTimeString().replace(/:/g, '-').replace(/\s/g, '');
                                const fileName = `${profession.replace(/\s+/g, '_')}_${state.replace(/\s+/g, '_')}_${formattedDate}_${formattedTime}.csv`;
                                
                                // Prepare city breakdown text for display
                                const cityBreakdown = Object.keys(cityEmails)
                                    .filter(key => key.startsWith(`${profession}_${state}_`))
                                    .map(key => {
                                        const cityName = key.split('_').slice(2).join('_');
                                        return `${cityName}: ${cityEmails[key].length} emails`;
                                    })
                                    .join(', ');
                                
                                // Add to recently scraped data
                                const scrapedData: ScrapedData = {
                                    profession,
                                    state,
                                    fileName,
                                    emails: emailsWithSources,
                                    blob,
                                    date: new Date().toLocaleString(),
                                    totalEmailCount: emailsWithSources.length,
                                    cityBreakdown
                                };
                                
                                setRecentlyScrapedData(prev => {
                                    // Replace any existing data for this profession+state to avoid duplicates
                                    const filtered = prev.filter(item => 
                                        !(item.profession === profession && item.state === state && !item.cityName)
                                    );
                                    return [...filtered, scrapedData];
                                });
                                
                                // Also create individual files for each city
                                for (const cityKey in cityEmails) {
                                    if (cityKey.startsWith(`${profession}_${state}_`)) {
                                        const cityName = cityKey.split('_').slice(2).join('_');
                                        const cityEmailList = cityEmails[cityKey];
                                        
                                        if (cityEmailList.length === 0) continue;
                                        
                                        // Create city-specific blob
                                        const cityBlob = createCsvBlob(cityEmailList, profession, state, true, cityName);
                                        
                                        // Format date and time for city-specific filenames
                                        const now = new Date();
                                        const formattedDate = now.toLocaleDateString().replace(/\//g, '-');
                                        const formattedTime = now.toLocaleTimeString().replace(/:/g, '-').replace(/\s/g, '');
                                        const cityFileName = `${profession.replace(/\s+/g, '_')}_${state.replace(/\s+/g, '_')}_${cityName.replace(/\s+/g, '_')}_${formattedDate}_${formattedTime}.csv`;
                                        
                                        // Add city-specific file to recently scraped data
                                        const cityData: ScrapedData = {
                                            profession,
                                            state,
                                            fileName: cityFileName,
                                            emails: cityEmailList,
                                            blob: cityBlob,
                                            date: new Date().toLocaleString(),
                                            cityName: cityName,
                                            totalEmailCount: cityEmailList.length
                                        };
                                        
                                        setRecentlyScrapedData(prev => {
                                            // Replace any existing data for this city to avoid duplicates
                                            const filtered = prev.filter(item => 
                                                !(item.profession === profession && 
                                                  item.state === state && 
                                                  item.cityName === cityName)
                                            );
                                            return [...filtered, cityData];
                                        });
                                    }
                                }
                                
                                // Save temporary data for recovery if needed
                                saveTemporaryResults(profession, state, emailsWithSources);
                                
                                // Check if the state is fully processed
                                const key = `${profession}_${state}`;
                                if (totalCitiesPerState[key] && 
                                    totalCitiesPerState[key].completed === totalCitiesPerState[key].total) {
                                    // Add to completed states for auto-download
                                    setCompletedStates(prev => {
                                        const newMap = new Map(prev);
                                        if (!newMap.has(profession)) {
                                            newMap.set(profession, new Set());
                                        }
                                        newMap.get(profession)?.add(state);
                                        return newMap;
                                    });
                                    
                                    console.log(`State ${state} for ${profession} is complete and ready for auto-download`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error processing ${task.profession} in ${task.city}, ${task.state}:`, error);
                    
                    // Update task with error
                    const updatedTask = {
                        ...task,
                        emailsFound: 0,
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                    
                    setCurrentTask(updatedTask);
                    setScrapingHistory(prev => [...prev, updatedTask]);
                } finally {
                    // Update completed tasks count
                    setCompletedTasks(i + 1);
                }
            }
            
            // Final notification on completion
            setNotification({
                open: true,
                message: `Scraping complete. Found emails for ${Object.keys(results).length} professions in ${selectedStates.length} states.`,
                severity: 'success'
            });
        } catch (error) {
            console.error("Error in scraping process:", error);
            setNotification({
                open: true,
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                severity: 'error'
            });
        } finally {
            setIsRunning(false);
        }
    }, [
        selectedProfessions, 
        selectedStates, 
        selectedSites, 
        isGeneralSearch, 
        customEmailDomains
    ]);

    return (
        <Container maxWidth="lg" sx={{ marginTop: '2rem' }}>
            {/* Main controls */}
            <ScraperControls
                selectedProfessions={selectedProfessions}
                selectedStates={selectedStates}
                selectedSites={selectedSites}
                isGeneralSearch={isGeneralSearch}
                isRunning={isRunning}
                totalTasks={totalTasks}
                completedTasks={completedTasks}
                professionCategories={professionCategories}
                allStates={allStates}
                toggleProfession={toggleProfession}
                toggleState={toggleState}
                toggleSite={toggleSite}
                selectAllProfessions={selectAllProfessions}
                clearAllProfessions={clearAllProfessions}
                selectAllStates={selectAllStates}
                clearAllStates={clearAllStates}
                selectAllSites={selectAllSites}
                clearAllSites={clearAllSites}
                startScraping={startScraping}
                setIsGeneralSearch={setIsGeneralSearch}
                setNotification={setNotification}
            />
            
            {/* Email domain settings */}
            <Box sx={{ mt: 3, mb: 4 }}>
                <EmailDomainSettings
                    customEmailDomains={customEmailDomains}
                    setCustomEmailDomains={setCustomEmailDomains}
                    disabled={isRunning}
                />
            </Box>
            
            {/* Results section */}
            <ScrapingResults
                isRunning={isRunning}
                completedTasks={completedTasks}
                totalTasks={totalTasks}
                currentTask={currentTask}
                scrapingHistory={scrapingHistory}
                recentlyScrapedData={recentlyScrapedData}
                handleDownload={handleDownload}
            />
            
            {/* Notification */}
            <Snackbar 
                open={notification.open} 
                autoHideDuration={6000} 
                onClose={handleCloseNotification}
            >
                <Alert 
                    onClose={handleCloseNotification} 
                    severity={notification.severity}
                    variant="filled"
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}