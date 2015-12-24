// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

package api

import (
	l4g "code.google.com/p/log4go"
	"github.com/gorilla/mux"
	"github.com/mattermost/platform/model"
	"github.com/mattermost/platform/utils"
	"github.com/mattermost/platform/store"
	"net/http"
	"strings"
)

func InitWebhook(r *mux.Router) {
	l4g.Debug("Initializing webhook api routes")

	sr := r.PathPrefix("/hooks").Subrouter()
	sr.Handle("/incoming/create", ApiUserRequired(createIncomingHook)).Methods("POST")
	sr.Handle("/incoming/delete", ApiUserRequired(deleteIncomingHook)).Methods("POST")
	sr.Handle("/incoming/list", ApiUserRequired(getIncomingHooks)).Methods("GET")

	sr.Handle("/outgoing/create", ApiUserRequired(createOutgoingHook)).Methods("POST")
	sr.Handle("/outgoing/regen_token", ApiUserRequired(regenOutgoingHookToken)).Methods("POST")
	sr.Handle("/outgoing/delete", ApiUserRequired(deleteOutgoingHook)).Methods("POST")
	sr.Handle("/outgoing/list", ApiUserRequired(getOutgoingHooks)).Methods("GET")

	// above client api calls are prefixed with /api/v1/hooks
 	// while the incoming hook handling is simply on /hooks/{:id}

	mainrouter := Srv.Router
	mainrouter.Handle("/hooks/{id:[A-Za-z0-9]+}", ApiAppHandler(incomingWebhook)).Methods("POST")
}

