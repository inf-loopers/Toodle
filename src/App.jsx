import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import AppRoutes from './routes/AppRoutes';
import { setupAuthInterceptor } from './api/client';

function App() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  // Wire the Auth0 token getter into the axios client once auth is ready
  useEffect(() => {
    setupAuthInterceptor(getAccessTokenSilently);
  }, [getAccessTokenSilently, isAuthenticated]);

  return <AppRoutes />;
}

export default App;