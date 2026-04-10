import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectsPage from './pages/ProjectsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <ProjectsPage />
      </div>
    </QueryClientProvider>
  )
}

export default App
