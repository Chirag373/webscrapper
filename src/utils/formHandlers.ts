import axios from 'axios';

// Your existing form data interface
interface FormData {
    site: string;
    email: string[];
    profession: string;
    city: string;
    state: string;
    logic: string;
}

// Interface for the scraper response
interface ScraperResponse {
    success: boolean;
    data?: FormData;
    error?: string;
    htmlContent?: string;
}

// formatted site
function formatSite(site: string): string {
    let formattedSite = site?.toLowerCase().trim() || '';

    if (formattedSite && !formattedSite.startsWith('site:')) {
        formattedSite = formattedSite.replace(/^https?:\/\//, '');
        formattedSite = formattedSite.replace(/^www\./, '');

        if (!formattedSite.includes('.')) {
            formattedSite = `${formattedSite}.com`;
        }

        formattedSite = `site:${formattedSite}`;
    }

    return formattedSite;
}

// Format email addresses
function formatEmailAddresses(emails: string[]): string[] {
    return emails.map(email => {
        let formattedEmail = email.toLowerCase().trim();

        if (!formattedEmail.startsWith('@')) {
            formattedEmail = `@${formattedEmail}`;
        }

        if (!formattedEmail.includes('.')) {
            formattedEmail = `${formattedEmail}.com`;
        }

        return formattedEmail;
    });
}

// format profession, city, state
function formatData(someData: string): string {
    if (someData) {
        return someData.toLowerCase().trim();
    }
    return "";
}

// build the Google search query
export function buildGoogleSearchQuery(data: FormData): string {
    const logic = data.logic?.toUpperCase() === 'AND' ? ' AND ' : ' OR ';

    const emailQuery = data.email.length > 0 ? 
        data.email.map(domain => `"${domain}"`).join(logic) : '';
    
    const professionQuery = data.profession ? `"${data.profession}"` : '';
    const cityQuery = data.city ? `"${data.city}"` : '';
    const stateQuery = data.state ? `"${data.state}"` : '';

    const queryParts = [
        data.site, 
        stateQuery,
        cityQuery,
        professionQuery,
        emailQuery        
    ].filter(Boolean);     

    const fullQuery = queryParts.join(' '); 
    return fullQuery;
}



// Function to scrape search results using Bright Data API
export async function scrapeSearchResults(data: FormData): Promise<ScraperResponse> {
    try {
        const formatted = {
            site: formatSite(data.site),
            email: formatEmailAddresses(data.email),
            profession: formatData(data.profession),
            city: formatData(data.city),
            state: formatData(data.state),
            logic: data.logic
        };
        
        const query = buildGoogleSearchQuery(formatted);
        console.log("Search Query:", query);
        
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.google.com/search?q=${encodedQuery}&num=100`;
        
        const brightDataApiKey = '85714bf8ed4bf28c4d814b5edadbba80bd83b4d7f4ef73be7da6dfa7b95cdd01';
        const brightDataZone = 'serp_api1';
        
        const response = await axios.post(
            'https://api.brightdata.com/request',
            {
                zone: brightDataZone,
                url: url,
                format: 'raw'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${brightDataApiKey}`
                }
            }
        );

        return {
            success: true,
            htmlContent: response.data,
            data: response.data
        };
    } catch (error) {
        console.error("Error scraping search results:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

export function extractEmailsFromHtml(html: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailRegex);
    
    return matches ? [...new Set(matches)] : [];
}

export function emailsToCsv(emails: string[]): string {
    return `Email\n${emails.join('\n')}`;
}

export async function handleFormSubmit(data: FormData) {
    try {
        const scraperResponse = await scrapeSearchResults(data);
        
        if (!scraperResponse.success || !scraperResponse.htmlContent) {
            console.error("Failed to scrape:", scraperResponse.error);
            alert("Failed to scrape search results. Please try again.");
            return;
        }
        
        const emails = extractEmailsFromHtml(scraperResponse.htmlContent);
        console.log(`Found ${emails.length} email addresses`);
        
        if (emails.length === 0) {
            alert("No email addresses found in the search results.");
            return;
        }
        
        const csvContent = emailsToCsv(emails);
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scraped_emails.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return {
            success: true,
            emailCount: emails.length
        };
    } catch (error) {
        console.error("Error in form submission:", error);
        alert("An error occurred during scraping. Please try again.");
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}