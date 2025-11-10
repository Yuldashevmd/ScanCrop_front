import { Cropper } from 'pages/cropper';
import { Layout } from 'pages/layout';
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
]);
