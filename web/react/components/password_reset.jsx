// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PasswordResetSendLink from './password_reset_send_link.jsx';
import PasswordResetForm from './password_reset_form.jsx';
import * as Client from '../utils/client.jsx';

export default class PasswordReset extends React.Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    componentWillMount() {
        this.setState({isLoading: true})
        Client.fetchPublicTeamMetadata(this.props.teamName, (result) =>
            this.setState({isLoading: false, teamDisplayName: result.display_name, siteName: result.site_name})
        );
    }

    render() {
        console.log(this.state)
        if (!this.props.isReset) {
            return (
                <PasswordResetSendLink
                    teamDisplayName={this.state.teamDisplayName || this.props.teamDisplayName}
                    siteName={this.state.siteName || "Mattermost"}
                    teamName={this.props.teamName}
                />
            );
        }

        return (
            <PasswordResetForm
              teamDisplayName={this.state.teamDisplayName || this.props.teamDisplayName}
                teamName={this.props.teamName}
                hash={this.props.hash}
                data={this.props.data}
                siteName={this.state.siteName || "Mattermost"}
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