func createIncomingHook(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableIncomingWebhooks {
		c.Err = model.NewAppError("createIncomingHook", "Incoming webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	c.LogAudit("attempt")

	hook := model.IncomingWebhookFromJson(r.Body)

	if hook == nil {
		c.SetInvalidParam("createIncomingHook", "webhook")
		return
	}

	cchan := Srv.Store.Channel().Get(hook.ChannelId)
	pchan := Srv.Store.Channel().CheckPermissionsTo(c.Session.TeamId, hook.ChannelId, c.Session.UserId)

	hook.UserId = c.Session.UserId
	hook.TeamId = c.Session.TeamId

	var channel *model.Channel
	if result := <-cchan; result.Err != nil {
		c.Err = result.Err
		return
	} else {
		channel = result.Data.(*model.Channel)
	}

	if !c.HasPermissionsToChannel(pchan, "createIncomingHook") {
		if channel.Type != model.CHANNEL_OPEN || channel.TeamId != c.Session.TeamId {
			c.LogAudit("fail - bad channel permissions")
			return
		}
	}

	if result := <-Srv.Store.Webhook().SaveIncoming(hook); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		c.LogAudit("success")
		rhook := result.Data.(*model.IncomingWebhook)
		w.Write([]byte(rhook.ToJson()))
	}
}

func deleteIncomingHook(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableIncomingWebhooks {
		c.Err = model.NewAppError("deleteIncomingHook", "Incoming webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	c.LogAudit("attempt")

	props := model.MapFromJson(r.Body)

	id := props["id"]
	if len(id) == 0 {
		c.SetInvalidParam("deleteIncomingHook", "id")
		return
	}

	if result := <-Srv.Store.Webhook().GetIncoming(id); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		if c.Session.UserId != result.Data.(*model.IncomingWebhook).UserId && !c.IsTeamAdmin() {
			c.LogAudit("fail - inappropriate permissions")
			c.Err = model.NewAppError("deleteIncomingHook", "Inappropriate permissions to delete incoming webhook", "user_id="+c.Session.UserId)
			return
		}
	}

	if err := (<-Srv.Store.Webhook().DeleteIncoming(id, model.GetMillis())).Err; err != nil {
		c.Err = err
		return
	}

	c.LogAudit("success")
	w.Write([]byte(model.MapToJson(props)))
}

func getIncomingHooks(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableIncomingWebhooks {
		c.Err = model.NewAppError("getIncomingHooks", "Incoming webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	if result := <-Srv.Store.Webhook().GetIncomingByUser(c.Session.UserId); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		hooks := result.Data.([]*model.IncomingWebhook)
		w.Write([]byte(model.IncomingWebhookListToJson(hooks)))
	}
}

func createOutgoingHook(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableOutgoingWebhooks {
		c.Err = model.NewAppError("createOutgoingHook", "Outgoing webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	c.LogAudit("attempt")

	hook := model.OutgoingWebhookFromJson(r.Body)

	if hook == nil {
		c.SetInvalidParam("createOutgoingHook", "webhook")
		return
	}

	hook.CreatorId = c.Session.UserId
	hook.TeamId = c.Session.TeamId

	if len(hook.ChannelId) != 0 {
		cchan := Srv.Store.Channel().Get(hook.ChannelId)
		pchan := Srv.Store.Channel().CheckPermissionsTo(c.Session.TeamId, hook.ChannelId, c.Session.UserId)

		var channel *model.Channel
		if result := <-cchan; result.Err != nil {
			c.Err = result.Err
			return
		} else {
			channel = result.Data.(*model.Channel)
		}

		if channel.Type != model.CHANNEL_OPEN {
			c.LogAudit("fail - not open channel")
		}

		if !c.HasPermissionsToChannel(pchan, "createOutgoingHook") {
			if channel.Type != model.CHANNEL_OPEN || channel.TeamId != c.Session.TeamId {
				c.LogAudit("fail - bad channel permissions")
				return
			}
		}
	} else if len(hook.TriggerWords) == 0 {
		c.Err = model.NewAppError("createOutgoingHook", "Either trigger_words or channel_id must be set", "")
		return
	}

	if result := <-Srv.Store.Webhook().SaveOutgoing(hook); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		c.LogAudit("success")
		rhook := result.Data.(*model.OutgoingWebhook)
		w.Write([]byte(rhook.ToJson()))
	}
}

func getOutgoingHooks(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableOutgoingWebhooks {
		c.Err = model.NewAppError("getOutgoingHooks", "Outgoing webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	if result := <-Srv.Store.Webhook().GetOutgoingByCreator(c.Session.UserId); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		hooks := result.Data.([]*model.OutgoingWebhook)
		w.Write([]byte(model.OutgoingWebhookListToJson(hooks)))
	}
}

func deleteOutgoingHook(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableIncomingWebhooks {
		c.Err = model.NewAppError("deleteOutgoingHook", "Outgoing webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	c.LogAudit("attempt")

	props := model.MapFromJson(r.Body)

	id := props["id"]
	if len(id) == 0 {
		c.SetInvalidParam("deleteIncomingHook", "id")
		return
	}

	if result := <-Srv.Store.Webhook().GetOutgoing(id); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		if c.Session.UserId != result.Data.(*model.OutgoingWebhook).CreatorId && !c.IsTeamAdmin() {
			c.LogAudit("fail - inappropriate permissions")
			c.Err = model.NewAppError("deleteOutgoingHook", "Inappropriate permissions to delete outcoming webhook", "user_id="+c.Session.UserId)
			return
		}
	}

	if err := (<-Srv.Store.Webhook().DeleteOutgoing(id, model.GetMillis())).Err; err != nil {
		c.Err = err
		return
	}

	c.LogAudit("success")
	w.Write([]byte(model.MapToJson(props)))
}

func regenOutgoingHookToken(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableIncomingWebhooks {
		c.Err = model.NewAppError("regenOutgoingHookToken", "Outgoing webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	c.LogAudit("attempt")

	props := model.MapFromJson(r.Body)

	id := props["id"]
	if len(id) == 0 {
		c.SetInvalidParam("regenOutgoingHookToken", "id")
		return
	}

	var hook *model.OutgoingWebhook
	if result := <-Srv.Store.Webhook().GetOutgoing(id); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		hook = result.Data.(*model.OutgoingWebhook)

		if c.Session.UserId != hook.CreatorId && !c.IsTeamAdmin() {
			c.LogAudit("fail - inappropriate permissions")
			c.Err = model.NewAppError("regenOutgoingHookToken", "Inappropriate permissions to regenerate outcoming webhook token", "user_id="+c.Session.UserId)
			return
		}
	}

	hook.Token = model.NewId()

	if result := <-Srv.Store.Webhook().UpdateOutgoing(hook); result.Err != nil {
		c.Err = result.Err
		return
	} else {
		w.Write([]byte(result.Data.(*model.OutgoingWebhook).ToJson()))
	}
}

func incomingWebhook(c *Context, w http.ResponseWriter, r *http.Request) {
	if !utils.Cfg.ServiceSettings.EnableIncomingWebhooks {
		c.Err = model.NewAppError("incomingWebhook", "Incoming webhooks have been disabled by the system admin.", "")
		c.Err.StatusCode = http.StatusNotImplemented
		return
	}

	params := mux.Vars(r)
	id := params["id"]

	hchan := Srv.Store.Webhook().GetIncoming(id)

	r.ParseForm()

	var parsedRequest *model.IncomingWebhookRequest
	if r.Header.Get("Content-Type") == "application/json" {
		parsedRequest = model.IncomingWebhookRequestFromJson(r.Body)
	} else {
		parsedRequest = model.IncomingWebhookRequestFromJson(strings.NewReader(r.FormValue("payload")))
	}

	if parsedRequest == nil {
		c.Err = model.NewAppError("incomingWebhook", "Unable to parse incoming data", "")
		return
	}

	text := parsedRequest.Text
	if len(text) == 0 && parsedRequest.Attachments == nil {
		c.Err = model.NewAppError("incomingWebhook", "No text specified", "")
		return
	}

	channelName := parsedRequest.ChannelName
	webhookType := parsedRequest.Type

	//attachments is in here for slack compatibility
	if parsedRequest.Attachments != nil {
		if len(parsedRequest.Props) == 0 {
			parsedRequest.Props = make(model.StringInterface)
		}
		parsedRequest.Props["attachments"] = parsedRequest.Attachments
		webhookType = model.POST_SLACK_ATTACHMENT
	}

	var hook *model.IncomingWebhook
	if result := <-hchan; result.Err != nil {
		c.Err = model.NewAppError("incomingWebhook", "Invalid webhook", "err="+result.Err.Message)
		return
	} else {
		hook = result.Data.(*model.IncomingWebhook)
	}

	var channel *model.Channel
	var cchan store.StoreChannel

	if len(channelName) != 0 {
		if channelName[0] == '@' {
			if result := <-Srv.Store.User().GetByUsername(hook.TeamId, channelName[1:]); result.Err != nil {
				c.Err = model.NewAppError("incomingWebhook", "Couldn't find the user", "err="+result.Err.Message)
				return
			} else {
				channelName = model.GetDMNameFromIds(result.Data.(*model.User).Id, hook.UserId)
			}
		} else if channelName[0] == '#' {
			channelName = channelName[1:]
		}

		cchan = Srv.Store.Channel().GetByName(hook.TeamId, channelName)
	} else {
		cchan = Srv.Store.Channel().Get(hook.ChannelId)
	}

	overrideUsername := parsedRequest.Username
	overrideIconUrl := parsedRequest.IconURL

	if result := <-cchan; result.Err != nil {
		c.Err = model.NewAppError("incomingWebhook", "Couldn't find the channel", "err="+result.Err.Message)
		return
	} else {
		channel = result.Data.(*model.Channel)
	}

	pchan := Srv.Store.Channel().CheckPermissionsTo(hook.TeamId, channel.Id, hook.UserId)

	// create a mock session
	c.Session = model.Session{UserId: hook.UserId, TeamId: hook.TeamId, IsOAuth: false}

	if !c.HasPermissionsToChannel(pchan, "createIncomingHook") && channel.Type != model.CHANNEL_OPEN {
		c.Err = model.NewAppError("incomingWebhook", "Inappropriate channel permissions", "")
		return
	}

	if _, err := CreateWebhookPost(c, channel.Id, text, overrideUsername, overrideIconUrl, parsedRequest.Props, webhookType); err != nil {
		c.Err = err
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("ok"))
}
