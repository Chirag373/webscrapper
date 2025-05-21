import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Chip,
    Button,
    List,
    ListItem,
    Paper,
    Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { ScrapedData, ScrapingStatus } from '@/utils/types';

interface ScrapingResultsProps {
    isRunning: boolean;
    completedTasks: number;
    totalTasks: number;
    currentTask: ScrapingStatus | null;
    scrapingHistory: ScrapingStatus[];
    recentlyScrapedData: ScrapedData[];
    handleDownload: (data: ScrapedData) => void;
}

export default function ScrapingResults({
    isRunning,
    completedTasks,
    totalTasks,
    currentTask,
    scrapingHistory,
    recentlyScrapedData,
    handleDownload
}: ScrapingResultsProps) {
    // Calculate progress percentage
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Group scraping results by profession and state
    const groupedResults = scrapingHistory.reduce<Record<string, Record<string, number>>>((acc, item) => {
        const key = `${item.profession}_${item.state}`;
        if (!acc[key]) {
            acc[key] = {
                totalEmails: 0,
                completedCities: 0,
                errorCities: 0
            };
        }
        
        if (item.status === 'completed') {
            acc[key].completedCities++;
            acc[key].totalEmails += item.emailsFound || 0;
        } else if (item.status === 'error') {
            acc[key].errorCities++;
        }
        
        return acc;
    }, {});
    
    return (
        <Box>
            {/* Current Progress */}
            {isRunning && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Current Progress</Typography>
                        
                        <Box sx={{ mb: 2 }}>
                            <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography variant="body2">{completedTasks} / {totalTasks} tasks</Typography>
                                <Typography variant="body2">{progress}%</Typography>
                            </Box>
                        </Box>
                        
                        {currentTask && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body1">
                                    Processing: {currentTask.profession} in {currentTask.city}, {currentTask.state}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Chip 
                                        label={`Status: ${currentTask.status}`} 
                                        color={currentTask.status === 'error' ? 'error' : 'primary'} 
                                        size="small" 
                                    />
                                    {currentTask.emailsFound > 0 && (
                                        <Chip 
                                            label={`Found: ${currentTask.emailsFound} emails`} 
                                            color="success" 
                                            size="small" 
                                        />
                                    )}
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {/* Downloadable Results */}
            {recentlyScrapedData.length > 0 && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Available Downloads</Typography>
                        
                        <List disablePadding>
                            {recentlyScrapedData.map((data, index) => (
                                <React.Fragment key={`${data.fileName}-${index}`}>
                                    {index > 0 && <Divider />}
                                    <ListItem
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            py: 1.5
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body1">
                                                {data.profession} - {data.state}
                                                {data.cityName && ` (${data.cityName})`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {data.totalEmailCount} email{data.totalEmailCount !== 1 ? 's' : ''} • {data.date}
                                            </Typography>
                                            {data.cityBreakdown && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {data.cityBreakdown}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<DownloadIcon />}
                                            onClick={() => handleDownload(data)}
                                        >
                                            Download
                                        </Button>
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}
            
            {/* Scraping Summary */}
            {Object.keys(groupedResults).length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Scraping Summary</Typography>
                        
                        <Box sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: 2 
                        }}>
                            {Object.entries(groupedResults).map(([key, stats]) => {
                                const [profession, state] = key.split('_');
                                return (
                                    <Box 
                                        key={key} 
                                        sx={{ 
                                            width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.333% - 16px)' },
                                            minWidth: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.333% - 16px)' } 
                                        }}
                                    >
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1">{profession}</Typography>
                                            <Typography variant="body2">{state}</Typography>
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="body2">
                                                    Total emails: <strong>{stats.totalEmails}</strong>
                                                </Typography>
                                                <Typography variant="body2">
                                                    Successful cities: <strong>{stats.completedCities}</strong>
                                                </Typography>
                                                {stats.errorCities > 0 && (
                                                    <Typography variant="body2" color="error.main">
                                                        Failed cities: <strong>{stats.errorCities}</strong>
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Paper>
                                    </Box>
                                );
                            })}
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
} 