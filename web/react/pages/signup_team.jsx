// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import TeamSignup from '../components/team_signup/team_signup.jsx';

function setupSignupTeamPage(props) {
    var teams = [];

    for (var prop in props) {
        if (props.hasOwnProperty(prop)) {
            if (prop !== 'Title') {
                teams.push({name: prop, display_name: props[prop]});
            }
        }
    }

    ReactDOM.render(
        <TeamSignup teams={teams} />,
        document.getElementById('signup-team')
    );
}

global.window.setup_signup_team_page = setupSignupTeamPage;
