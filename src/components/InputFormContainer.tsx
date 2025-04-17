import React, { useState } from "react";
import {
    Autocomplete,
    Chip,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    CircularProgress,
    Snackbar,
    Alert
} from "@mui/material";
import { handleFormSubmit } from "@/utils/formHandlers";

export default function InputFormContainer() {
    const [site, setSite] = useState('');
    const [email, setEmail] = useState<string[]>([]);
    const [profession, setProfession] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [logic, setLogic] = useState('OR');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await handleFormSubmit({ site, email, profession, city, state, logic });

            if (result && result.success) {
                setNotification({
                    open: true,
                    message: `Successfully scraped ${result.emailCount} email addresses!`,
                    severity: 'success'
                });
            } else {
                setNotification({
                    open: true,
                    message: result?.error || 'Failed to scrape emails',
                    severity: 'error'
                });
            }
        } catch (error) {
            setNotification({
                open: true,
                message: error instanceof Error ? error.message : 'An unknown error occurred',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const addEmailDomain = (domain: string) => {
        if (!domain) return;

        let formattedDomain = domain.trim();
        if (!formattedDomain.startsWith('@')) {
            formattedDomain = `@${formattedDomain}`;
        }

        if (!email.includes(formattedDomain)) {
            setEmail([...email, formattedDomain]);
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                maxWidth: 1000,
                margin: "auto",
                marginTop: "2rem",
                marginBottom: "2rem",
                padding: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                boxShadow: 3,
                borderRadius: 2,
            }}
        >
            <TextField
                id="site"
                label="Site"
                variant="outlined"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. site:instagram.com"
                fullWidth
            />

            <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={email}
                onChange={(event, newValue: string[]) => setEmail(newValue)}
                onInputChange={(event, value, reason) => {
                    if (value) {
                        return value;
                    }
                    return '';
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        const inputElement = event.target as HTMLInputElement;
                        if (inputElement.value) {
                            addEmailDomain(inputElement.value);
                            event.preventDefault();
                        }
                    }
                }}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                        const tagProps = getTagProps({ index });
                        const { key, ...chipProps } = tagProps;

                        return (
                            <Chip
                                key={key} 
                                label={option}
                                variant="outlined"
                                {...chipProps} 
                            />
                        );
                    })
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        label="Email Domains"
                        placeholder="Type and press enter (e.g. @gmail.com)"
                    />
                )}
            />

            <TextField
                id="profession"
                label="Profession"
                variant="outlined"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. realtor"
                fullWidth
            />

            <TextField
                id="city"
                label="City"
                variant="outlined"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Dallas"
                fullWidth
            />

            <TextField
                id="state"
                label="State"
                variant="outlined"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Texas"
                fullWidth
            />

            <FormControl fullWidth>
                <InputLabel id="logic-label">Logic</InputLabel>
                <Select
                    labelId="logic-label"
                    id="logic"
                    value={logic}
                    label="Logic"
                    onChange={(e) => setLogic(e.target.value as string)}
                >
                    <MenuItem value="OR">OR</MenuItem>
                    <MenuItem value="AND">AND</MenuItem>
                </Select>
            </FormControl>

            <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
                {loading ? 'Scraping...' : 'Scrape and Download (.csv)'}
            </Button>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.severity}
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}