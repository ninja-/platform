// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import NewChannelFlow from '../new_channel_flow.jsx';
import MoreDirectChannels from '../more_direct_channels.jsx';
import SidebarHeader from './sidebar_header.jsx';
import UnreadChannelIndicator from '../unread_channel_indicator.jsx';
import TutorialTip from '../tutorial/tutorial_tip.jsx';

import ChannelStore from '../../stores/channel_store.jsx';
import UserStore from '../../stores/user_store.jsx';
import TeamStore from '../../stores/team_store.jsx';
import PreferenceStore from '../../stores/preference_store.jsx';
import SidebarChannel from './sidebar_channel.jsx';

import * as Utils from '../../utils/utils.jsx';

import Constants from '../../utils/constants.jsx';
const Preferences = Constants.Preferences;
const TutorialSteps = Constants.TutorialSteps;

const Tooltip = ReactBootstrap.Tooltip;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;

export default class Sidebar extends React.Component {
    constructor(props) {
        super(props);

        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;

        this.getStateFromStores = this.getStateFromStores.bind(this);

        this.onChange = this.onChange.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.updateUnreadIndicators = this.updateUnreadIndicators.bind(this);
        this.handleResize = this.handleResize.bind(this);

        this.showNewChannelModal = this.showNewChannelModal.bind(this);
        this.hideNewChannelModal = this.hideNewChannelModal.bind(this);
        this.showMoreDirectChannelsModal = this.showMoreDirectChannelsModal.bind(this);
        this.hideMoreDirectChannelsModal = this.hideMoreDirectChannelsModal.bind(this);

        this.createElements = this.createElements.bind(this);
        this.updateTitle = this.updateTitle.bind(this);

        this.isLeaving = new Map();
        this.loadingDMChannel = -1;

        this.showNewChannelModalO = this.showNewChannelModal.bind(this, 'O');
        this.showNewChannelModalP = this.showNewChannelModal.bind(this, 'P');

        const state = this.getStateFromStores();
        state.newChannelModalType = '';
        state.showDirectChannelsModal = false;
        state.mobile = Utils.windowWidth() < 768;
        this.state = state;
    }
    getTotalUnreadCount() {
        let msgs = 0;
        let mentions = 0;
        const unreadCounts = this.state.unreadCounts;

        Object.keys(unreadCounts).forEach((chId) => {
            msgs += unreadCounts[chId].msgs;
            mentions += unreadCounts[chId].mentions;
        });

        return {msgs, mentions};
    }
    getStateFromStores() {
        const members = ChannelStore.getAllMembers();
        const currentChannelId = ChannelStore.getCurrentId();
        const currentUserId = UserStore.getCurrentId();

        const channels = Object.assign([], ChannelStore.getAll());
        channels.sort(this.sortChannelsByDisplayName);

        const publicChannels = channels.filter((channel) => channel.type === Constants.OPEN_CHANNEL);
        const privateChannels = channels.filter((channel) => channel.type === Constants.PRIVATE_CHANNEL);

        const preferences = PreferenceStore.getCategory(Constants.Preferences.CATEGORY_DIRECT_CHANNEL_SHOW);

        const directChannels = [];
        for (const preference of preferences) {
            if (preference.value !== 'true') {
                continue;
            }

            const teammateId = preference.name;

            let directChannel = channels.find(Utils.isDirectChannelForUser.bind(null, teammateId));

            // a direct channel doesn't exist yet so create a fake one
            if (!directChannel) {
                directChannel = {
                    name: Utils.getDirectChannelName(currentUserId, teammateId),
                    last_post_at: 0,
                    total_msg_count: 0,
                    type: Constants.DM_CHANNEL,
                    fake: true
                };
            }

            directChannel.display_name = Utils.displayUsername(teammateId);
            directChannel.teammate_id = teammateId;
            directChannel.status = UserStore.getStatus(teammateId);

            directChannels.push(directChannel);
        }

        directChannels.sort(this.sortChannelsByDisplayName);

        const hiddenDirectChannelCount = UserStore.getActiveOnlyProfileList(true).length - directChannels.length;

        const tutorialStep = PreferenceStore.getInt(Preferences.TUTORIAL_STEP, UserStore.getCurrentId(), 999);

        const unreads = ChannelStore.getUnreadCounts();

        return {
            activeId: currentChannelId,
            members,
            publicChannels,
            privateChannels,
            directChannels,
            hiddenDirectChannelCount,
            unreadCounts: unreads,
            showTutorialTip: tutorialStep === TutorialSteps.CHANNEL_POPOVER
        };
    }

