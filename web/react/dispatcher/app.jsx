// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import * as Utils from '../utils/utils.jsx';
// TODO import react-router
export default class App extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return this.props.children;
    }
}
