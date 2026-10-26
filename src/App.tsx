import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { LoadingScreen } from './lib/widgets/LoadingScreen';
import { useAuth } from './hooks/useAuth';
import { legalPageFromPathname } from './app/routes';
import { SignInWindow } from './screens/auth';
import { takeFolderReturn } from './utils/browser/shareLink';

const AppShell = lazy(() => import('./app/AppShell'));
const LegalScreen = lazy(() => import('./screens/legal').then((m) => ({ default: m.LegalScreen })));
const SharedFolderSignIn = lazy(() => import('./screens/shared-folder').then((m) => ({ default: m.SharedFolderSignIn })));

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
      <Route path="/s/:id" element={<SharedFolderEntry />} />
      <Route path="/join/:id" element={<SharedFolderEntry joining />} />
      <Route path="*" element={<RegularApp pathname={location.pathname} />} />
    </Routes>
  </Suspense>;
}

function SharedFolderEntry({ joining = false }: { joining?: boolean }) {
  const { id = '' } = useParams();
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Opening shared folder…" fullScreen />;
  if (!currentUser) return <SharedFolderSignIn shareId={id} returnPath={joining ? `/join/${id}` : undefined} />;
  return <AppShell />;
}

function RegularApp({ pathname }: { pathname: string }) {
  const legalPage = legalPageFromPathname(pathname);
  return legalPage ? <LegalScreen page={legalPage} /> : <AuthenticatedWorkspace />;
}

function AuthenticatedWorkspace() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Loading Ron's Mandarin…" fullScreen />;
  if (!currentUser && !import.meta.env.DEV) return <SignInWindow />;
  return <AppShell />;
}
