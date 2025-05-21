// API and form related types
export interface FormData {
    sites: string[];
    email: string[];
    profession: string;
    city: string;
    state: string;
    logic: string;
    pages?: number;
}

export interface ScraperResponse {
    success: boolean;
    data?: FormData;
    error?: string;
    emails?: string[];
    emailCount?: number;
}

// Application state and component types
export interface ScrapingStatus {
    profession: string;
    state: string;
    city: string;
    emailsFound: number;
    emails?: string[];
    source?: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
}

export interface EmailWithSource {
    email: string;
    source: string;
}

export interface ScrapedData {
    profession: string;
    state: string;
    fileName: string;
    emails: EmailWithSource[];
    blob: Blob;
    date: string;
    totalEmailCount?: number;
    cityBreakdown?: string;
    cityName?: string;
}

// Notification state type
export interface NotificationState {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
}

// Extended window interface for global state
export interface ExtendedWindow extends Window {
    latestContinuousSave?: {
        blob: Blob;
        fileName: string;
        profession: string;
        state: string;
        timestamp: string;
        emailCount: number;
    };
    updatePartialScrapeReferences?: (
        results: { [profession: string]: { [state: string]: EmailWithSource[] } },
        emailMap: Map<string, { city: string, source: string }>
    ) => void;
}

// Recovery data structure for auto-save
export interface RecoveredData {
    profession: string;
    state: string;
    emails: Array<{ email: string, source: string }>;
    date?: string;
    autoSave?: boolean;
} 