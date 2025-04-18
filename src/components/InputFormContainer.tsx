import React, { useState, useMemo } from "react";
import {
    Autocomplete,
    Chip,
    TextField,
    Button,
    Box,
    CircularProgress,
    Snackbar,
    Alert
} from "@mui/material";
import { handleFormSubmit } from "@/utils/formHandlers";
import usCities from "../data/us_cities_states.json";

export default function InputFormContainer() {
    const [sites, setSites] = useState<string[]>([]);
    const [email, setEmail] = useState<string[]>([]);
    const [profession, setProfession] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [logic, setLogic] = useState<'OR' | 'AND'>('OR');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const states = useMemo(() => Object.keys(usCities), []);
    const availableCities = useMemo(() => (
        state ? usCities[state as keyof typeof usCities] : []
    ), [state]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await handleFormSubmit({ sites, email, profession, city, state, logic });
            if (result?.success) {
                setNotification({ open: true, message: `Successfully scraped ${result.emailCount} email addresses!`, severity: 'success' });
            } else {
                setNotification({ open: true, message: result?.error || 'Failed to scrape emails', severity: 'error' });
            }
        } catch (error) {
            setNotification({ open: true, message: error instanceof Error ? error.message : 'An unknown error occurred', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    const addEmailDomain = (domain: string) => {
        if (!domain) return;
        let formatted = domain.trim();
        if (!formatted.startsWith('@')) formatted = `@${formatted}`;
        if (!email.includes(formatted)) setEmail([...email, formatted]);
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ maxWidth: 1000, mx: 'auto', my: 4, p: 3, display: 'flex', flexDirection: 'column', gap: 2, boxShadow: 3, borderRadius: 2 }}
        >
            <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={sites}
                onChange={(e, v) => setSites(v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const input = (e.target as HTMLInputElement).value.trim();
                        if (input && !sites.includes(input)) setSites([...sites, input]);
                        e.preventDefault();
                    }
                }}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                        const tagProps = getTagProps({ index });
                        // Extract the key from tagProps and pass it directly
                        const { key, ...otherProps } = tagProps;
                        return (
                            <Chip
                                key={key}
                                label={option}
                                variant="outlined"
                                {...otherProps}
                            />
                        );
                    })
                }
                renderInput={(params) => <TextField {...params} label="Websites" placeholder="Type and press enter (e.g. linkedin.com)" />}
            />

            <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={email}
                onChange={(e, v) => setEmail(v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const input = (e.target as HTMLInputElement).value;
                        addEmailDomain(input);
                        e.preventDefault();
                    }
                }}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            label={option}
                            variant="outlined"
                            {...getTagProps({ index })}
                        />
                    ))
                }
                renderInput={(params) => <TextField {...params} label="Email Domains" placeholder="Type and press enter (e.g. @gmail.com)" />}
            />

            <TextField
                label="Profession"
                value={profession}
                onChange={e => setProfession(e.target.value)}
                placeholder="e.g. realtor"
                fullWidth
            />

            <Autocomplete
                options={states}
                value={state}
                onChange={(e, v) => { setState(v || ''); setCity(''); }}
                renderInput={(params) => <TextField {...params} label="State" />}
            />

            <Autocomplete
                options={availableCities}
                value={city}
                onChange={(e, v) => setCity(v || '')}
                disabled={!state}
                renderInput={(params) => <TextField {...params} label="City" />}
            />

            <Autocomplete
                options={['OR', 'AND']}
                value={logic}
                onChange={(e, v) => setLogic(v as 'OR' | 'AND' || 'OR')}
                renderInput={(params) => <TextField {...params} label="Logic" />}
            />

            <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ mt: 2 }}
            >
                {loading ? 'Scraping...' : 'Scrape and Download (.csv)'}
            </Button>

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
