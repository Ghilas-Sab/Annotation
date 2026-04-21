import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import { AnnotationPage } from './pages/AnnotationPage'
import StatisticsPage from './pages/StatisticsPage'
import ExportPageRoute from './pages/ExportPageRoute'
import { ExportJobsProvider } from './contexts/ExportJobsContext'
import ExportJobsWidget from './components/exports/ExportJobsWidget'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function AnnotationPageRoute() {
  const { videoId = '' } = useParams<{ videoId: string }>()
  return <AnnotationPage videoId={videoId} />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExportJobsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/annotation/:videoId" element={<AnnotationPageRoute />} />
            <Route path="/statistics/:videoId" element={<StatisticsPage />} />
            <Route path="/export/:projectId" element={<ExportPageRoute />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
          <ExportJobsWidget />
        </BrowserRouter>
      </ExportJobsProvider>
    </QueryClientProvider>
  )
}

export default App
