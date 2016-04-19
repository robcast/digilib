/*
 * #%L
 * digilib OAuth plugin
 * %%
 * Copyright (C) 2016 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Authors: Robert Casties
 */

/**
 * digilib OAuth / OpenID Connect plugin.
 * 
 * Provides "authenticate" login button.
 * 
 * Optionally switches Scaler into error-code mode and listens for image load errors.
 * When an error occurs, redirect browser to authentication URL.
 */
(function($) {

    // plugin object with digilib data
    var digilib = null;
    // the functions made available by digilib
    var fn = {};

    var buttons = {
            authenticate : {
                onclick : "authenticate",
                tooltip : "Authenticate",
                icon : "annotation-user.png"
            },
    };
                
    var defaults = {
            // Authorization Server Endpoint URL
            'authServerUrl' : null,
            // Client ID of digilib Scaler
            'authClientId' : null,
            // switch into error-code mode and listen for image load error
            'authOnErrorMode' : false,
            // try to switch back to error image mode after authentication
            'returnToErrorImgMode' : true,
            // url param for ID Token
            'id_token' : null,

    };
    
    var actions = { 
            /*
             * authenticate: log in user
             */
            'authenticate' : function (data) {
                console.debug("oauth authenticate action!");
                authenticate(data);
            }
    };
                

    var authenticate = function (data) {
        console.debug("oauth: authenticate.");
        var url = fn.getDigilibUrl(data);
        var authReq = {
                'response_type' : 'id_token token',
                'client_id' : data.settings.authClientId,
                'redirect_uri' : encodeURIComponent(url),
                'scope' : 'openid'
        };
        var qs = fn.getParamString(authReq, Object.keys(authReq));
        window.location.assign(data.settings.authServerUrl + '?' + qs);
    };
    
    
    /**
     * Handle parameter unpacking event.
     * Make sure the errcode flag is set.
     */
    var handleUnpack = function (evt) {
        console.debug("oauth: handleUnpack");
        var data = this;
        // unpack token from url fragment
        var frag = window.location.hash;
        if (frag) {
            var fragp = fn.parseQueryString(frag.substr(1));
            if (fragp['id_token'] != null) {
                // save id_token
                data.dlOpts.id_token = fragp['id_token'];
                fn.storeOptions(data);
                // and set for Scaler
                data.settings.id_token = fragp['id_token'];
                // remove fragment from URL
                window.location.hash = '';
            }
        } else {
            if (data.dlOpts.id_token) {
                // set token for Scaler
                data.settings.id_token = data.dlOpts.id_token;                
            }
        }
        // set scaler errcode mode
        if (data.settings.authOnErrorMode) {
            var flags = data.scalerFlags;
            // remove other error flags
            for (f in flags) {
                if (f.substr(1, 3) === "err") {
                    delete flags[f];
                }
            }
            // set error code flag
            flags['errcode'] = 'errcode';
        }
    };

    /** 
     * Handle image load error.
     * 
     * Assumes that it was an authentication error and tries to authenticate.
     * Switches back to error image mode if token is present and 
     * returnToErrorImgMode is set.
     * 
     * @param {Object} evt
     */
    var handleImgerror = function (evt) {
        console.debug("oauth: handleImgerror");
        var data = this;
        var settings = data.settings;
        if (! settings.authOnErrorMode) return;
        if (! settings.id_token) {
            // not token -- authenticate
            authenticate(data);
        } else {
            // we are authenticated, it must be a different kind of error
            if (settings.returnToErrorImgMode) {
                // remove error code flag
                delete data.scalerFlags['errcode'];
                digilib.fn.redisplay(data);
            }
        }
    };

    /** 
     * install additional buttons
     */
    var installButtons = function(data, buttonSet) {
        var settings = data.settings;
        var mode = settings.interactionMode;
        var buttonSettings = settings.buttonSettings[mode];
        // add authenticate button to specialSet
        buttonSettings['specialSet'].unshift('authenticate');
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        fn = digilib.fn;
        console.debug('installing oauth plugin. digilib:', digilib);
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
        // add "id_token" to Scaler parameters
        digilib.defaults.scalerParamNames.push('id_token');
        digilib.defaults.previewImgParamNames.push('id_token');
        if (digilib.defaults.birdDivParams != null) {
            digilib.defaults.birdDivParams.push('id_token');
        }
        
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising oauth plugin. data:', data);
        var $data = $(data);
        // add buttons
        installButtons(data);
        // install event handler
        $data.bind('unpack', handleUnpack);
        if (data.settings.authOnErrorMode) {
            $data.bind('imgerror', handleImgerror);
        }
    };


    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
            name : 'oauth',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.oauth must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
