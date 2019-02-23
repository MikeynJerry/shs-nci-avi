import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes';
import App from './containers/App';
import HomePage from './containers/HomePage';
import TrialPage from './containers/TrialPage';

export default () => (
  <App>
    <Switch>
      <Route path={routes.TRIAL} component={TrialPage} />
      <Route path={routes.HOME} component={HomePage} />
    </Switch>
  </App>
);
