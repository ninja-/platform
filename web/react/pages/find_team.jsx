// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import FindTeam from '../components/find_team.jsx';
import WhitePage from '../components/templates/white_page.jsx';

export default class FindTeamPage extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
      return (
        <WhitePage>
            <FindTeam/>
        </WhitePage>
      );
    }
}
