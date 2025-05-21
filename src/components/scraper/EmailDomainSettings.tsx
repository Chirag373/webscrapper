import React, { useState, KeyboardEvent } from 'react';
import { Box, TextField, Button, Chip, Typography } from '@mui/material';

// Default email domains that are pre-populated
const DEFAULT_EMAIL_DOMAINS = ["@gmail.com", "@yahoo.com", "@hotmail.com"];

interface EmailDomainSettingsProps {
    customEmailDomains: string[];
    setCustomEmailDomains: (domains: string[]) => void;
    disabled?: boolean;
}

export default function EmailDomainSettings({
    customEmailDomains,
    setCustomEmailDomains,
    disabled = false
}: EmailDomainSettingsProps) {
    const [customEmailDomain, setCustomEmailDomain] = useState('');
    
    // Format and add a new email domain to the list
    const addEmailDomain = () => {
        if (!customEmailDomain) return;
        
        let formatted = customEmailDomain.trim();
        if (!formatted.startsWith('@')) {
            formatted = `@${formatted}`;
        }
        
        if (!customEmailDomains.includes(formatted)) {
            setCustomEmailDomains([...customEmailDomains, formatted]);
            setCustomEmailDomain('');
        }
    };
    
    // Handle keyboard events (Enter to add domain)
    const handleEmailKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmailDomain();
        }
    };
    
    // Remove a domain from the list
    const removeEmailDomain = (domain: string) => {
        setCustomEmailDomains(customEmailDomains.filter(d => d !== domain));
    };
    
    return (
        <Box>
            <Typography variant="subtitle1">Email Domains:</Typography>
            
            {/* Default domains (shown as non-removable) */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {DEFAULT_EMAIL_DOMAINS.map(domain => (
                    <Chip
                        key={domain}
                        label={domain}
                        color="primary"
                        variant="outlined"
                        disabled={disabled}
                    />
                ))}
            </Box>
            
            {/* Custom domains (can be removed) */}
            {customEmailDomains.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {customEmailDomains.map(domain => (
                        <Chip
                            key={domain}
                            label={domain}
                            variant="outlined"
                            color="secondary"
                            onDelete={() => removeEmailDomain(domain)}
                            disabled={disabled}
                        />
                    ))}
                </Box>
            )}
            
            {/* Add new domain input */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    label="Add Email Domain"
                    placeholder="e.g., @company.com"
                    value={customEmailDomain}
                    onChange={(e) => setCustomEmailDomain(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    fullWidth
                    disabled={disabled}
                    size="small"
                />
                <Button
                    variant="outlined"
                    onClick={addEmailDomain}
                    sx={{ minWidth: '100px' }}
                    disabled={disabled || !customEmailDomain}
                >
                    Add
                </Button>
            </Box>
        </Box>
    );
} 