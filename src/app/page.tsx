"use client"

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { CircularProgress, Box } from '@mui/material';
import ErrorBoundary from '@/components/ErrorBoundary';
import Navbar from "@/components/Navbar";

// Enhanced loading component
const LoadingFallback = () => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '80vh'
  }}>
    <CircularProgress size={60} thickness={4} />
    <Box sx={{ mt: 3, fontWeight: 'medium' }}>Loading web scraper...</Box>
  </Box>
);

// Dynamic import with loading state and no SSR for better performance
const AutomatedScraperContainer = dynamic(
  () => import('@/components/AutomatedScraperContainer'),
  {
    loading: () => <LoadingFallback />,
    ssr: false
  }
);

export default function Home() {
  return (
    <ErrorBoundary>
      <Navbar />
      <Suspense fallback={<LoadingFallback />}>
        <AutomatedScraperContainer />
      </Suspense>
    </ErrorBoundary>
  );
}