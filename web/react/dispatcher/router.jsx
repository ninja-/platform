// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import * as Utils from '../utils/utils.jsx';

// TODO import react-router

var Router = ReactRouter.Router
var Route = ReactRouter.Route
var Link = ReactRouter.Link
var IndexRoute = ReactRouter.Link
var browserHistory = ReactRouter.browserHistory

import PasswordResetPage from '../pages/password_reset.jsx';
import FindTeamPage from '../pages/find_team.jsx';
import App from './app.jsx';


export default class MattermostRouter extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        console.log("page");
        console.log(App);
        console.log(PasswordResetPage);
        return (
          <Router history={browserHistory}>

            <Route path="/" component={App}>
              <Route path="/:team/reset_password" component={PasswordResetPage}/>
              <Route path="/find_team" component={FindTeamPage}/>
            </Route>
          </Router>
        );
    }
}

function setupUnified() {
    ReactDOM.render(
    <MattermostRouter/>,
    document.getElementById('app')
);

}

window.setupUnifiedClient = setupUnified;