    componentDidMount() {
        ChannelStore.addChangeListener(this.onChange);
        UserStore.addChangeListener(this.onChange);
        UserStore.addStatusesChangeListener(this.onChange);
        TeamStore.addChangeListener(this.onChange);
        PreferenceStore.addChangeListener(this.onChange);

        this.updateTitle();
        this.updateUnreadIndicators();

        window.addEventListener('resize', this.handleResize);

        if ($(window).width() > 768) {
            $('.nav-pills__container').perfectScrollbar();
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (!Utils.areObjectsEqual(nextState, this.state)) {
            return true;
        }
        return false;
    }
    componentDidUpdate() {
        this.updateTitle();
        this.updateUnreadIndicators();
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);

        ChannelStore.removeChangeListener(this.onChange);
        UserStore.removeChangeListener(this.onChange);
        UserStore.removeStatusesChangeListener(this.onChange);
        TeamStore.removeChangeListener(this.onChange);
        PreferenceStore.removeChangeListener(this.onChange);
    }
    handleResize() {
        this.setState({
            windowWidth: Utils.windowWidth(),
            windowHeight: Utils.windowHeight()
        });
    }
    onChange() {
        this.setState(this.getStateFromStores());
    }
    updateTitle() {
        const channel = ChannelStore.getCurrent();
        if (channel) {
            let currentSiteName = '';
            if (global.window.mm_config.SiteName != null) {
                currentSiteName = global.window.mm_config.SiteName;
            }

            let currentChannelName = channel.display_name;
            if (channel.type === 'D') {
                currentChannelName = Utils.getDirectTeammate(channel.id).username;
            }

            const unread = this.getTotalUnreadCount();
            const mentionTitle = unread.mentions > 0 ? '(' + unread.mentions + ') ' : '';
            const unreadTitle = unread.msgs > 0 ? '* ' : '';
            document.title = mentionTitle + unreadTitle + currentChannelName + ' - ' + TeamStore.getCurrent().display_name + ' ' + currentSiteName;

            var href = '';
            if (unread.mentions > 0) {
                href = '/static/images/redfavicon.ico';
            } else {
                href = '/static/images/favicon.ico';
            }
            if (this.lastIcon !== href) {
                document.getElementById('favicon').href = href;
                this.lastIcon = href;
            }
        }
    }
    onScroll() {
        this.updateUnreadIndicators();
    }
    updateUnreadIndicators() {
        const container = $(ReactDOM.findDOMNode(this.refs.container));

        var showTopUnread = false;
        var showBottomUnread = false;

        if (this.firstUnreadChannel) {
            var firstUnreadElement = $(ReactDOM.findDOMNode(this.refs[this.firstUnreadChannel]));

            if (firstUnreadElement.position().top + firstUnreadElement.height() < 0) {
                showTopUnread = true;
            }
        }

        if (this.lastUnreadChannel) {
            var lastUnreadElement = $(ReactDOM.findDOMNode(this.refs[this.lastUnreadChannel]));

            if (lastUnreadElement.position().top > container.height()) {
                showBottomUnread = true;
            }
        }

        this.setState({
            showTopUnread,
            showBottomUnread
        });
    }

    sortChannelsByDisplayName(a, b) {
        return (a.display_name < b.display_name? -1 : (a.display_name > b.display_name ? 1 : 0)); //eslint-disable-line
    }

    showNewChannelModal(type) {
        this.setState({newChannelModalType: type});
    }
    hideNewChannelModal() {
        this.setState({newChannelModalType: ''});
    }

    showMoreDirectChannelsModal() {
        this.setState({showDirectChannelsModal: true});
    }
    hideMoreDirectChannelsModal() {
        this.setState({showDirectChannelsModal: false});
    }

    createTutorialTip() {
        const screens = [];

        screens.push(
            <div>
                <h4>{'Channels'}</h4>
                <p><strong>{'Channels'}</strong>{' organize conversations across different topics. They’re open to everyone on your team. To send private communications use '}<strong>{'Direct Messages'}</strong>{' for a single person or '}<strong>{'Private Groups'}</strong>{' for multiple people.'}
                </p>
            </div>
        );

        screens.push(
            <div>
                <h4>{'"Town Square" and "Off-Topic" channels'}</h4>
                <p>{'Here are two public channels to start:'}</p>
                <p>
                    <strong>{'Town Square'}</strong>{' is a place for team-wide communication. Everyone in your team is a member of this channel.'}
                </p>
                <p>
                    <strong>{'Off-Topic'}</strong>{' is a place for fun and humor outside of work-related channels. You and your team can decide what other channels to create.'}
                </p>
            </div>
        );

        screens.push(
            <div>
                <h4>{'Creating and Joining Channels'}</h4>
                <p>
                    {'Click '}<strong>{'"More..."'}</strong>{' to create a new channel or join an existing one.'}
                </p>
                <p>
                    {'You can also create a new channel or private group by clicking the '}<strong>{'"+" symbol'}</strong>{' next to the channel or private group header.'}
                </p>
            </div>
        );

        return (
            <TutorialTip
                placement='right'
                screens={screens}
                overlayClass='tip-overlay--sidebar'
            />
        );
    }

