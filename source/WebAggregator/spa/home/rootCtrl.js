(function (app) {
    "use strict";

    app.controller("rootCtrl", rootCtrl);

    rootCtrl.$inject = ["$scope", "$location", "membershipService", "$rootScope", "hotkeys", "ngDialog", "apiService", "systemConfig", "notificationService"];

    function rootCtrl($scope, $location, membershipService, $rootScope, hotkeys, ngDialog, apiService, systemConfig, notificationService) {

        var serviceBase = systemConfig.BaseUrl;

        $scope.$on("Keepalive", function () {
            // do something to keep the user's session alive

            if (membershipService.isUserLoggedIn())
                membershipService.refreshToken();
        });

        $scope.$on("IdleTimeout", function () {
            // the user has timed out (meaning idleDuration + timeout has passed without any activity)
            // this is where you'd log them
            console.log('IdleTimeout');
            if (membershipService.isUserLoggedIn())
                logout();

        });

        //SipCallBegin
        $scope.sipSettings = systemConfig.sipSettings;

        //begin

        //var sTransferNumber;
        //var oRingTone, oRingbackTone;
        var oSipStack, oSipSessionRegister, oSipSessionCall, oSipSessionTransferCall;
        //var videoRemote, videoLocal,
        var audioRemote;
        var oNotifICall;
        //var bDisableVideo = false;
        var viewVideoLocal, viewVideoRemote; // viewLocalScreencast; // <video> (webrtc) or <div> (webrtc4all)
        var oConfigCall;
        var oReadyStateTimer;
        var divCallCtrl, btnCall, btnHangUp, txtPhoneNumber, txtCallStatus, btnMute, divCallOptions, btnHoldResume, btnTransfer, txtRegStatus;

        function sipGlobalInit() {

            window.console && window.console.info && window.console.info("location=" + window.location);

            divCallCtrl = document.getElementById("divCallCtrl");
            btnCall = document.getElementById("btnCall");
            btnHangUp = document.getElementById("btnHangUp");
            txtPhoneNumber = document.getElementById("txtPhoneNumber");
            txtCallStatus = document.getElementById("txtCallStatus");
            btnMute = document.getElementById("btnMute");
            divCallOptions = document.getElementById("divCallOptions");
            btnHoldResume = document.getElementById("btnHoldResume");
            btnTransfer = document.getElementById("btnTransfer");
            txtRegStatus = document.getElementById("txtRegStatus");
            divCallCtrl.onmousemove = onDivCallCtrlMouseMove;

            // set debug level
            SIPml.setDebugLevel((window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

            var getPVal = function (pName) {
                var query = window.location.search.substring(1);
                var vars = query.split('&');
                for (var i = 0; i < vars.length; i++) {
                    var pair = vars[i].split('=');
                    if (decodeURIComponent(pair[0]) === pName) {
                        return decodeURIComponent(pair[1]);
                    }
                }
                return null;
            }

            var preInit = function () {
                // set default webrtc type (before initialization)
                var s_webrtc_type = getPVal("wt");
                var s_fps = getPVal("fps");
                var s_mvs = getPVal("mvs"); // maxVideoSize
                var s_mbwu = getPVal("mbwu"); // maxBandwidthUp (kbps)
                var s_mbwd = getPVal("mbwd"); // maxBandwidthUp (kbps)
                var s_za = getPVal("za"); // ZeroArtifacts
                var s_ndb = getPVal("ndb"); // NativeDebug

                if (s_webrtc_type) SIPml.setWebRtcType(s_webrtc_type);

                // initialize SIPML5
                SIPml.init(postInit);

                // set other options after initialization
                if (s_fps) SIPml.setFps(parseFloat(s_fps));
                if (s_mvs) SIPml.setMaxVideoSize(s_mvs);
                if (s_mbwu) SIPml.setMaxBandwidthUp(parseFloat(s_mbwu));
                if (s_mbwd) SIPml.setMaxBandwidthDown(parseFloat(s_mbwd));
                if (s_za) SIPml.setZeroArtifacts(s_za === "true");
                if (s_ndb == "true") SIPml.startNativeDebug();

                //var rinningApps = SIPml.getRunningApps();
                //var _rinningApps = Base64.decode(rinningApps);
                //tsk_utils_log_info(_rinningApps);
            }

            oReadyStateTimer = setInterval(function () {
                if (document.readyState === "complete") {
                    clearInterval(oReadyStateTimer);
                    // initialize SIPML5
                    preInit();
                }
            },
            500);
        }

        function postInit() {
            // check for WebRTC support
            if (!SIPml.isWebRtcSupported()) {
                // is it chrome?
                if (SIPml.getNavigatorFriendlyName() == 'chrome') {
                    if (confirm("You're using an old Chrome version or WebRTC is not enabled.\nDo you want to see how to enable WebRTC?")) {
                        window.location = 'http://www.webrtc.org/running-the-demos';
                    }
                    else {
                        window.location = "index.html";
                    }
                    return;
                }
                else {
                    if (confirm("webrtc-everywhere extension is not installed. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.")) {
                        window.location = 'https://github.com/sarandogou/webrtc-everywhere';
                    }
                    else {
                        // Must do nothing: give the user the chance to accept the extension
                        // window.location = "index.html";
                    }
                }
            }

            // checks for WebSocket support
            if (!SIPml.isWebSocketSupported()) {
                if (confirm('Your browser don\'t support WebSockets.\nDo you want to download a WebSocket-capable browser?')) {
                    window.location = 'https://www.google.com/intl/en/chrome/browser/';
                }
                else {
                    window.location = "index.html";
                }
                return;
            }

            if (!SIPml.isWebRtcSupported()) {
                if (confirm('Your browser don\'t support WebRTC.\naudio/video calls will be disabled.\nDo you want to download a WebRTC-capable browser?')) {
                    window.location = 'https://www.google.com/intl/en/chrome/browser/';
                }
            }

            document.body.style.cursor = 'default';
            oConfigCall = {
                audio_remote: audioRemote,
                video_local: viewVideoLocal,
                video_remote: viewVideoRemote,
                screencast_window_id: 0x00000000, // entire desktop
                bandwidth: { audio: undefined, video: undefined },
                video_size: { minWidth: undefined, minHeight: undefined, maxWidth: undefined, maxHeight: undefined },
                events_listener: { events: '*', listener: onSipEventSession },
                sip_caps: [
                                { name: '+g.oma.sip-im' },
                                { name: 'language', value: '\"en,fr\"' }
                ]
            };
        }

        // sends SIP REGISTER request to login
        function sipRegister() {
            // catch exception for IE (DOM not ready)
            try {

                //  $scope.sipSettings.PrivateIdentity;
                //  $scope.sipSettings.PublicIdentity;
                //  $scope.sipSettings.Password;
                //  $scope.sipSettings.Realm;


                if (!$scope.sipSettings.Realm || !$scope.sipSettings.PrivateIdentity || !$scope.sipSettings.PublicIdentity) {
                    txtRegStatus.innerHTML = '<b>Please fill madatory fields (*)</b>';
                    return;
                }
                var o_impu = tsip_uri.prototype.Parse($scope.sipSettings.PublicIdentity);
                if (!o_impu || !o_impu.s_user_name || !o_impu.s_host) {
                    txtRegStatus.innerHTML = "<b>[" + $scope.sipSettings.PublicIdentity + "] is not a valid Public identity</b>";
                    return;
                }

                // enable notifications if not already done
                if (window.webkitNotifications && window.webkitNotifications.checkPermission() != 0) {
                    window.webkitNotifications.requestPermission();
                }


                // update debug level to be sure new values will be used if the user haven't updated the page
                SIPml.setDebugLevel((window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

                // create SIP stack
                oSipStack = new SIPml.Stack({
                    realm: $scope.sipSettings.Realm,
                    impi: $scope.sipSettings.PrivateIdentity,
                    impu: $scope.sipSettings.PublicIdentity,
                    user: $scope.sipSettings.DisplayName,
                    password: $scope.sipSettings.Password,
                    display_name: $scope.sipSettings.DisplayName,
                    outbound_proxy_url: $scope.sipSettings.OutBoundProxyUrl,
                    websocket_proxy_url: null, //"ws://192.168.1.15:5066",
                    ice_servers: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.ice_servers') : null),
                    enable_rtcweb_breaker: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.enable_rtcweb_breaker') == "true" : false),
                    events_listener: { events: '*', listener: onSipEventStack },
                    enable_early_ims: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.disable_early_ims') != "true" : true), // Must be true unless you're using a real IMS network
                    enable_media_stream_cache: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.enable_media_caching') == "true" : false),
                    bandwidth: (window.localStorage ? tsk_string_to_object(window.localStorage.getItem('org.doubango.expert.bandwidth')) : null), // could be redefined a session-level
                    video_size: (window.localStorage ? tsk_string_to_object(window.localStorage.getItem('org.doubango.expert.video_size')) : null), // could be redefined a session-level
                    //sip_headers: [
                    //        { name: 'Contact', value: '<sip:VNEWP_00003337_003@sip.beeline.ru:5060>' }
                    //]
                }
                );
                if (oSipStack.start($scope.sipSettings.PrivateIdentity) != 0) {
                    txtRegStatus.innerHTML = '<b>Failed to start the SIP stack</b>';
                }
                else return;
            }
            catch (e) {
                txtRegStatus.innerHTML = "<b>2:" + e + "</b>";
            }
        }

        // sends SIP REGISTER (expires=0) to logout
        function sipUnRegister() {
            if (oSipStack) {
                oSipStack.stop(); // shutdown all sessions
            }
        }

        // makes a call (SIP INVITE)
        function sipCall(s_type) {
            console.log("sipCall");

            if (oSipStack && !oSipSessionCall && !tsk_string_is_null_or_empty(txtPhoneNumber.value)) {
                if (s_type == 'call-screenshare') {
                    if (!SIPml.isScreenShareSupported()) {
                        alert('Screen sharing not supported. Are you using chrome 26+?');
                        return;
                    }
                    if (!location.protocol.match('https')) {
                        if (confirm("Screen sharing requires https://. Do you want to be redirected?")) {
                            sipUnRegister();
                            window.location = 'https://ns313841.ovh.net/call.htm';
                        }
                        return;
                    }
                }
                console.log("Начинаем новый звонок ");

                btnCall.disabled = true;
                btnHangUp.disabled = false;

                // create call session
                oSipSessionCall = oSipStack.newSession(s_type, oConfigCall);
                // make call
                if (oSipSessionCall.call(txtPhoneNumber.value) != 0) {
                    oSipSessionCall = null;
                    txtCallStatus.value = 'Failed to make call';
                    btnCall.disabled = false;
                    btnHangUp.disabled = true;
                    return;
                }
            }
            else if (oSipSessionCall) {

                console.log("Отвечаем на входящий звонок!");

                txtCallStatus.innerHTML = '<i>Connecting...</i>';
                oSipSessionCall.accept(oConfigCall);
            }
        }

        // Share entire desktop aor application using BFCP or WebRTC native implementation
        function sipShareScreen() {
            if (SIPml.getWebRtcType() === 'w4a') {
                // Sharing using BFCP -> requires an active session
                if (!oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>No active session</i>';
                    return;
                }
                if (oSipSessionCall.bfcpSharing) {
                    if (oSipSessionCall.stopBfcpShare(oConfigCall) != 0) {
                        txtCallStatus.value = 'Failed to stop BFCP share';
                    }
                    else {
                        oSipSessionCall.bfcpSharing = false;
                    }
                }
                else {
                    oConfigCall.screencast_window_id = 0x00000000;
                    if (oSipSessionCall.startBfcpShare(oConfigCall) != 0) {
                        txtCallStatus.value = 'Failed to start BFCP share';
                    }
                    else {
                        oSipSessionCall.bfcpSharing = true;
                    }
                }
            }
            else {
                sipCall('call-screenshare');
            }
        }

        // transfers the call
        function sipTransfer() {
            if (oSipSessionCall) {
                var s_destination = prompt('Enter destination number', '');
                if (!tsk_string_is_null_or_empty(s_destination)) {
                    btnTransfer.disabled = true;
                    if (oSipSessionCall.transfer(s_destination) != 0) {
                        txtCallStatus.innerHTML = '<i>Call transfer failed</i>';
                        btnTransfer.disabled = false;
                        return;
                    }
                    txtCallStatus.innerHTML = '<i>Transfering the call...</i>';
                }
            }
        }

        // holds or resumes the call
        function sipToggleHoldResume() {
            if (oSipSessionCall) {
                var i_ret;
                btnHoldResume.disabled = true;
                txtCallStatus.innerHTML = oSipSessionCall.bHeld ? '<i>Resuming the call...</i>' : '<i>Holding the call...</i>';
                i_ret = oSipSessionCall.bHeld ? oSipSessionCall.resume() : oSipSessionCall.hold();
                if (i_ret != 0) {
                    txtCallStatus.innerHTML = '<i>Hold / Resume failed</i>';
                    btnHoldResume.disabled = false;
                    return;
                }
            }
        }

        // Mute or Unmute the call
        function sipToggleMute() {
            if (oSipSessionCall) {
                var i_ret;
                var bMute = !oSipSessionCall.bMute;
                txtCallStatus.innerHTML = bMute ? '<i>Mute the call...</i>' : '<i>Unmute the call...</i>';
                i_ret = oSipSessionCall.mute('audio'/*could be 'video'*/, bMute);
                if (i_ret != 0) {
                    txtCallStatus.innerHTML = '<i>Mute / Unmute failed</i>';
                    return;
                }
                oSipSessionCall.bMute = bMute;
                btnMute.value = bMute ? "Unmute" : "Mute";
            }
        }

        // terminates the call (SIP BYE or CANCEL)
        function sipHangUp() {
            if (oSipSessionCall) {
                txtCallStatus.innerHTML = '<i>Terminating the call...</i>';
                oSipSessionCall.hangup({ events_listener: { events: '*', listener: onSipEventSession } });
            }
        }

        function sipSendDTMF(c) {
            if (oSipSessionCall && c) {
                if (oSipSessionCall.dtmf(c) == 0) {
                    try { dtmfTone.play(); } catch (e) { }
                }
            }
        }

        function startRingTone() {
            try { ringtone.play(); }
            catch (e) { }
        }

        function stopRingTone() {
            try { ringtone.pause(); }
            catch (e) { }
        }

        function startRingbackTone() {
            try { ringbacktone.play(); }
            catch (e) { }
        }

        function stopRingbackTone() {
            try { ringbacktone.pause(); }
            catch (e) { }
        }

        function showNotifICall(s_number) {
            // permission already asked when we registered
            if (window.webkitNotifications && window.webkitNotifications.checkPermission() == 0) {
                if (oNotifICall) {
                    oNotifICall.cancel();
                }
                oNotifICall = window.webkitNotifications.createNotification('images/sipml-34x39.png', 'Incaming call', 'Incoming call from ' + s_number);
                oNotifICall.onclose = function () { oNotifICall = null; };
                oNotifICall.show();
            }
        }

        function onDivCallCtrlMouseMove(evt) {
            try { // IE: DOM not ready
                if (tsk_utils_have_stream()) {
                    btnCall.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
                    divCallCtrl.onmousemove = null; // unsubscribe
                }
            }
            catch (e) { }
        }

        function uiOnConnectionEvent(b_connected, b_connecting) { // should be enum: connecting, connected, terminating, terminated
            btnCall.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
            btnHangUp.disabled = !oSipSessionCall;
        }

        function uiCallTerminated(s_description) {
            btnHangUp.value = 'Завершить';
            btnHoldResume.value = 'Удержание';
            btnMute.value = "Отключить звук";
            btnCall.disabled = false;
            btnHangUp.disabled = true;
            if (window.btnBFCP) window.btnBFCP.disabled = true;

            oSipSessionCall = null;

            stopRingbackTone();
            stopRingTone();

            txtCallStatus.innerHTML = "<i>" + s_description + "</i>";

            divCallOptions.style.display = "none";

            if (oNotifICall) {
                oNotifICall.cancel();
                oNotifICall = null;
            }

            setTimeout(function () { if (!oSipSessionCall) txtCallStatus.innerHTML = ''; }, 2500);
        }

        // Callback function for SIP Stacks
        function onSipEventStack(e /*SIPml.Stack.Event*/) {
            tsk_utils_log_info('==stack event = ' + e.type);

            switch (e.type) {
                case 'started':
                    {
                        // catch exception for IE (DOM not ready)
                        try {
                            // LogIn (REGISTER) as soon as the stack finish starting
                            oSipSessionRegister = this.newSession('register', {
                                expires: 200,
                                events_listener: { events: '*', listener: onSipEventSession },
                                sip_caps: [
                                            { name: '+g.oma.sip-im', value: null },
                                            //{ name: '+sip.ice' }, // rfc5768: FIXME doesn't work with Polycom TelePresence
                                            { name: '+audio', value: null },
                                            { name: 'language', value: '\"en,fr\"' }
                                ]
                            });
                            oSipSessionRegister.register();
                        }
                        catch (e) {
                            txtRegStatus.value = txtRegStatus.innerHTML = "<b>1:" + e + "</b>";
                        }
                        break;
                    }
                case 'stopping': case 'stopped': case 'failed_to_start': case 'failed_to_stop':
                    {
                        var bFailure = (e.type == 'failed_to_start') || (e.type == 'failed_to_stop');
                        oSipStack = null;
                        oSipSessionRegister = null;
                        oSipSessionCall = null;

                        uiOnConnectionEvent(false, false);

                        stopRingbackTone();
                        stopRingTone();

                        // uiVideoDisplayShowHide(false);
                        divCallOptions.style.display = "none";

                        txtCallStatus.innerHTML = '';

                        txtRegStatus.innerHTML = bFailure ? "<i>Disconnected: <b>" + e.description + "</b></i>" : "<i>Disconnected</i>";
                        break;
                    }

                case 'i_new_call':
                    {
                        if (oSipSessionCall) {
                            // do not accept the incoming call if we're already 'in call'
                            e.newSession.hangup(); // comment this line for multi-line support
                        }
                        else {
                            oSipSessionCall = e.newSession;
                            // start listening for events
                            oSipSessionCall.setConfiguration(oConfigCall);


                            btnHangUp.value = 'Отклонить';
                            btnCall.disabled = false;
                            btnCall.innerText = "Ответить";
                            btnHangUp.disabled = false;

                            startRingTone();

                            var sRemoteNumber = (oSipSessionCall.getRemoteFriendlyName() || 'unknown');
                            //тут редирект на создание нового заказа
                            txtCallStatus.innerHTML = "<i>Incoming call from [<b>" + sRemoteNumber + "</b>]</i>";
                            showNotifICall(sRemoteNumber);
                        }
                        break;
                    }

                case 'm_permission_requested':
                    {
                        divGlassPanel.style.visibility = 'visible';
                        break;
                    }
                case 'm_permission_accepted':
                case 'm_permission_refused':
                    {
                        divGlassPanel.style.visibility = 'hidden';
                        if (e.type == 'm_permission_refused') {
                            uiCallTerminated('Media stream permission denied');
                        }
                        break;
                    }

                case 'starting': default: break;
            }
        };

        // Callback function for SIP sessions (INVITE, REGISTER, MESSAGE...)
        function onSipEventSession(e /* SIPml.Session.Event */) {
            tsk_utils_log_info('==session event = ' + e.type);

            switch (e.type) {
                case 'transport_error':
                    notificationService.displayWarning("SIP: " + e.description);
                    break;
                case 'connecting': case 'connected':
                    {
                        var bConnected = (e.type == 'connected');
                        if (e.session == oSipSessionRegister) {
                            uiOnConnectionEvent(bConnected, !bConnected);
                            txtRegStatus.innerHTML = "<i>" + e.description + "</i>";
                        }
                        else if (e.session == oSipSessionCall) {
                            btnHangUp.value = 'Завершить';
                            btnCall.disabled = true;
                            btnHangUp.disabled = false;
                            btnTransfer.disabled = false;
                            if (window.btnBFCP) window.btnBFCP.disabled = false;

                            if (bConnected) {
                                stopRingbackTone();
                                stopRingTone();

                                if (oNotifICall) {
                                    oNotifICall.cancel();
                                    oNotifICall = null;
                                }
                            }

                            txtCallStatus.innerHTML = "<i>" + e.description + "</i>";
                            divCallOptions.style.display = bConnected ? "block" : "none";

                            if (SIPml.isWebRtc4AllSupported()) { // IE don't provide stream callback
                                // uiVideoDisplayEvent(false, true);
                                // uiVideoDisplayEvent(true, true);
                            }
                        }
                        break;
                    } // 'connecting' | 'connected'
                case 'terminating': case 'terminated':
                {
                        if (e.session == oSipSessionRegister) {
                            uiOnConnectionEvent(false, false);

                            oSipSessionCall = null;
                            oSipSessionRegister = null;

                            txtRegStatus.innerHTML = "<i>" + e.description + "</i>";
                        }
                        else if (e.session == oSipSessionCall) {
                            uiCallTerminated(e.description);
                        }
                        break;
                    } // 'terminating' | 'terminated'

                case 'm_stream_video_local_added':
                    {
                        if (e.session == oSipSessionCall) {
                            // uiVideoDisplayEvent(true, true);
                        }
                        break;
                    }
                case 'm_stream_video_local_removed':
                    {
                        if (e.session == oSipSessionCall) {
                            //  uiVideoDisplayEvent(true, false);
                        }
                        break;
                    }
                case 'm_stream_video_remote_added':
                    {
                        if (e.session == oSipSessionCall) {
                            // uiVideoDisplayEvent(false, true);
                        }
                        break;
                    }
                case 'm_stream_video_remote_removed':
                    {
                        if (e.session == oSipSessionCall) {
                            // uiVideoDisplayEvent(false, false);
                        }
                        break;
                    }

                case 'm_stream_audio_local_added':
                case 'm_stream_audio_local_removed':
                case 'm_stream_audio_remote_added':
                case 'm_stream_audio_remote_removed':
                    {
                        break;
                    }

                case 'i_ect_new_call':
                    {
                        oSipSessionTransferCall = e.session;
                        break;
                    }

                case 'i_ao_request':
                    {
                        if (e.session == oSipSessionCall) {
                            var iSipResponseCode = e.getSipResponseCode();
                            if (iSipResponseCode == 180 || iSipResponseCode == 183) {
                                startRingbackTone();
                                txtCallStatus.innerHTML = '<i>Remote ringing...</i>';
                            }
                        }
                        break;
                    }

                case 'm_early_media':
                    {
                        if (e.session == oSipSessionCall) {
                            stopRingbackTone();
                            stopRingTone();
                            txtCallStatus.innerHTML = '<i>Early media started</i>';
                        }
                        break;
                    }

                case 'm_local_hold_ok':
                    {
                        if (e.session == oSipSessionCall) {
                            if (oSipSessionCall.bTransfering) {
                                oSipSessionCall.bTransfering = false;
                                // this.AVSession.TransferCall(this.transferUri);
                            }
                            btnHoldResume.value = 'Resume';
                            btnHoldResume.disabled = false;
                            txtCallStatus.innerHTML = '<i>Call placed on hold</i>';
                            oSipSessionCall.bHeld = true;
                        }
                        break;
                    }
                case 'm_local_hold_nok':
                    {
                        if (e.session == oSipSessionCall) {
                            oSipSessionCall.bTransfering = false;
                            btnHoldResume.value = 'Hold';
                            btnHoldResume.disabled = false;
                            txtCallStatus.innerHTML = '<i>Failed to place remote party on hold</i>';
                        }
                        break;
                    }
                case 'm_local_resume_ok':
                    {
                        if (e.session == oSipSessionCall) {
                            oSipSessionCall.bTransfering = false;
                            btnHoldResume.value = 'Hold';
                            btnHoldResume.disabled = false;
                            txtCallStatus.innerHTML = '<i>Call taken off hold</i>';
                            oSipSessionCall.bHeld = false;

                            if (SIPml.isWebRtc4AllSupported()) { // IE don't provide stream callback yet
                                //  uiVideoDisplayEvent(false, true);
                                //  uiVideoDisplayEvent(true, true);
                            }
                        }
                        break;
                    }
                case 'm_local_resume_nok':
                    {
                        if (e.session == oSipSessionCall) {
                            oSipSessionCall.bTransfering = false;
                            btnHoldResume.disabled = false;
                            txtCallStatus.innerHTML = '<i>Failed to unhold call</i>';
                        }
                        break;
                    }
                case 'm_remote_hold':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = '<i>Placed on hold by remote party</i>';
                        }
                        break;
                    }
                case 'm_remote_resume':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = '<i>Taken off hold by remote party</i>';
                        }
                        break;
                    }
                case 'm_bfcp_info':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = 'BFCP Info: <i>' + e.description + '</i>';
                        }
                        break;
                    }

                case 'o_ect_trying':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = '<i>Call transfer in progress...</i>';
                        }
                        break;
                    }
                case 'o_ect_accepted':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = '<i>Call transfer accepted</i>';
                        }
                        break;
                    }
                case 'o_ect_completed':
                case 'i_ect_completed':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = '<i>Call transfer completed</i>';
                            btnTransfer.disabled = false;
                            if (oSipSessionTransferCall) {
                                oSipSessionCall = oSipSessionTransferCall;
                            }
                            oSipSessionTransferCall = null;
                        }
                        break;
                    }
                case 'o_ect_failed':
                case 'i_ect_failed':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = '<i>Call transfer failed</i>';
                            btnTransfer.disabled = false;
                        }
                        break;
                    }
                case 'o_ect_notify':
                case 'i_ect_notify':
                    {
                        if (e.session == oSipSessionCall) {
                            txtCallStatus.innerHTML = "<i>Call Transfer: <b>" + e.getSipResponseCode() + " " + e.description + "</b></i>";
                            if (e.getSipResponseCode() >= 300) {
                                if (oSipSessionCall.bHeld) {
                                    oSipSessionCall.resume();
                                }
                                btnTransfer.disabled = false;
                            }
                        }
                        break;
                    }
                case 'i_ect_requested':
                    {
                        if (e.session == oSipSessionCall) {
                            var s_message = "Do you accept call transfer to [" + e.getTransferDestinationFriendlyName() + "]?";//FIXME
                            if (confirm(s_message)) {
                                txtCallStatus.innerHTML = "<i>Call transfer in progress...</i>";
                                oSipSessionCall.acceptTransfer();
                                break;
                            }
                            oSipSessionCall.rejectTransfer();
                        }
                        break;
                    }
            }
        }

        //end

        //methods
        function displayUserInfo() {
            $scope.userData.isUserLoggedIn = membershipService.isUserLoggedIn();
            if ($scope.userData.isUserLoggedIn) {
                $scope.username = $rootScope.authorization.loggedUser.username;
            }
        }

        function logout() {
            membershipService.removeCredentials();
            $location.path('/login');
            $scope.userData.displayUserInfo();

            sipUnRegister();

        }
        function newOrder() {
            if ($location.path() === "/orders/add") {
                ngDialog.open({
                    template: 'spa/orders/newOrderDialog.html',
                    className: 'ngdialog-theme-default',
                    controller: ['$scope', '$location', function ($scope, $location) {
                        $scope.okAction = function () { $location.path('/orders/add'); $scope.closeThisDialog() };
                        $scope.cancelAction = function () { $scope.closeThisDialog() };
                    }]
                });
            } else {
                $location.path('/orders/add');
            }
        }

        //utils
        function processHotKeys() {
            hotkeys.add({
                combo: 'f2',
                description: 'This one goes to 11',
                callback: function () {
                    $scope.newOrder();
                }
            });
            hotkeys.add({
                combo: 'f4',
                description: 'This one goes to 11',
                callback: function () {
                    $scope.invite();
                }
            });
        }

        function initInviteModel() {
            $scope.inviteModel = {
                profile: {
                    name: "",
                    role: {
                        id: 0,
                        name: "string"
                    }
                },
                login: ""
            }
        }

        function getRoles() {
            var action = "roles/";
            apiService.get(serviceBase + action, { ignoreLoadingBar: true }, function (result) {
                if (systemConfig.debugMode) {
                    console.log("Получен справочник ролей");
                    console.log(result.data);
                }
                $scope.roles = result.data.items;
            });
        }

        function invite() {

            getRoles();

            ngDialog.open({
                template: "spa/home/userInviteDialog.html",
                className: "ngdialog-theme-default",
                scope: $scope
            });
        }

        function sendInvite() {
            var action = "employees/email/invite";
            apiService.post(serviceBase + action, $scope.inviteModel, function (result) {
                if (systemConfig.debugMode) {
                    console.log("Приглашение пользователю отправлено");
                }
                notificationService.displayInfo("Пользователь успешно создан");
                initInviteModel();
                ngDialog.closeAll();
            });
        }

        function cancelInvite() {
            ngDialog.closeAll();
            initInviteModel();
        }

        //modeling
        $scope.userData = {};
        $scope.userData.displayUserInfo = displayUserInfo;
        $scope.logout = logout;
        $scope.newOrder = newOrder;
        $scope.inviteModel = {};
        $scope.roles = {};
        $scope.invite = invite;
        $scope.sendInvite = sendInvite;
        $scope.cancelInvite = cancelInvite;
        $scope.sipCall = sipCall;
        $scope.sipToggleMute = sipToggleMute;
        $scope.sipToggleHoldResume = sipToggleHoldResume;
        $scope.sipTransfer = sipTransfer;
        $scope.sipHangUp = sipHangUp;
        // in controller
        $scope.init = function () {
            $scope.userData.isUserLoggedIn = membershipService.isUserLoggedIn();
            //сделать проверку, что пользователь зарегистрирован
            sipGlobalInit();
            sipRegister();
        };

        processHotKeys();

        initInviteModel();

        displayUserInfo();

        $scope.$on("LoginRedirectEvent", function (event, args) {
            displayUserInfo();
        });
    }

})(angular.module("webAggegator"));