import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { CareerDetailPage } from './pages/CareerDetailPage';
import { CareersPage } from './pages/CareersPage';
import { ContactPage } from './pages/ContactPage';
import { FuturePortalPage } from './pages/FuturePortalPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RequestProjectPage } from './pages/RequestProjectPage';
import { ServicesPage } from './pages/ServicesPage';
import { WorkerPage } from './pages/WorkerPage';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />} path="/">
        <Route index element={<HomePage />} />
        <Route element={<ServicesPage />} path="services" />
        <Route element={<ProjectsPage />} path="projects" />
        <Route element={<RequestProjectPage />} path="request-project" />
        <Route element={<CareersPage />} path="careers" />
        <Route element={<CareerDetailPage />} path="careers/:job" />
        <Route element={<AboutPage />} path="about" />
        <Route element={<ContactPage />} path="contact" />
        <Route element={<AuthPage />} path="auth" />
        <Route element={<AdminPage />} path="admin" />
        <Route element={<WorkerPage />} path="worker" />
        <Route element={<WorkspacePage />} path="projects/:projectId/workspace" />
        <Route element={<Navigate replace to="/" />} path="login" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
