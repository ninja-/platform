// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PasswordResetSendLink from './password_reset_send_link.jsx';
import PasswordResetForm from './password_reset_form.jsx';

export default class PasswordReset extends React.Component {
    constructor(props) {
        super(props);

        this.state = {};
    }
    render() {
        if (!this.props.isReset) {
            return (
                <PasswordResetSendLink
                    teamDisplayName={this.props.teamDisplayName}
                    teamName={this.props.teamName}
                />
            );
        }

        return (
            <PasswordResetForm
                teamDisplayName={this.props.teamDisplayName}
                teamName={this.props.teamName}
                hash={this.props.hash}
                data={this.props.data}
            />
        );
    }
}

PasswordReset.defaultProps = {
    isReset: '',
    teamName: '',
    teamDisplayName: '',
    hash: '',
    data: ''
};
PasswordReset.propTypes = {
    isReset: React.PropTypes.bool,
    teamName: React.PropTypes.string,
    teamDisplayName: React.PropTypes.string,
    hash: React.PropTypes.string,
    data: React.PropTypes.string
};