    createElements(channels) {
        const members = this.state.members;
        const activeId = this.state.activeId;
        const unreadCounts = this.state.unreadCounts;
        const emptyCount = {msgs: 0, mentions: 0};

        const elem = [];

        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            const channelMember = members[channel.id];
            const unreadCount = unreadCounts[channel.id] || emptyCount;
            let tutorialTip = null;
            if (this.state.showTutorialTip && channel.name === Constants.DEFAULT_CHANNEL) {
                tutorialTip = this.createTutorialTip();
            }

            const isActive = (activeId === channel.id);
            const key = channel.id || channel.name; // fake direct channels doesn't have an id YET

            elem.push(
               <SidebarChannel
                   members={channelMember}
                   tutorialTip={tutorialTip}
                   active={isActive}
                   unreadCount={unreadCount}
                   channel={channel}
                   key={key}
                   sidebar={this}
               />
             );
        }

        return elem;
    }
    render() {
        // keep track of the first and last unread channels so we can use them to set the unread indicators
        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;

        // create elements for all 3 types of channels
        const publicChannelItems = this.createElements(this.state.publicChannels);
        const privateChannelItems = this.createElements(this.state.privateChannels);

        const directMessageItems = this.createElements(this.state.directChannels);

        var directMessageMore = null;
        if (this.state.hiddenDirectChannelCount > 0) {
            directMessageMore = (
                <li key='more'>
                    <a
                        href='#'
                        onClick={this.showMoreDirectChannelsModal}
                    >
                        {'More (' + this.state.hiddenDirectChannelCount + ')'}
                    </a>
                </li>
            );
        }

        let showChannelModal = false;
        if (this.state.newChannelModalType !== '') {
            showChannelModal = true;
        }

        const createChannelTootlip = (
            <Tooltip id='new-channel-tooltip' >{'Create new channel'}</Tooltip>
        );
        const createGroupTootlip = (
            <Tooltip id='new-group-tooltip'>{'Create new group'}</Tooltip>
        );

        const currentTeam = TeamStore.getCurrent();

        return (
            <div>
                <NewChannelFlow
                    show={showChannelModal}
                    channelType={this.state.newChannelModalType}
                    onModalDismissed={this.hideNewChannelModal}
                />
                <MoreDirectChannels
                    show={this.state.showDirectChannelsModal}
                    onModalDismissed={this.hideMoreDirectChannelsModal}
                />

                <SidebarHeader
                    teamDisplayName={currentTeam.display_name}
                    teamName={currentTeam.name}
                    teamType={currentTeam.type}
                />

                <UnreadChannelIndicator
                    show={this.state.showTopUnread}
                    extraClass='nav-pills__unread-indicator-top'
                    text={'Unread post(s) above'}
                />
                <UnreadChannelIndicator
                    show={this.state.showBottomUnread}
                    extraClass='nav-pills__unread-indicator-bottom'
                    text={'Unread post(s) below'}
                />

                <div
                    ref='container'
                    className='nav-pills__container'
                    onScroll={this.onScroll}
                >
                    <ul className='nav nav-pills nav-stacked'>
                        <li>
                            <h4>
                                {'Channels'}
                                <OverlayTrigger
                                    delayShow={500}
                                    placement='top'
                                    overlay={createChannelTootlip}
                                >
                                <a
                                    className='add-channel-btn'
                                    href='#'
                                    onClick={this.showNewChannelModalO}
                                >
                                    {'+'}
                                </a>
                                </OverlayTrigger>
                            </h4>
                        </li>
                        {publicChannelItems}
                        <li>
                            <a
                                href='#'
                                data-toggle='modal'
                                className='nav-more'
                                data-target='#more_channels'
                                data-channeltype='O'
                            >
                                {'More...'}
                            </a>
                        </li>
                    </ul>

                    <ul className='nav nav-pills nav-stacked'>
                        <li>
                            <h4>
                                {'Private Groups'}
                                <OverlayTrigger
                                    delayShow={500}
                                    placement='top'
                                    overlay={createGroupTootlip}
                                >
                                <a
                                    className='add-channel-btn'
                                    href='#'
                                    onClick={this.showNewChannelModalP}
                                >
                                    {'+'}
                                </a>
                                </OverlayTrigger>
                            </h4>
                        </li>
                        {privateChannelItems}
                    </ul>
                    <ul className='nav nav-pills nav-stacked'>
                        <li><h4>{'Direct Messages'}</h4></li>
                        {directMessageItems}
                        {directMessageMore}
                    </ul>
                </div>
            </div>
        );
    }
}

Sidebar.defaultProps = {
};
Sidebar.propTypes = {
};
