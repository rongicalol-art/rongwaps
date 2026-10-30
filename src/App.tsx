import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { LoadingScreen } from './lib/widgets/LoadingScreen';
import { useAuth } from './hooks/useAuth';
import { legalPageFromPathname } from './app/routes';
import { LazyLandingPage } from './screens/landing/LazyLandingPage';
import { takeFolderReturn } from './utils/browser/shareLink';

const AppShell = lazy(() => import('./app/AppShell'));
const LegalScreen = lazy(() => import('./screens/legal').then((m) => ({ default: m.LegalScreen })));
const JoinFolderSignIn = lazy(() => import('./screens/join-folder/JoinFolderSignIn').then((m) => ({ default: m.JoinFolderSignIn })));

/** Auth and legal pages never load the study workspace or start cloud sync. */
export default function App() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!currentUser) return;
    const path = takeFolderReturn();
    if (path) navigate(path, { replace: true });
  }, [currentUser, navigate]);

  return <Suspense fallback={<LoadingScreen message="Loading Ron's Mandarin…" fullScreen />}>
    <Routes>
      <Route path="/join/:id" element={<JoinFolderEntry />} />
      <Route path="*" element={<RegularApp pathname={location.pathname} />} />
    </Routes>
  </Suspense>;
}

function JoinFolderEntry() {
  const { id = '' } = useParams();
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Opening shared folder…" fullScreen />;
  if (!currentUser) return <JoinFolderSignIn code={id} />;
  return <AppShell />;
}

function RegularApp({ pathname }: { pathname: string }) {
  const legalPage = legalPageFromPathname(pathname);
  return legalPage ? <LegalScreen page={legalPage} /> : <AuthenticatedWorkspace />;
}

function AuthenticatedWorkspace() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Loading Ron's Mandarin…" fullScreen />;
  if (!currentUser && !import.meta.env.DEV) return <LazyLandingPage />;
  return <AppShell />;
}
