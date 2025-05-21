import axios from 'axios';
import { FormData, ScraperResponse } from './types';

// API configuration constants
const BRIGHTDATA_API_KEY = '5055c705a96be31113dcb656c317fd97e58b1f96c655f5396ca84a3c18a61c7a';
const BRIGHTDATA_ZONE = 'serp_api1';
const API_TIMEOUT = 30000; // 30 seconds
const DEFAULT_PAGES_TO_SCRAPE = 2;
const SCRAPE_DELAY = 3000; // 3 seconds between successful requests
const ERROR_DELAY = 5000; // 5 seconds after error
const EMAIL_SUFFICIENT_THRESHOLD = 30;

// Common email domains that might appear as placeholders
const COMMON_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

/**
 * Creates a delay promise that resolves after specified milliseconds
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats website URLs into Google search site: queries
 */
function formatSites(sites: string[]): string[] {
    return sites.map(site => {
        let formattedSite = site?.toLowerCase().trim() || '';
        if (formattedSite) {
            formattedSite = formattedSite.replace(/^https?:\/\//, '').replace(/^www\./, '');
            if (!formattedSite.includes('.')) {
                formattedSite = `${formattedSite}.com`;
            }
            if (!formattedSite.startsWith('site:')) {
                formattedSite = `site:${formattedSite}`;
            }
        }
        return formattedSite;
    });
}

/**
 * Formats email domains to ensure they start with @ symbol
 */
function formatEmailAddresses(emails: string[]): string[] {
    return emails.map(email => {
        let formattedEmail = email.toLowerCase().trim();
        if (!formattedEmail.startsWith('@')) {
            formattedEmail = `@${formattedEmail}`;
        }
        return formattedEmail;
    });
}

/**
 * Generic data formatter that trims and lowercases input
 */
function formatData(someData: string): string {
    return someData ? someData.toLowerCase().trim() : '';
}

/**
 * Builds a Google search query from the form data
 */
function buildGoogleSearchQuery(data: FormData): string {
    const logic = data.logic?.toUpperCase() === 'AND' ? ' AND ' : ' OR ';
    
    const sitesQuery = data.sites && data.sites.length > 0 
        ? data.sites.map(site => formatSites([site])[0]).join(' OR ') 
        : '';
    
    const emailQuery = data.email.length > 0 
        ? data.email.map(domain => `"${domain}"`).join(logic) 
        : '';
        
    const professionQuery = data.profession ? `"${data.profession}"` : '';
    const cityQuery = data.city ? `"${data.city}"` : '';
    const stateQuery = data.state ? `"${data.state}"` : '';

    const queryParts = [sitesQuery, stateQuery, cityQuery, professionQuery, emailQuery].filter(Boolean);
    return queryParts.join(' ');
}

/**
 * Scrapes a single page of Google search results for the given query
 */
async function scrapeSinglePage(query: string, startIndex: number = 0): Promise<string> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.google.com/search?q=${encodedQuery}&num=100&start=${startIndex}`;

    try {
        const response = await axios.post(
            'https://api.brightdata.com/request',
            { 
                zone: BRIGHTDATA_ZONE, 
                url, 
                format: 'raw',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`
                },
                timeout: API_TIMEOUT
            }
        );

        if (!response.data) {
            throw new Error('No data received from the API');
        }

        return response.data;
    } catch (error) {
        console.error('Error in scrapeSinglePage:', error);
        if (axios.isAxiosError(error)) {
            if (error.response) {
                throw new Error(`Scraping failed: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('No response received from the API');
            } else {
                throw new Error(`Request setup failed: ${error.message}`);
            }
        }
        throw new Error('Scraping failed due to unknown error');
    }
}

/**
 * Checks if an email appears to be a placeholder pattern
 */
function isPlaceholderEmail(email: string): boolean {
    // Check for patterns like x22@gmail.com
    if (/^x\d+@(gmail|yahoo|hotmail|outlook)\.com$/i.test(email)) {
        return true;
    }
    
    // Check the local part of email
    const [localPart, domain] = email.split('@');
    
    // Check for numeric-only usernames
    if (/^\d+$/.test(localPart)) {
        return true;
    }
    
    // Check for "test" or "example" emails
    if (/^(test|example|sample|user|admin)\d*$/i.test(localPart)) {
        return true;
    }
    
    // Check for common placeholder domain patterns
    if (domain && COMMON_EMAIL_DOMAINS.some(commonDomain => domain.toLowerCase().includes(commonDomain))) {
        if (/^x\d+$/i.test(localPart)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Extracts valid emails from HTML content
 */
function extractEmailsFromHtml(html: string): string[] {
    // Remove HTML encoded characters
    const decodedHtml = html.replace(/u003[ce]/g, '');
    
    // More strict email regex that excludes common false positives
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = decodedHtml.match(emailRegex) || [];
    
    // Filter out invalid emails
    return [...new Set(matches)].filter(email => {
        // Exclude emails with HTML entities or encoded characters
        if (email.includes('%') || email.includes('+') || email.includes('u00')) {
            return false;
        }
        
        // Exclude truncated emails
        if (email.includes('...')) {
            return false;
        }
        
        // Exclude raw search queries
        if (email.includes('google.com') || email.includes('site:')) {
            return false;
        }
        
        // Exclude placeholder pattern emails
        if (isPlaceholderEmail(email)) {
            return false;
        }
        
        // Basic email validation
        const [localPart, domain] = email.split('@');
        return localPart && localPart.length > 1 && domain && domain.length > 3;
    });
}

/**
 * Scrapes search results using the provided form data
 */
export async function scrapeSearchResults(data: FormData): Promise<ScraperResponse> {
    try {
        const formatted = {
            sites: data.sites, 
            email: data.email, 
            profession: formatData(data.profession),
            city: formatData(data.city),
            state: formatData(data.state),
            logic: data.logic,
            pages: data.pages || DEFAULT_PAGES_TO_SCRAPE
        };

        const query = buildGoogleSearchQuery(formatted);
        console.log("Search Query:", query);

        let allEmails: string[] = [];
        let failedPages = 0;
        const maxRetries = 2;
        
        for (let i = 0; i < formatted.pages && failedPages < maxRetries; i++) {
            const startIndex = i * 100;
            console.log(`Scraping page ${i + 1}, start index: ${startIndex}`);
            
            let retryCount = 0;
            let pageEmails: string[] = [];
            
            while (retryCount < 2) {
                try {
                    const htmlContent = await scrapeSinglePage(query, startIndex);
                    pageEmails = extractEmailsFromHtml(htmlContent);
                    
                    console.log(`Found ${pageEmails.length} emails on page ${i + 1}`);
                    
                    if (pageEmails.length === 0) {
                        failedPages++;
                    } else {
                        failedPages = 0;
                        allEmails = [...allEmails, ...pageEmails];
                    }
                    
                    // Add delay between requests
                    await delay(SCRAPE_DELAY);
                    break;
                    
                } catch (error) {
                    retryCount++;
                    console.error(`Error scraping page ${i + 1} (attempt ${retryCount}/2):`, error);
                    
                    if (retryCount === 2) {
                        failedPages++;
                    }
                    
                    // Add a longer delay after an error
                    await delay(ERROR_DELAY);
                }
            }
            
            // If we've found a good number of emails, we can stop early
            if (allEmails.length > EMAIL_SUFFICIENT_THRESHOLD) {
                console.log(`Found sufficient emails (${allEmails.length}), stopping early`);
                break;
            }
        }

        // Remove duplicates and apply final validation
        const uniqueEmails = [...new Set(allEmails)].filter(email => {
            const [localPart, domain] = email.split('@');
            
            // Reject placeholder pattern emails that might have slipped through
            if (isPlaceholderEmail(email)) {
                return false;
            }
            
            // Basic validation
            return localPart && localPart.length > 1 && domain && domain.length > 3;
        });
        
        return { 
            success: true, 
            emails: uniqueEmails, 
            emailCount: uniqueEmails.length, 
            data: formatted 
        };
    } catch (error) {
        console.error("Error scraping search results:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Processes a form submission and returns scraped email results
 */
export async function handleFormSubmit(data: FormData): Promise<ScraperResponse | undefined> {
    try {
        // Handle the general search case (empty sites array)
        const sitesList = data.sites || [];
        
        const formattedData = {
            ...data,
            sites: sitesList.length > 0 ? formatSites(sitesList) : [],
            email: formatEmailAddresses(data.email)
        };
        
        const scraperResponse = await scrapeSearchResults(formattedData);
        
        if (!scraperResponse.success) {
            console.error("Failed to scrape:", scraperResponse.error);
            return {
                success: false,
                error: scraperResponse.error || 'Failed to scrape search results'
            };
        }

        const emails = scraperResponse.emails || [];
        console.log(`Found ${emails.length} unique email addresses across all pages`);

        // Final filtering to exclude any remaining placeholder emails
        const filteredEmails = emails.filter(email => !isPlaceholderEmail(email));
        
        console.log(`After additional filtering: ${filteredEmails.length} valid email addresses`);

        if (filteredEmails.length === 0) {
            return {
                success: false,
                error: 'No valid email addresses found in the search results'
            };
        }
        
        return { 
            success: true, 
            emailCount: filteredEmails.length,
            emails: filteredEmails
        };
    } catch (error) {
        console.error("Error in form submission:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Processes a batch of scraping requests across multiple professions, states, and cities
 */
export async function processBatch(
    professions: string[],
    states: Record<string, string[]>,
    emailDomains: string[],
    progressCallback: (progress: number, current: { profession: string, state: string, city: string }) => void
): Promise<Record<string, Record<string, string[]>>> {
    const results: Record<string, Record<string, string[]>> = {};
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    // Calculate total tasks
    for (let i = 0; i < professions.length; i++) {
        for (const state in states) {
            totalTasks += states[state].length;
        }
    }
    
    // Process each profession, state, and city
    for (const profession of professions) {
        results[profession] = {};
        
        for (const state in states) {
            results[profession][state] = [];
            
            for (const city of states[state]) {
                try {
                    // Update progress
                    progressCallback(
                        (completedTasks / totalTasks) * 100,
                        { profession, state, city }
                    );
                    
                    // Perform scraping
                    const formData = {
                        sites: ['site:google.com'],
                        email: emailDomains,
                        profession,
                        city,
                        state,
                        logic: 'OR',
                        pages: DEFAULT_PAGES_TO_SCRAPE
                    };
                    
                    const result = await scrapeSearchResults(formData);
                    
                    if (result.success && result.emails && result.emails.length > 0) {
                        results[profession][state] = [
                            ...results[profession][state],
                            ...result.emails
                        ];
                    }
                    
                    // Add delay between requests
                    await delay(SCRAPE_DELAY);
                } catch (error) {
                    console.error(`Error processing ${profession} in ${city}, ${state}:`, error);
                } finally {
                    completedTasks++;
                }
            }
        }
    }
    
    return results;
}