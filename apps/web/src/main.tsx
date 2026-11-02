import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import './styles.css';
import { App } from './App';
const client=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:60000}}});
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><App/></QueryClientProvider>);
