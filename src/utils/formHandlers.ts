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

        if (!formattedEmail.endsWith('.com')) {
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

export function handleFormSubmit(data: FormData) {
    const formatted = {
        site: formatSite(data.site),
        emailDomains: formatEmailAddresses(data.email),
        profession: formatData(data.profession),
        city: formatData(data.city),
        state: formatData(data.state),
        logic: data.logic
    };
    console.log(formatted)

}
