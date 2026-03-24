import { Suspense } from 'react';
import { RouterProvider as Provider } from 'react-router-dom';

import GlobalLoading from '@/pages/loading';

import { router } from './router';
import { RouterContext } from './router-context';

export const RouterProvider = () => {
  return (
    <RouterContext.Provider value={router}>
      <Suspense fallback={<GlobalLoading />}>
        <Provider router={router.reactRouter} />
      </Suspense>
    </RouterContext.Provider>
  );
};
