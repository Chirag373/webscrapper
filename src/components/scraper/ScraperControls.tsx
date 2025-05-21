import React from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
    Divider,
    Tooltip,
    IconButton,
    Switch,
    Paper
} from "@mui/material";
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { NotificationState } from '@/utils/types';

// Default sites for scraping
const DEFAULT_SITES = [
    "site:facebook.com",
    "site:linkedin.com",
    "site:twitter.com",
    "site:instagram.com",
    "site:yelp.com",
    "site:angieslist.com",
    "site:homeadvisor.com",
    "site:thumbtack.com"
];

interface ScraperControlsProps {
    selectedProfessions: string[];
    selectedStates: string[];
    selectedSites: string[];
    isGeneralSearch: boolean;
    isRunning: boolean;
    totalTasks: number;
    completedTasks: number;
    professionCategories: string[];
    allStates: string[];
    
    toggleProfession: (profession: string) => void;
    toggleState: (state: string) => void;
    toggleSite: (site: string) => void;
    selectAllProfessions: () => void;
    clearAllProfessions: () => void;
    selectAllStates: () => void;
    clearAllStates: () => void;
    selectAllSites: () => void;
    clearAllSites: () => void;
    startScraping: () => void;
    setIsGeneralSearch: (value: boolean) => void;
    setNotification: (notification: NotificationState) => void;
}

export default function ScraperControls({
    selectedProfessions,
    selectedStates,
    selectedSites,
    isGeneralSearch,
    isRunning,
    totalTasks,
    completedTasks,
    professionCategories,
    allStates,
    toggleProfession,
    toggleState,
    toggleSite,
    selectAllProfessions,
    clearAllProfessions,
    selectAllStates,
    clearAllStates,
    selectAllSites,
    clearAllSites,
    startScraping,
    setIsGeneralSearch,
    setNotification
}: ScraperControlsProps) {
    const handleStart = () => {
        if (selectedProfessions.length === 0 || selectedStates.length === 0) {
            setNotification({
                open: true,
                message: 'Please select at least one profession and one state',
                severity: 'error'
            });
            return;
        }

        if (!isGeneralSearch && selectedSites.length === 0) {
            setNotification({
                open: true,
                message: 'Please select at least one site to search or enable general search',
                severity: 'error'
            });
            return;
        }
        
        startScraping();
    };
    
    return (
        <Box sx={{ mb: 4 }}>
            <Card>
                <CardContent>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Automated Email Scraper
                    </Typography>
                    
                    {/* General Search Toggle */}
                    <Box sx={{ mb: 3 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isGeneralSearch}
                                    onChange={(e) => setIsGeneralSearch(e.target.checked)}
                                    disabled={isRunning}
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body1">General Search</Typography>
                                    <Tooltip title="Search across all websites instead of specific ones. This may find more emails but can be less targeted.">
                                        <IconButton size="small">
                                            <InfoOutlined fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            }
                        />
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        mb: 3
                    }}>
                        {/* Professions Section */}
                        <Box sx={{ flex: 1, width: { xs: '100%', md: '33%' } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1">Professions ({selectedProfessions.length})</Typography>
                                <Box>
                                    <Button 
                                        size="small" 
                                        onClick={selectAllProfessions} 
                                        disabled={isRunning}
                                        sx={{ minWidth: 'auto', mr: 1 }}
                                    >
                                        All
                                    </Button>
                                    <Button 
                                        size="small" 
                                        onClick={clearAllProfessions} 
                                        disabled={isRunning}
                                        sx={{ minWidth: 'auto' }}
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            </Box>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    height: '200px', 
                                    overflowY: 'auto',
                                    p: 1
                                }}
                            >
                                <List dense disablePadding>
                                    {professionCategories.map((profession, idx) => (
                                        <ListItem 
                                            key={profession}
                                            sx={{ 
                                                py: 0, 
                                                borderBottom: idx < professionCategories.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                                            }}
                                            disablePadding
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Checkbox 
                                                        checked={selectedProfessions.includes(profession)}
                                                        onChange={() => toggleProfession(profession)}
                                                        disabled={isRunning}
                                                        size="small"
                                                    />
                                                }
                                                label={profession}
                                                sx={{ width: '100%' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Box>

                        {/* States Section */}
                        <Box sx={{ flex: 1, width: { xs: '100%', md: '33%' } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1">States ({selectedStates.length})</Typography>
                                <Box>
                                    <Button 
                                        size="small" 
                                        onClick={selectAllStates} 
                                        disabled={isRunning}
                                        sx={{ minWidth: 'auto', mr: 1 }}
                                    >
                                        All
                                    </Button>
                                    <Button 
                                        size="small" 
                                        onClick={clearAllStates} 
                                        disabled={isRunning}
                                        sx={{ minWidth: 'auto' }}
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            </Box>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    height: '200px', 
                                    overflowY: 'auto',
                                    p: 1
                                }}
                            >
                                <List dense disablePadding>
                                    {allStates.map((state, idx) => (
                                        <ListItem 
                                            key={state}
                                            sx={{ 
                                                py: 0, 
                                                borderBottom: idx < allStates.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                                            }}
                                            disablePadding
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Checkbox 
                                                        checked={selectedStates.includes(state)}
                                                        onChange={() => toggleState(state)}
                                                        disabled={isRunning}
                                                        size="small"
                                                    />
                                                }
                                                label={state}
                                                sx={{ width: '100%' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Box>

                        {/* Sites Section */}
                        <Box sx={{ flex: 1, width: { xs: '100%', md: '33%' } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1">
                                    Sites ({selectedSites.length})
                                    {isGeneralSearch && ' - Disabled'}
                                </Typography>
                                <Box>
                                    <Button 
                                        size="small" 
                                        onClick={selectAllSites} 
                                        disabled={isRunning || isGeneralSearch}
                                        sx={{ minWidth: 'auto', mr: 1 }}
                                    >
                                        All
                                    </Button>
                                    <Button 
                                        size="small" 
                                        onClick={clearAllSites} 
                                        disabled={isRunning || isGeneralSearch}
                                        sx={{ minWidth: 'auto' }}
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            </Box>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    height: '200px', 
                                    overflowY: 'auto',
                                    p: 1,
                                    opacity: isGeneralSearch ? 0.5 : 1,
                                    pointerEvents: isGeneralSearch ? 'none' : 'auto'
                                }}
                            >
                                <List dense disablePadding>
                                    {DEFAULT_SITES.map((site, idx) => (
                                        <ListItem 
                                            key={site}
                                            sx={{ 
                                                py: 0, 
                                                borderBottom: idx < DEFAULT_SITES.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                                            }}
                                            disablePadding
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Checkbox 
                                                        checked={selectedSites.includes(site)}
                                                        onChange={() => toggleSite(site)}
                                                        disabled={isRunning || isGeneralSearch}
                                                        size="small"
                                                    />
                                                }
                                                label={site.replace('site:', '')}
                                                sx={{ width: '100%' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                            {isRunning 
                                ? `Processing: ${completedTasks} of ${totalTasks} tasks completed` 
                                : `Total tasks: ${totalTasks}`}
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleStart}
                            disabled={isRunning}
                            sx={{ px: 4 }}
                        >
                            Start Scraping
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
} 