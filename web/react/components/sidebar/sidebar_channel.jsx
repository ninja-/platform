// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import ChannelStore from '../../stores/channel_store.jsx';
import TeamStore from '../../stores/team_store.jsx';
import PreferenceStore from '../../stores/preference_store.jsx';

import * as AsyncClient from '../../utils/async_client.jsx';
import * as Client from '../../utils/client.jsx';
import * as Utils from '../../utils/utils.jsx';

import Constants from '../../utils/constants.jsx';

const Tooltip = ReactBootstrap.Tooltip;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;

// This component represents a clickable channel link and it's unread badge as part of the sidebar component.

export default class SidebarChannel extends React.Component {
    constructor(props) {
        super(props);

        this.badgesActive = false;
        this.firstUnreadChannel = null;
        this.lastUnreadChannel = null;
        this.state = {};

        this.sidebar = props.sidebar;
        this.handleClick = this.handleClick.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleLeaveDirectChannel = this.handleLeaveDirectChannel.bind(this);
    }

    componentDidMount() {

    }
    shouldComponentUpdate(nextProps, nextState) {
        if (this.props.active !== nextProps.isActive) {
            return true;
        }
        if (!Utils.areObjectsEqual(nextProps, this.props)) {
            return true;
        }
        if (!Utils.areObjectsEqual(nextState, this.state)) {
            return true;
        }

        return false;
    }
    componentDidUpdate() {

    }
    componentWillUnmount() {

    }

    // handles click on our channel
    handleClick(e) {
        const channel = this.props.channel;

        if (e.target.attributes.getNamedItem('data-close')) {
            this.handleClose(e);
        } else if (channel.fake) {
            this.handleClickFake(channel);
        } else {
            Utils.switchChannel(channel);
        }

        e.preventDefault();
    }

    handleClickFake(channel) {
        // create the direct message channel, if fake
        var otherUserId = Utils.getUserIdFromChannelName(channel);

        if (this.sidebar.loadingDMChannel === -1) {
            this.setState({isLoadingDM: true});
            this.sidebar.loadingDMChannel = channel.id;

            Client.createDirectChannel(channel, otherUserId,
                (data) => {
                    this.setState({isLoadingDM: false});
                    this.sidebar.loadingDMChannel = -1;
                    AsyncClient.getChannel(data.id);
                    Utils.switchChannel(data);
                },
                () => {
                    // unknown error happened
                    this.setState({isLoadingDM: false});
                    this.sidebar.loadingDMChannel = -1;

                    window.location.href = TeamStore.getCurrentTeamUrl() + '/channels/' + channel.name;
                }
            );
        }
    }
    handleClose(e) {
        if (this.props.channel.type === 'D') {
            this.handleLeaveDirectChannel(this.props.channel);
        }

        e.preventDefault();
    }

    handleLeaveDirectChannel(channel) {
        // keep in mind that this is the only way to quit direct channels
        // (via this component function)

        const isLeaving = this.sidebar.isLeaving;

        if (!isLeaving.get(channel.id)) {
            isLeaving.set(channel.id, true);

            const preference = PreferenceStore.setPreference(Constants.Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, channel.teammate_id, 'false');

            // bypass AsyncClient since we've already saved the updated preferences
            Client.savePreferences(
                [preference],
                () => {
                    isLeaving.set(channel.id, false);
                },
                () => {
                    isLeaving.set(channel.id, false);
                }
            );

            PreferenceStore.emitChange(); // let the SideBar remove the closed
        }

        if (this.props.active) {
            Utils.switchChannel(ChannelStore.getByName(Constants.DEFAULT_CHANNEL));
        }
    }

    render() {
        const channel = this.props.channel;
        const active = this.props.active;
        const channelMember = this.props.members;
        const unreadCount = this.props.unreadCount;
        let msgCount;

        let linkClass = '';
        if (active) {
            linkClass = 'active';
        }

        let rowClass = 'sidebar-channel';

        var unread = false;
        if (channelMember) {
            msgCount = unreadCount.msgs + unreadCount.mentions;
            unread = msgCount > 0 || channelMember.mention_count > 0;
        }

        if (unread) {
            rowClass += ' unread-title';

            if (!active) {
                if (!this.firstUnreadChannel) {
                    this.firstUnreadChannel = channel.name;
                }
                this.lastUnreadChannel = channel.name;
            }
        }

        var badge = null;
        if (channelMember && unreadCount.mentions) {
            badge = <span className='badge pull-right small'>{unreadCount.mentions}</span>;
        } else if (this.state.isLoadingDM && channel.type === 'D') {
            badge = (
                <img
                    className='channel-loading-gif pull-right'
                    src='/static/images/load.gif'
                />
            );
        }

        if (msgCount > 0) {
            rowClass += ' has-badge';
        }

        // set up status icon for direct message channels
        var status = null;
        if (channel.type === 'D') {
            var statusIcon = '';
            if (channel.status === 'online') {
                statusIcon = Constants.ONLINE_ICON_SVG;
            } else if (channel.status === 'away') {
                statusIcon = Constants.ONLINE_ICON_SVG;
            } else {
                statusIcon = Constants.OFFLINE_ICON_SVG;
            }
            status = (
                <span
                    className='status'
                    dangerouslySetInnerHTML={{__html: statusIcon}}
                />
            );
        }

        var href = '#';

        var icon = null;
        if (channel.type === 'O') {
            icon = <div className='status'><i className='fa fa-globe'></i></div>;
        } else if (channel.type === 'P') {
            icon = <div className='status'><i className='fa fa-lock'></i></div>;
        }

        let closeButton = null;
        const removeTooltip = (
            <Tooltip id='remove-dm-tooltip'>{'Remove from list'}</Tooltip>
        );
        if (channel.type === 'D' && !badge) {
            closeButton = (
                <OverlayTrigger
                    delayShow={1000}
                    placement='top'
                    overlay={removeTooltip}
                >
                <span
                    className='btn-close'
                    data-close='true'
                    onClick={this.handleClose}
                >
                    {'×'}
                </span>
                </OverlayTrigger>
            );

            rowClass += ' has-close';
        }

        let tutorialTip = this.state.tutorialTip;

        return (
            <li
                ref={channel.name}
                className={linkClass}
            >
                <a
                    className={rowClass}
                    href={href}
                    onClick={this.handleClick}
                >
                    {icon}
                    {status}
                    {channel.display_name}
                    {badge}
                    {closeButton}
                </a>
                {tutorialTip}
            </li>
        );
    }
}

SidebarChannel.defaultProps = {
};
SidebarChannel.propTypes = {
    sidebar: React.PropTypes.object,
    channel: React.PropTypes.object,
    members: React.PropTypes.object,
    active: React.PropTypes.bool,
    unreadCount: React.PropTypes.object
};
