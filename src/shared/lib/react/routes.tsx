import { Cropper } from 'pages/cropper';
// import { IDScannerPro } from 'pages/passport';
import { createBrowserRouter } from 'react-router';

export const routes = createBrowserRouter([
  {
    path: '/',
    element: <Cropper />,
  },
  // {
  //   path: '/passport',
  //   element: <IDScannerPro />,
  // },
]);
