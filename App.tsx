import { createBrowserRouter, createHashRouter, Link, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ReportLayout } from './pages/ReportLayout';
import { OverviewTab } from './pages/report/OverviewTab';
import { IssuesTab } from './pages/report/IssuesTab';
import { ContrastTab } from './pages/report/ContrastTab';
import { StructureTab } from './pages/report/StructureTab';
import { KeyboardTab } from './pages/report/KeyboardTab';
import { PerformanceTab } from './pages/report/PerformanceTab';
import { ExportTab } from './pages/report/ExportTab';
import { HistoryPage } from './pages/HistoryPage';
import { ComparePage } from './pages/ComparePage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsProvider } from './lib/settings';
import { usePageTitle } from './lib/util';

function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="stack">
      <h1 tabIndex={-1}>Page not found</h1>
      <Link to="/">Go to the scanner</Link>
    </div>
  );
}

const createRouter = import.meta.env.VITE_GITHUB_PAGES === 'true' ? createHashRouter : createBrowserRouter;

const router = createRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        path: '/report/:id',
        element: <ReportLayout />,
        children: [
          { index: true, element: <OverviewTab /> },
          { path: 'issues', element: <IssuesTab /> },
          { path: 'contrast', element: <ContrastTab /> },
          { path: 'structure', element: <StructureTab /> },
          { path: 'keyboard', element: <KeyboardTab /> },
          { path: 'performance', element: <PerformanceTab /> },
          { path: 'export', element: <ExportTab /> },
        ],
      },
      { path: '/history', element: <HistoryPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return (
    <SettingsProvider>
      <RouterProvider router={router} />
    </SettingsProvider>
  );
}
