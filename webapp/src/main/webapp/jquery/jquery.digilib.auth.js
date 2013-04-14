/*
 * #%L
 * digilib authentication plugin
 * %%
 * Copyright (C) 2013 MPIWG Berlin
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
 * digilib authentication plugin.
 * 
 * Switches Scaler into error-code mode and listens for image load errors.
 * When an error occurs, switches the Scaler URL to the authScalerBaseUrl.
 */

(function($) {

    // plugin object with digilib data
    var digilib = null;

    var defaults = {
            // URL of Scaler servlet that does authentication
            'authScalerBaseUrl' : null,
            // URL of Scaler servlet that does not do authentication
            'unauthScalerBaseUrl' : null,
            // try to switch back to error image mode after authentication
            'returnToErrorImgMode' : true
    };
    
    /**
     * Handle parameter unpacking event.
     * Make sure the errcode flag is set.
     */
    var handleUnpack = function (evt) {
        console.debug("auth: handleUnpack");
        var data = this;
        var flags = data.scalerFlags;
        // remove other error flags
        for (f in flags) {
            if (f.substr(1, 3) === "err") {
                delete flags[f];
            }
        }
        // set error code flag
        flags['errcode'] = 'errcode';
    };

    /** 
     * Handle image load error.
     * Assume that it was an authentication error and try to use the authenticated Scaler url.
     * @param {Object} evt
     */
    var handleImgerror = function (evt) {
        console.debug("auth: handleImgerror");
        var data = this;
        var settings = data.settings;
        if (settings.authScalerBaseUrl == null) return;
        if (settings.scalerBaseUrl != settings.authScalerBaseUrl) {
            // not using authScalerBaseUrl -- change URL
            console.debug("auth: switching to authenticated scaler.");
            settings.noauthScalerBaseUrl = settings.scalerBaseUrl;
            settings.scalerBaseUrl = settings.authScalerBaseUrl;
            digilib.fn.redisplay(data);            
        } else {
            // we are authenticated, it must be a different kind of error
            if (settings.returnToErrorImgMode && settings.noauthScalerBaseUrl != null) {
                // remove error code flag and switch to noauth URL
                delete data.scalerFlags['errcode'];
                settings.scalerBaseUrl = settings.noauthScalerBaseUrl;
                digilib.fn.redisplay(data);
            }
        }
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing auth plugin. digilib:', digilib);
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        //$.extend(digilib.actions, actions);
        //$.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising auth plugin. data:', data);
        var $data = $(data);
        // install event handler
        $data.bind('unpack', handleUnpack);
        $data.bind('imgerror', handleImgerror);
    };


    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
            name : 'auth',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.auth must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
