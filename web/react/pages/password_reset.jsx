// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PasswordReset from '../components/password_reset.jsx';
import WhitePage from '../components/templates/white_page.jsx';

export default class PasswordResetPage extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
      var hash = this.props.location.query['h'];
      var data = this.props.location.query['d'];
      var isReset = !!(hash && data);

      var reset =
        <PasswordReset
            teamName={this.props.params.team}
            isReset={isReset}
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
