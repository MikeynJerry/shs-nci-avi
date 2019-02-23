import React, { Component } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import type { Store } from '../reducers/types';
import Routes from '../Routes';

export default class Root extends Component {
  render() {
    return (
      <Router>
        <Routes />
      </Router>
    );
  }
}
