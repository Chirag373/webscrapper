import axios from 'axios';

interface FormData {
    sites: string[];
    email: string[];
    profession: string;
    city: string;
    state: string;
    logic: string;
    pages?: number;
}

interface ScraperResponse {
    success: boolean;
    data?: FormData;
    error?: string;
    emails?: string[];
    emailCount?: number;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function formatEmailAddresses(emails: string[]): string[] {
    return emails.map(email => {
        let formattedEmail = email.toLowerCase().trim();
        if (!formattedEmail.startsWith('@')) {
            formattedEmail = `@${formattedEmail}`;
        }
        return formattedEmail;
    });
}

function formatData(someData: string): string {
    return someData ? someData.toLowerCase().trim() : '';
}

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

async function scrapeSinglePage(query: string, startIndex: number = 0): Promise<string> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.google.com/search?q=${encodedQuery}&num=100&start=${startIndex}`;

    const brightDataApiKey = '5055c705a96be31113dcb656c317fd97e58b1f96c655f5396ca84a3c18a61c7a';
    const brightDataZone = 'serp_api1';

    try {
        const response = await axios.post(
            'https://api.brightdata.com/request',
            { 
                zone: brightDataZone, 
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
                    'Authorization': `Bearer ${brightDataApiKey}`
                },
                timeout: 30000 // 30 second timeout
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
        
        // Basic email validation
        const [localPart, domain] = email.split('@');
        return localPart.length > 1 && domain.length > 3;
    });
}

export async function scrapeSearchResults(data: FormData): Promise<ScraperResponse> {
    try {
        const formatted = {
            sites: data.sites, 
            email: data.email, 
            profession: formatData(data.profession),
            city: formatData(data.city),
            state: formatData(data.state),
            logic: data.logic,
            pages: data.pages || 2 // Reduced to 2 pages for better reliability
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
            while (retryCount < 2) {
                try {
                    const htmlContent = await scrapeSinglePage(query, startIndex);
                    const pageEmails = extractEmailsFromHtml(htmlContent);
                    allEmails = [...allEmails, ...pageEmails];
                    console.log(`Found ${pageEmails.length} emails on page ${i + 1}`);
                    
                    if (pageEmails.length === 0) {
                        failedPages++;
                    } else {
                        failedPages = 0;
                    }
                    
                    // Add delay between requests
                    await delay(3000);
                    break;
                    
                } catch (error) {
                    console.error(`Error scraping page ${i + 1} (attempt ${retryCount + 1}):`, error);
                    retryCount++;
                    
                    if (retryCount === 2) {
                        failedPages++;
                    }
                    
                    // Add a longer delay after an error
                    await delay(5000);
                }
            }
            
            // If we've found a good number of emails, we can stop early
            if (allEmails.length > 30) {
                console.log("Found sufficient emails, stopping early");
                break;
            }
        }

        // Remove duplicates and invalid emails
        allEmails = [...new Set(allEmails)].filter(email => {
            const [localPart, domain] = email.split('@');
            return localPart.length > 1 && domain.length > 3;
        });
        
        return { 
            success: true, 
            emails: allEmails, 
            emailCount: allEmails.length, 
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

        if (emails.length === 0) {
            return {
                success: false,
                error: 'No email addresses found in the search results'
            };
        }
        
        return { 
            success: true, 
            emailCount: emails.length,
            emails: emails
        };
    } catch (error) {
        console.error("Error in form submission:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

// Batch processing helper functions
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
                    pages: 2
                };
                
                try {
                    const result = await scrapeSearchResults(formData);
                    
                    if (result.success && result.emails && result.emails.length > 0) {
                        results[profession][state] = [
                            ...results[profession][state],
                            ...result.emails
                        ];
                    }
                    
                    // Add delay between requests
                    await delay(3000);
                    
                } catch (error) {
                    console.error(`Error processing ${profession} in ${city}, ${state}:`, error);
                }
                
                completedTasks++;
            }
        }
    }
    
    return results;
}