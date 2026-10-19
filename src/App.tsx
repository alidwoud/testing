import React from 'react';
import { JobProvider } from './context/JobContext.tsx';
import { JobLayout } from './components/jobs/JobLayout.tsx';

export default function App() {
  return (
    <JobProvider>
      <JobLayout />
    </JobProvider>
  );
}
