// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PostStore from '../../stores/post_store.jsx';
import ChannelStore from '../../stores/channel_store.jsx';
import UserProfile from '../user_profile.jsx';
import UserStore from '../../stores/user_store.jsx';
import AppDispatcher from '../../dispatcher/app_dispatcher.jsx';
import * as Utils from '../../utils/utils.jsx';
import Constants from '../../utils/constants.jsx';
import FileAttachmentList from '../file_attachment_list.jsx';
import * as Client from '../../utils/client.jsx';
import * as AsyncClient from '../../utils/async_client.jsx';
var ActionTypes = Constants.ActionTypes;
import * as TextFormatting from '../../utils/text_formatting.jsx';
import twemoji from 'twemoji';
import * as EventHelpers from '../../dispatcher/event_helpers.jsx';

export default class RhsComment extends React.Component {
    constructor(props) {
        super(props);

        this.retryComment = this.retryComment.bind(this);
        this.parseEmojis = this.parseEmojis.bind(this);

        this.state = {};
    }
    retryComment(e) {
        e.preventDefault();

        var post = this.props.post;
        Client.createPost(post, post.channel_id,
            (data) => {
                AsyncClient.getPosts(post.channel_id);

                var channel = ChannelStore.get(post.channel_id);
                var member = ChannelStore.getMember(post.channel_id);
                member.msg_count = channel.total_msg_count;
                member.last_viewed_at = (new Date()).getTime();
                ChannelStore.setChannelMember(member);

                AppDispatcher.handleServerAction({
                    type: ActionTypes.RECIEVED_POST,
                    post: data
                });
            },
            () => {
                post.state = Constants.POST_FAILED;
                PostStore.updatePendingPost(post);
                this.forceUpdate();
            }
        );

        post.state = Constants.POST_LOADING;
        PostStore.updatePendingPost(post);
        this.forceUpdate();
    }
    parseEmojis() {
        twemoji.parse(ReactDOM.findDOMNode(this), {size: Constants.EMOJI_SIZE});
    }
    componentDidMount() {
        this.parseEmojis();
    }
    shouldComponentUpdate(nextProps) {
        if (!Utils.areObjectsEqual(nextProps.post, this.props.post)) {
            return true;
        }

        return false;
    }
    componentDidUpdate() {
        this.parseEmojis();
    }
    createDropdown() {
        var post = this.props.post;

        if (post.state === Constants.POST_FAILED || post.state === Constants.POST_LOADING || post.state === Constants.POST_DELETED) {
            return '';
        }

        var isOwner = UserStore.getCurrentId() === post.user_id;
        var isAdmin = Utils.isAdmin(UserStore.getCurrentUser().roles);

        var dropdownContents = [];

        if (isOwner) {
            dropdownContents.push(
                <li
                    role='presentation'
                    key='edit-button'
                >
                    <a
                        href='#'
                        role='menuitem'
                        data-toggle='modal'
                        data-target='#edit_post'
                        data-refocusid='#reply_textbox'
                        data-title='Comment'
                        data-message={post.message}
                        data-postid={post.id}
                        data-channelid={post.channel_id}
                    >
                        {'Edit'}
                    </a>
                </li>
            );
        }

        if (isOwner || isAdmin) {
            dropdownContents.push(
                <li
                    role='presentation'
                    key='delete-button'
                >
                    <a
                        href='#'
                        role='menuitem'
                        onClick={() => EventHelpers.showDeletePostModal(post, 0)}
                    >
                        {'Delete'}
                    </a>
                </li>
            );
        }

        if (dropdownContents.length === 0) {
            return '';
        }

        return (
            <div className='dropdown'>
                <a
                    href='#'
                    className='post__dropdown dropdown-toggle'
                    type='button'
                    data-toggle='dropdown'
                    aria-expanded='false'
                />
                <ul
                    className='dropdown-menu'
                    role='menu'
                >
                    {dropdownContents}
                </ul>
            </div>
            );
    }
    render() {
        var post = this.props.post;

        var currentUserCss = '';
        if (UserStore.getCurrentId() === post.user_id) {
            currentUserCss = 'current--user';
        }

        var timestamp = UserStore.getCurrentUser().update_at;

        var loading;
        var postClass = '';
        if (post.state === Constants.POST_FAILED) {
            postClass += ' post-fail';
            loading = (
                <a
                    className='theme post-retry pull-right'
                    href='#'
                    onClick={this.retryComment}
                >
                    {'Retry'}
                </a>
            );
        } else if (post.state === Constants.POST_LOADING) {
            postClass += ' post-waiting';
            loading = (
                <img
                    className='post-loading-gif pull-right'
                    src='/static/images/load.gif'
                />
            );
        }

        var dropdown = this.createDropdown();

        var fileAttachment;
        if (post.filenames && post.filenames.length > 0) {
            fileAttachment = (
                <FileAttachmentList
                    filenames={post.filenames}
                    channelId={post.channel_id}
                    userId={post.user_id}
                />
            );
        }

        return (
            <div className={'post ' + currentUserCss}>
                <div className='post__content'>
                    <div className='post__img'>
                        <img
                            src={'/api/v1/users/' + post.user_id + '/image?time=' + timestamp + '&' + Utils.getSessionIndex()}
                            height='36'
                            width='36'
                        />
                    </div>
                    <div>
                        <ul className='post__header'>
                            <li className='col__name'>
                                <strong><UserProfile userId={post.user_id} /></strong>
                            </li>
                            <li className='col'>
                                <time className='post__time'>
                                    {Utils.displayCommentDateTime(post.create_at)}
                                </time>
                            </li>
                            <li className='col col__reply'>
                                {dropdown}
                            </li>
                        </ul>
                        <div className='post__body'>
                            <div className={postClass}>
                                {loading}
                                <div
                                    ref='message_holder'
                                    onClick={TextFormatting.handleClick}
                                    dangerouslySetInnerHTML={{__html: TextFormatting.formatText(post.message)}}
                                />
                            </div>
                            {fileAttachment}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

RhsComment.defaultProps = {
    post: null
};
RhsComment.propTypes = {
    post: React.PropTypes.object
};
