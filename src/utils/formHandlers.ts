interface FormData {
    site: string;
    email: string[];
    profession: string;
    city: string;
    state: string;
    logic: string;
}

// formatted site
function formatSite(site: string): string {
    let formattedSite = site?.trim() || '';
    
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
        let formattedEmail = email.trim();

        if (!formattedEmail.startsWith('@')) {
            formattedEmail = `@${formattedEmail}`;
        }

        if (!formattedEmail.endsWith('.com')) {
            formattedEmail = `${formattedEmail}.com`;
        }

        return formattedEmail;
    });
}

export function handleFormSubmit(data: FormData) {
    const formatted = {
        site: formatSite(data.site),
        emailDomains: formatEmailAddresses(data.email),
        profession: data.profession,
        city: data.city,
        state: data.state,
        logic: data.logic
    };

    console.log(formatted)

}
