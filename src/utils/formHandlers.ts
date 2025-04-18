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
    htmlContent?: string;
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

export function buildGoogleSearchQuery(data: FormData): string {
    const logic = data.logic?.toUpperCase() === 'AND' ? ' AND ' : ' OR ';
    
    const sitesQuery = data.sites.length > 0 
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
    const brightDataApiKey = '3c83fbdd-1797-4769-aa4c-8921171c4098';
    const brightDataZone = 'serp_api1';

    const response = await axios.post(
        'https://api.brightdata.com/request',
        { zone: brightDataZone, url, format: 'raw' },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${brightDataApiKey}`
            }
        }
    );
    return response.data;
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
            pages: data.pages || 5
        };

        const query = buildGoogleSearchQuery(formatted);
        console.log("Search Query:", query);

        let allEmails: string[] = [];
        for (let i = 0; i < formatted.pages; i++) {
            const startIndex = i * 100;
            console.log(`Scraping page ${i + 1}, start index: ${startIndex}`);
            try {
                const htmlContent = await scrapeSinglePage(query, startIndex);
                const pageEmails = extractEmailsFromHtml(htmlContent);
                allEmails = [...allEmails, ...pageEmails];
                console.log(`Found ${pageEmails.length} emails on page ${i + 1}`);
                await delay(2000);
            } catch (error) {
                console.error(`Error scraping page ${i + 1}:`, error);
            }
        }

        allEmails = [...new Set(allEmails)];
        return { success: true, emails: allEmails, emailCount: allEmails.length };
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

export async function handleFormSubmit(data: FormData): Promise<ScraperResponse | undefined> {
    try {
        const formattedData = {
            ...data,
            sites: formatSites(data.sites),
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