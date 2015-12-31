// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PasswordReset from '../components/password_reset.jsx';
import WhitePage from '../components/templates/white_page.jsx';
function setupPasswordResetPage(props) {
    ReactDOM.render(
        <PasswordReset
            isReset={props.IsReset}
            teamDisplayName={props.TeamDisplayName}
            teamName={props.TeamName}
            hash={props.Hash}
            data={props.Data}
        />,
        document.getElementById('reset')
    );
}

global.window.setup_password_reset_page = setupPasswordResetPage;

export default class PasswordResetPage extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
      var hash = this.props.location.query['h'];
      var data = this.props.location.query['d'];
      var isReset = (hash && data);

      var reset =
        <PasswordReset
            teamName={this.props.params.team}
            isReset={isReset}
            teamDisplayName={'Cool team'}
            hash={hash}
            data={data}
        />;

      return (
        <WhitePage>
            {reset}
        </WhitePage>
      );
    }
}
