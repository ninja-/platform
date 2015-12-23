// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import SidebarHeaderDropdown from './sidebar_header_dropdown.jsx';
import TutorialTip from '../tutorial/tutorial_tip.jsx';

import UserStore from '../../stores/user_store.jsx';
import PreferenceStore from '../../stores/preference_store.jsx';

import * as Utils from '../../utils/utils.jsx';
import Constants from '../../utils/constants.jsx';
const Preferences = Constants.Preferences;
const TutorialSteps = Constants.TutorialSteps;

const Tooltip = ReactBootstrap.Tooltip;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;

export default class SidebarHeader extends React.Component {
    constructor(props) {
        super(props);

        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.onPreferenceChange = this.onPreferenceChange.bind(this);

        this.state = this.getStateFromStores();
    }
    componentDidMount() {
        PreferenceStore.addChangeListener(this.onPreferenceChange);
    }
    componentWillUnmount() {
        PreferenceStore.removeChangeListener(this.onPreferenceChange);
    }
    getStateFromStores() {
        const tutorialStep = PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999);

        return {showTutorialTip: tutorialStep === TutorialSteps.MENU_POPOVER};
    }
    onPreferenceChange() {
        this.setState(this.getStateFromStores());
    }
    toggleDropdown(e) {
        e.preventDefault();
        if (this.refs.dropdown.blockToggle) {
            this.refs.dropdown.blockToggle = false;
            return;
        }
        $('.team__header').find('.dropdown-toggle').dropdown('toggle');
    }
    createTutorialTip() {
        const screens = [];

        screens.push(
            <div>
                <h4>{'Main Menu'}</h4>
                <p>
                {'The '}<strong>{'Main Menu'}</strong>{' is where you can '}
                <strong>{'Invite New Members'}</strong>
                {', access your '}
                <strong>{'Account Settings'}</strong>
                {' and set your '}<strong>{'Theme Color'}</strong>{'.'}
                </p>
                <p>
                {'Team administrators can also access their '}<strong>{'Team Settings'}</strong>{' from this menu.'}
                </p>
                <p>
                {'System administrators will find a '}<strong>{'System Console'}</strong>{' option to administrate the entire system.'}
                </p>
            </div>
        );

        return (
            <div
                onClick={this.toggleDropdown}
            >
                <TutorialTip
                    ref='tip'
                    placement='right'
                    screens={screens}
                    overlayClass='tip-overlay--header'
                />
            </div>
        );
    }
    render() {
        var me = UserStore.getCurrentUser();
        var profilePicture = null;

        if (!me) {
            return null;
        }

        if (me.last_picture_update) {
            profilePicture = (
                <img
                    className='user__picture'
                    src={'/api/v1/users/' + me.id + '/image?time=' + me.update_at + '&' + Utils.getSessionIndex()}
                />
            );
        }

        let tutorialTip = null;
        if (this.state.showTutorialTip) {
            tutorialTip = this.createTutorialTip();
        }

        return (
            <div className='team__header theme'>
                {tutorialTip}
                <a
                    href='#'
                    onClick={this.toggleDropdown}
                >
                    {profilePicture}
                    <div className='header__info'>
                        <div className='user__name'>{'@' + me.username}</div>
                        <OverlayTrigger
                            trigger={['hover', 'focus']}
                            delayShow={1000}
                            placement='bottom'
                            overlay={<Tooltip id='team-name__tooltip'>{this.props.teamDisplayName}</Tooltip>}
                            ref='descriptionOverlay'
                        >
                        <div className='team__name'>{this.props.teamDisplayName}</div>
                        </OverlayTrigger>
                    </div>
                </a>
                <SidebarHeaderDropdown
                    ref='dropdown'
                    teamType={this.props.teamType}
                    teamDisplayName={this.props.teamDisplayName}
                    teamName={this.props.teamName}
                />
            </div>
        );
    }
}

SidebarHeader.defaultProps = {
    teamDisplayName: global.window.mm_config.SiteName,
    teamType: ''
};
SidebarHeader.propTypes = {
    teamDisplayName: React.PropTypes.string,
    teamName: React.PropTypes.string,
    teamType: React.PropTypes.string
};
