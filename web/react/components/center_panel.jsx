// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import TutorialIntroScreens from './tutorial/tutorial_intro_screens.jsx';
import CreatePost from './create_post.jsx';
import PostsViewContainer from './posts_view_container.jsx';
import PostFocusView from './post_focus_view.jsx';
import ChannelHeader from './channel_header.jsx';
import Navbar from './navbar/navbar.jsx';
import FileUploadOverlay from './file_upload_overlay.jsx';

import PreferenceStore from '../stores/preference_store.jsx';
import ChannelStore from '../stores/channel_store.jsx';
import UserStore from '../stores/user_store.jsx';

import * as Utils from '../utils/utils.jsx';

import Constants from '../utils/constants.jsx';
const TutorialSteps = Constants.TutorialSteps;
const Preferences = Constants.Preferences;

export default class CenterPanel extends React.Component {
    constructor(props) {
        super(props);

        this.onPreferenceChange = this.onPreferenceChange.bind(this);
        this.onChannelChange = this.onChannelChange.bind(this);

        const tutorialStep = PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999);
        this.state = {
            showTutorialScreens: tutorialStep === TutorialSteps.INTRO_SCREENS,
            showPostFocus: ChannelStore.getPostMode() === ChannelStore.POST_MODE_FOCUS
        };
    }
    componentDidMount() {
        PreferenceStore.addChangeListener(this.onPreferenceChange);
        ChannelStore.addChangeListener(this.onChannelChange);
    }
    componentWillUnmount() {
        PreferenceStore.removeChangeListener(this.onPreferenceChange);
        ChannelStore.removeChangeListener(this.onChannelChange);
    }
    onPreferenceChange() {
        const tutorialStep = PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999);
        this.setState({showTutorialScreens: tutorialStep <= TutorialSteps.INTRO_SCREENS});
    }
    onChannelChange() {
        this.setState({showPostFocus: ChannelStore.getPostMode() === ChannelStore.POST_MODE_FOCUS});
    }
    render() {
        const channel = ChannelStore.getCurrent();
        var handleClick = null;
        let postsContainer;
        let createPost;
        if (this.state.showTutorialScreens) {
            postsContainer = <TutorialIntroScreens />;
            createPost = null;
        } else if (this.state.showPostFocus) {
            postsContainer = <PostFocusView />;

            handleClick = function clickHandler(e) {
                e.preventDefault();
                Utils.switchChannel(channel);
            };

            createPost = (
                <div
                    id='archive-link-home'
                >
                    <a
                        href=''
                        onClick={handleClick}
                    >
                        {'You are viewing the Archives. Click here to jump to recent messages. '}
                        {<i className='fa fa-arrow-down'></i>}
                    </a>
                </div>
            );
        } else {
            postsContainer = <PostsViewContainer />;
            createPost = (
                <div
                    className='post-create__container'
                    id='post-create'
                >
                    <CreatePost />
                </div>
            );
        }

        return (
            <div className='inner__wrap channel__wrap'>
                <div className='row header'>
                    <div id='navbar'>
                        <Navbar/>
                    </div>
                </div>
                <div className='row main'>
                    <FileUploadOverlay
                        id='file_upload_overlay'
                        overlayType='center'
                    />
                    <div
                        id='app-content'
                        className='app__content'
                    >
                        <div id='channel-header'>
                            <ChannelHeader />
                        </div>
                        {postsContainer}
                        {createPost}
                    </div>
                </div>
            </div>
        );
    }
}

CenterPanel.defaultProps = {
};

CenterPanel.propTypes = {
};
