import { Login } from 'pages/auth/login';
import { Cropper } from 'pages/cropper';
import { Layout } from 'pages/layout';
import { NotfoundPage } from 'pages/not-found';
import { createBrowserRouter } from 'react-router';

export const routes = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Cropper />,
      },
    ],
  },
  {
    path: '*',
    element: <NotfoundPage />,
  },
  {
    path: 'login',
    element: <Login />,
  },
]);
