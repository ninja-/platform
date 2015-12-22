// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import TeamSignupComplete from '../components/team_signup/team_signup_complete.jsx';

function setupSignupTeamCompletePage(props) {
    ReactDOM.render(
        <TeamSignupComplete
            email={props.Email}
            hash={props.Hash}
            data={props.Data}
        />,
        document.getElementById('signup-team-complete')
    );
}

global.window.setup_signup_team_complete_page = setupSignupTeamCompletePage;
