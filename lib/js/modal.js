/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @preserve
 * 
 * ModalJS.
 * 
 * Events:
 *   - modal.render
 *       Fired when the modal was rendered.
 *   - modal.minimize
 *       Fired when the modal is minimized.
 *   - modal.close
 *       Fired when the modal closes.
 *   - modal.fetch_content
 *       Fired when using the fetchContent method after the AJAX
 *       request completes.
 *   - modal.confirm_selected
 *       Fired when a user selects a choice from the confirmation box.
 *   - modal.cancel_close
 *       Fired when closing a modal should be canceled prematurely.
 *   - load
 *       Fired when the modal is insert into the document's HTML.
 *   - modal.show
 *       Fired after the modal is shown.
 *   - modal.hide
 *       Fired after the modal is hidden.
 *   - modal.user_action
 *       Fired after the user clicks the submit button if submit_button
 *       is enabled.
 * 
 * @requires {Logger}
 * @requires {Eventable}
 * @requires {jQuery}
 * 
 * @author Nathan Thomas
 * @author Austin Shinpaugh
 * 
 * @version 1.7.85
 */

(function ($) {
    if (typeof ONESITE == 'undefined') {
        ONESITE = {tt : function (text){return text;}};
    }
    
    /**
     * Creates a new modal instance.
     * 
     * @param {Object} args
     * 
     * @returns {modal}
     */
    modal = function (args)
    {
        modal.count++;
        
        $.extend(this, new Eventable());
        
        this.window          = null;
        this.input_has_focus = false;
        
        this.modal_id              = 'oneModal'   + modal.count;
        this.overlay_id            = 'oneOverlay' + modal.count;
        this.content               = '';
        this.container             = $('body');
        this.footer                = '';
        this.modal_class           = '';
        this.title                 = '';
        this.sub_title             = '';
        this.theme                 = 'dark';
        this.speed                 = 'fast';
        this.overlay               = 0.75;
        this.user_actions          = false;
        this.draggable             = false;
        this.overlay_exit          = true;
        this.snap_overlay          = false;
        this.snap                  = true;
        this.center                = true;
        this.center_resize         = true;
        this.minimizable           = false;
        this.is_minimized          = false;
        this.hug_content           = false;
        this.no_close_button       = false;
        this.display_on_load       = true;
        this.content_selector      = null;
        this.minimize_callback     = null;
        this.render_modal_callback = null;
        this.close_func            = null;
        
        this.cancel_close          = false;
        
        // Load the passed in parameters.
        this.settings(args);
        
        // Logger property: Prefix error logs with this object name.
        this.setLoggerPrefix('ModalJS');
        
        // Eventable property: In case the events should be tied to elements.
        this.event_selector  = '#' + this.modal_id;
        
        modal.last_modal = this;
    };
    
    modal.prototype = {
        /**
         * Set the settings for the modal.
         * 
         * @param {Object} args
         * 
         * @returns {modal}
         */
        settings : function (args)
        {
            var idx = null;
            for (idx in args) {
                if (this.hasOwnProperty(idx)) {
                    this[idx] = args[idx];
                } else {
                    this.log('Invalid property set: ' + idx);
                }
            }
            
            return this;
        },
        
        /**
         * The content of the modal is already on the page (hidden),
         * pass in the container's selector and render the modal.
         *
         * @param {String} selector
         * 
         * @returns {modal}
         */
        setContent : function (selector)
        {
            var container = $(selector);
            if (!container[0]) {
                this.content = ONESITE.tt('An error occurred!');
                this.renderModal();
                return this;
            }
            
            this.content = container.html();
            this.renderModal();
            
            return this;
        },
        
        /**
         * Build the modal and render its content.
         *
         * @returns {modal}
         */
        renderModal : function ()
        {
            var modal_dom, custom_class;
            modal_dom = this._renderModalMain();
            modal_dom = this._renderModalTitles(modal_dom);
            modal_dom = this._renderModalContentWrapper(modal_dom);
            modal_dom = this._renderModalFooter(modal_dom);
            
            custom_class = this.theme + ' ' + this.modal_class;
            if (this.debug) {
                custom_class += ' debug';
            }
            modal_dom.addClass(custom_class);
            
            if (this.draggable) {
                if (typeof modal_dom.draggable != 'undefined') {
                    modal_dom.draggable({
                        'cancel' : '.modalBodyContainer'
                    });
                } else {
                    this.log('Missing jQuery draggable UI script.');
                }
            }
            
            if (this.modal_id.length) {
                modal_dom.attr('id', this.modal_id);
            }
            
            // At this point, we should have all the DOM we need.
            this.window = modal_dom;
            
            // Append the modal to the document body.
            this.window.hide()
                       .appendTo($(this.container));
            
            // Align the modal vertically and horizontally.
            var media, loaded;
            media  = $('iframe, img, video, script, link, audio', this.window);
            loaded = media;
            if (media[0]) {
                if (!this.display_on_load) {
                    this.show();
                }
                
                /* Some form of media needs to be loaded.
                 * 
                 * The load event is for older elements,
                 * loadstart supports newer HTML5 elements.
                 */
                var context, item;
                context = this;
                media.bind("load loadstart", function () {
                    loaded = loaded.not(this);
                    item   = $(this);
                    if (!loaded[0]) {
                        // All the content has loaded.
                        if (context.display_on_load) {
                            context.show();
                        }
                        
                        context.trigger('load');
                         
                        if (context.hug_content) {
                            // Measure the modal's content width and resize.
                            context.window.css('width', item.outerWidth());
                            context.window.addClass('hugContent');
                        }
                        
                        if (context.center) {
                            context.alignCenter();
                        }
                        
                        context._renderModalCallback();
                    }
                });
            } else {
                this.window.show();
                this.trigger('load');
                
                if (this.center) {
                    this.alignCenter();
                }
                
                this._renderModalCallback();
            }
            
            return this._applyContentSpecificClasses()
                       ._renderOverlay()
                       ._bindKeys()
                       .alignCenter();
        },
        
        /**
         * Build the main modal container and body.
         * 
         * @returns {jQuery}
         */
        _renderModalMain : function ()
        {
            var modal_base, modal_inner, modal_header,
                modal_body, modal_footer;
            
            modal_base   = $('<div>').addClass('modalJS').css('display','none');
            modal_inner  = $('<div>').addClass('modalInner');
            modal_header = $('<div>').addClass('modalHeaderContainer');
            modal_body   = $('<div>').addClass('modalBodyContainer');
            
            modal_inner.append(modal_header)
                       .append(modal_body);
            
            if (this.footer || this.user_actions) {
                modal_footer = $('<div>').addClass('modalFooterContainer');
                modal_inner.append(modal_footer);
            }
            
            return modal_base.append(modal_inner);
        },
        
        /**
         * Build the title and sub titles.
         * 
         * @param {jQuery} modal_dom
         * 
         * @returns {jQuery}
         */
        _renderModalTitles : function (modal_dom)
        {
            var modal_inner, modal_header, title, title_text, sub_title_text;
            modal_inner  = modal_dom.find('.modalInner');
            modal_header = modal_inner.find('.modalHeaderContainer');
            
            if (this.title || this.sub_title) {
                title_text     = null;
                sub_title_text = null;
                if (this.title != '') {
                    title_text = $('<h3>').addClass('title')
                                          .append($('<span>')
                                          .text(this.title));
                }
                
                if (this.sub_title != '') {
                    sub_title_text = $('<h5>').addClass('subTitle')
                                              .append($('<span>')
                                              .text(this.sub_title));
                    modal_header.addClass('hasSubTitle');
                }
                
                if (title_text) {
                    title = $('<div>').addClass('modalTitle');
                    title.append(title_text);
                }
                
                if (sub_title_text) {
                    title.append(sub_title_text);
                }
                
                title.appendTo(modal_header);
            }
            
            if (this.minimizable) {
                modal_header.addClass('hasMinimize');
            }
            
            modal_header.appendTo(modal_inner);
            
            var window_actions, min_container, modal_closer;
            modal_closer   = $('<button>').addClass('modalExit');
            window_actions = $('<div>').addClass('windowActions');
            
            if (this.minimizable) {
                min_container = $('<span>').addClass('modalMinContainer');
                $('<button>').addClass('btnMinimize')
                             .text('_')
                             .appendTo(min_container);
                min_container.appendTo(window_actions);
            }
            
            if (!this.no_close_button) {
                // Place the DOM that holds the minimize and close button in the header.
                window_actions.append(modal_closer)
                              .prependTo(modal_header);
                
                // Add the close button to the closer container.
                $('<span>').addClass('modalExit')
                           .text('X')
                           .appendTo(modal_closer);
            }
           
           modal_header.append($('<div>').addClass('spreader'));
           
           return modal_dom;
        },
        
        /**
         * Render the wrapper immediately around the content to display.
         * 
         * @param {jQuery} modal_dom
         * 
         * @returns {jQuery}
         */
        _renderModalContentWrapper : function (modal_dom)
        {
            var modal_body, modal_inner;
            modal_inner = modal_dom.find('.modalInner');
            modal_body  = modal_dom.find('.modalBodyContainer');
            
            if (this.content_selector) {
                this.content = $(this.content_selector).html();
            }
            
            $('<div>').addClass('modalBody')
                      .append(
                          $('<div>').addClass('notifyRibbon')
                      )
                      .append(
                          $('<div>').addClass('modalBodyContent')
                                    .html(this.content)
                      ).appendTo(modal_body);
            
            modal_body.appendTo(modal_inner)
                      .append($('<div>').addClass('spreader'));
            
            return modal_dom;
        },
        
        /**
         * Render the footer if there is one.
         * 
         * @param {jQuery} modal_dom
         * 
         * @returns {jQuery}
         */
        _renderModalFooter : function (modal_dom)
        {
            if (!this.footer && !this.user_actions) {
                return modal_dom;
            }
            
            var context, content, idx, properties, modal_inner,
                modal_footer, foot_cls, foot_content;
            
            context = this;
            content = this.footer;
            if (this.user_actions && !this.footer) {
                content = $('<div>').addClass('oneModalUserActions');
                for (idx in this.user_actions) {
                    properties = this.user_actions[idx];
                    button     = $('<button>');
                    
                    if (properties) {
                        button.attr(properties);
                    }
                    
                    button.appendTo(content);
                }
                
                content.find('button').click(function (e) {
                    context.trigger('modal.user_action', e);
                }).text(ONESITE.tt(idx));
            } else {
                this.log(
                    "'user_actions' button creation was skipped "
                    + "because the 'footer' property already has a value "
                    + "assigned to it."
                );
            }
            
            modal_inner  = modal_dom.find('.modalInner');
            modal_footer = modal_dom.find('.modalFooterContainer');
            
            foot_cls      = 'modalFooterContent';
            foot_cls     += this.user_actions ? ' modalHasSubmitButton' : '';
            foot_content  = $('<div>').addClass(foot_cls)
                                      .append(content);
            
            $('<div>').addClass('modalFooter')
                      .append(foot_content)
                      .appendTo(modal_footer);
            
            modal_footer.appendTo(modal_inner);
            
            return modal_dom;
        },
        
        /**
         * Callback method after modal creation.
         *
         * @returns {modal}
         */
        _renderModalCallback : function ()
        {
            // Fire the events that were bound using the Eventable methods.
            this.trigger('modal.render');
            
            if (typeof this.render_modal_callback != 'function') {
               return this;
            }
            
            /* Support older versions of the modal. Still usable, but
             * the new hotness = custom events.
             */
            this.render_modal_callback(this);
            
            return this;
        },
        
        /**
         * A callback function fired when the modal is minimized.
         *
         * @returns {modal}
         */
         _minimizeCallback : function ()
         {
            // Fire the custom event.
            this.trigger('modal.minimize');
            
            if (typeof this.minimize_callback != 'function') {
                return this;
            }
            
            this.minimize_callback(this);
            
            return this;
         },
         
        /**
         * Apply some default classes to the modal if we detect common types
         * of content in the modal's body.
         * 
         * @returns {modal}
         */
        _applyContentSpecificClasses : function ()
        {
            if ($('img', this.window)[0]) {
                this.window.addClass('modalHasPhoto');
            } else if ($('video', this.window)[0]) {
                this.window.addClass('modalHasVideo');
            } else if ($('iframe', this.window)[0]) {
                this.window.addClass('modalHasIframe');
            }
            
            return this;
        },
        
        /**
         * Build the Overlay
         *
         * @returns {modal}
         */
        _renderOverlay : function()
        {
            if (false === this.overlay) {
                return this;
            }
            
            var overlay = $('<div>').addClass('overlay')
                                    .attr('id', this.overlay_id)
                                    .css({
                                       'display' : 'none',
                                       'opacity' : this.overlay
                                    });
            overlay.appendTo('body');
            overlay.fadeIn(this.speed);
            
            return this;
        },
        
        /**
         * Bind user actions related to the modal.
         * 
         * @returns {modal}
         */
        _bindKeys : function ()
        {
            $(':input').bind('focusin focusout', function (e) {
                this.input_has_focus = e.type == 'focusin';
            });
            
            var context = this;
            $(window).keypress(function (e) {
                var hidden = context.window.is(':hidden');
                if (e.keyCode == 27 && !hidden) {
                    context.kill();
                } else if (e.ctrlKey
                           && context.snap
                           && !context.input_has_focus
                           && !hidden
                ) {
                    // Opera uses ctrl left/right to navigate tabs.
                    if (e.keyCode == 37) {
                        context.dock(null).dock('left');
                        e.preventDefault();
                    } else if (e.keyCode == 39) {
                        context.dock(null).dock('right');
                        e.preventDefault();
                    } else if (e.keyCode == 40) {
                        context.dock(null);
                        if (context.center) {
                            context.alignCenter();
                        }
                        e.preventDefault();
                    }
                }
            });
            
            $(window).resize(function () {
                if (context.center_resize) {
                    context.alignCenter();
                }
                
                if (!context.window.hasClass('modalDocked')) {
                    return this;
                }
                
                context.dock(null);
                
                if (context.window.hasClass('dockRight')) {
                    context.dock('right');
                } else {
                    context.dock('left');
                }
            });
            
            $('.modalExit', this.window).click(function () {
                context.kill();
            });
            
            if (this.minimizable) {
                $('.btnMinimize', this.window).click(function () {
                    context.minimize();
                });
            }
            
            if (!this.draggable || !this.snap) {
                return this;
            }
            
            if (typeof $('body').draggable == 'undefined') {
                /* jQuery UI wasn't loaded on the page, ignore
                 * draggable requirements.
                 */
                return this;
            }
            
            // Required for IE9 otherwise funky shizz happens.
            this.window.css('position', 'fixed');
            
            $(this.window).bind('dragstart', function () {
                context.window.css('right', '');
            });
            
            $(this.window).bind('dragstop', function (event) {
                var left, right, window_max;
                left       = context.window.position().left;
                right      = left + context.window.outerWidth();
                window_max = $(document).width();
                
                if ($(this).hasClass('modalDocked')) {
                    context.dock(null);
                    // Without this, absolute is applied - grahhh!
                    context.window.css('position', 'fixed');
                } else {
                    if (event.screenX == 0 || left <= 0) {
                        context.dock('left');
                    } else if (event.screenX == window_max || right >= window_max) {
                        context.dock('right');
                    }
                }
            });
            
            return this;
        },
        
        /**
         * Resize the modal to either fit its content or fill the screen.
         * 
         * @returns {modal}
         */
        resize : function ()
        {
            var window_height, inner_height, ele, height;
            window_height = this.window.height();
            
            ele           = $('.modalBodyContainer', this.window).not(':hidden');
            ele.hide();
            inner_height  = $('.modalInner', this.window).not(':hidden')
                                                         .outerHeight(true);
            ele.show();
            
            height        = window_height - inner_height;
            $('.modalBodyContainer', this.window).css({
                'max-height'     : height,
                'padding-top'    : 0,
                'padding-bottom' : 0
            });
            
            return this;
        },
        
        /**
         * Resize an iframe inside the modal with a specific width and height.
         * 
         * @param mixed width  The iframe's desired width.
         * @param mixed height The iframe's desired height.
         * 
         * @returns {modal}
         */
        resizeIframe : function (width, height)
        {
            $('iframe', this.window).css({
                'width'  : width,
                'height' : height
            });
            
            return this;
        },
        
        /**
         * Minimize a modal and dock it to the bottom of the screen.
         * 
         * @returns {modal}
         */
        minimize : function ()
        {
            this.is_minimized = true;
            
            this.hide();
            
            if (this.overlay !== false) {
                $('#' + this.overlay_id).fadeOut(this.speed);
            }
            
            if (!$('.modalMinimizedContainer')[0]) {
                this.log('Added modal container.');
                $('<div>').addClass('modalMinimizedContainer').appendTo('body');
            }
            
            var context, title;
            context = this;
            title   = this.sub_title || this.title;
            $('<span>').addClass('minimizedModal')
                       .attr('title', title)
                       .html(this.title)
                       .click(function () {
                            $(this).remove();
                            context.show();
                            
                            if (context.window.hasClass('modalDocked')) {
                                context.overlay.css('display', 'none');
                            }
                            
                            if (context.overlay !== false) {
                                $('#' + context.overlay_id).fadeIn(context.speed);
                            }
                            
                            context.is_minimized = false;
                            context._minimizeCallback(context);
                       }).appendTo('.modalMinimizedContainer');
            
            return this._minimizeCallback(this);
        },
        
        /**
         * Center the modal on the page.
         * 
         * @returns {modal}
         */
        alignCenter : function ()
        {
            if (!this.window.position) {
                return this;
            }
            
            this.window.position({
                'of' : $(window)
            });
            
            return this;
        },
        
        /**
         * Dock or undock the modal.
         * 
         * @param string position Where in the window to dock the modal,
         *                        null to undock.
         * 
         * @returns {modal}
         */
        dock : function (position)
        {
            var overlay = $('#' + this.overlay_id);
            if (!position) {
                this.log('Docked center!');
                
                this.window.removeClass('modalDocked dockLeft dockRight')
                           .css('bottom', '');
                
                $('.modalBodyContainer', this.window).not(':hidden')
                                                     .removeAttr('style');
                
                if (this.overlay !== false) {
                    if (overlay.is(':hidden')) {
                        overlay.show();
                    }
                }
                
                return this;
            }
            
            if (overlay.not(':hidden') && !this.snap_overlay) {
                overlay.hide();
            }
            
            var container, bottom;
            container = $('.modalMinimizedContainer');
            if (!container.html()) {
                bottom = 0;
            } else {
                bottom = container.outerHeight(true);
            }
            
            if (position == 'left') {
                this.log('Docked left!');
                this.window.addClass('modalDocked dockLeft')
                           .removeAttr('style')
                           .css('bottom', bottom);
            } else if (position == 'right') {
                this.log('Docked right!');
                this.window.addClass('modalDocked dockRight')
                           .removeAttr('style')
                           .css('bottom', bottom);
            }
            
            return this.resize();
        },
        
        /**
         * Adds an alert to the top of the Modal to tell the user
         * that a particular action is required or that an event occur.
         * 
         * @return {modal}
         */
        alertMessage : function (message, type)
        {
            if (typeof type == 'undefined') {
                type = 'notification';
            }
            
            var msg_cls, ribbon;
            switch (type) {
                case 2:
                case 'error':
                    msg_cls = 'notifyRed';
                    break;
                    
                case 1:
                case 'notification':
                    msg_cls = 'notifyYellow';
                    break;
                    
                case 0:
                case 'success':
                default:
                    msg_cls = 'notifyGreen';
            }
            
            ribbon = $('.notifyRibbon', this.window)
            ribbon.addClass(msg_cls)
                  .html(message)
                  .slideToggle('slow', function () {
                      setTimeout(function () {
                            ribbon.html('')
                                  .removeClass(msg_cls)
                                  .slideToggle();
                            }, 7500);
                  });
            
            return this;
        },
        
        /**
         * Shield the modal from view.
         * 
         * @returns {modal}
         */
        hide : function ()
        {
            this.window.hide();
            
            this.trigger('modal.hide');
            
            return this;
        },
        
        /**
         * Show le modal.
         * 
         * @returns {modal}
         */
        show : function ()
        {
            this.window.show();
            
            this.trigger('modal.show');
            
            return this;
        },
        
        /**
         * Hide the modal's overlay.
         * 
         * @returns {modal}
         */
        hideOverlay : function ()
        {
            if (this.overlay === false) {
                return this;
            }
            
            $('#' + this.overlay_id).hide();
            
            return this;
        },
        
        /**
         * Show the modal's overlay.
         * 
         * @returns {modal}
         */
        showOverlay : function ()
        {
            if (this.overlay === false) {
                return this;
            }
            
            $('#' + this.overlay_id).show();
            
            return this;
        },
        
        /**
         * Kill the current modal.
         *
         * @returns {modal}
         */
        kill : function ()
        {
            if (!$('.modalJS')[0]) {
                return this;
            }
            
            this.trigger('modal.close');
            
            if (typeof this.close_func == 'function') {
                this.close_func(this);
            }
            
            /* This variable would be set externally, for instance in an
             * event listener.
             */
            if (this.cancel_close) {
                this.trigger('modal.cancel_close');
                return this;
            }
            
            modal.count--;
            
            var context = this;
            this.window.fadeOut(this.speed, function () {
                $(this).remove();
                if (context.overlay === false) {
                    return false;
                }
                
                $('#' + context.overlay_id).fadeOut('fast', function () {
                    $(this).remove();
                });
            });
            
            return this;
        },
        
        /**
         * Transition the modal. Useful for when you change the modal's
         * contents.
         * 
         * @param {Object} The new settings to apply to the modal.
         * 
         * @returns {modal}
         */
        transition : function (settings)
        {
            // Apply the new settings.
            settings = $.extend(this, settings);
            
            var context, bg_overlay;
            context = this;
            this.window.fadeOut(400, function () {
                // Prevent the overlay from being removed.
                bg_overlay      = context.overlay;
                context.overlay = false;
                
                // Remove the modal's DOM.
                context.window.remove();
                
                // Bring it back.
                context.renderModal();
                
                // Register the overlay ID back to the modal.
                context.overlay = bg_overlay;
            });
            
            return this;
        }
    };
    
    /**
     * Count of the number of modals that are still included in the DOM.
     * 
     * @var integer
     */
    modal.count = 0;
    
    /**
     * Stores the last modal created.
     * 
     * @var {modal}
     */
    modal.last_modal = null;
    
    /**
     * Bring up a confirmation window and fire an event when closed.
     * 
     * To listen to when a button is clicked use:
     *    .addListener('modal.confirm_selected', function (event) {});
     * 
     * @param string title
     * @param string content
     * @param array  buttons
     * 
     * @return {modal}
     */
    modal.confirmBox = function (title, content, buttons)
    {
        if (typeof title !== 'string') {
            title = '';
        }
        
        if (typeof content !== 'string') {
            content = ONESITE.tt('Are you sure?');
        }
        
        if (typeof buttons == 'string') {
            buttons = [buttons];
        } else if (typeof buttons == 'undefined') {
            buttons = ['Yes', 'Cancel'];
        }
        
        var footer, idx, item, button, box;
        footer = $('<div>').addClass('oneModalConfirmButtonWrapper');
        for (idx = 0; idx < buttons.length; idx++) {
            item   = buttons[idx];
            button = $('<button>');
            button.addClass('oneModalConfirmButtons oneButtonGlobal')
                  .text(item)
                  .data('value', item.toLowerCase());
            
            footer.append(button);
        }
        
        box = new modal({
            'title'           : title,
            'content'         : content,
            'footer'          : footer,
            'modal_class'     : 'oneModalConfirm',
            'no_close_button' : true
        }).addListener('modal.render', function (event) {
            $('#' + this.modal_id + ' button').click(function (e) {
                var value = $(e.currentTarget).data('value');
                event.target.trigger('modal.confirm_selected', value);
            });
        }).renderModal();
        
        return box;
    };
    
    /**
     * Fetch a modal from a specified link.
     * All modal variables are passed in from data.content.
     * 
     * @param mixed  link     Either the link that was clicked or a uri location (string). 
     * @param object params   Optional params to be send with HTTP request.
     * @param object settings The settings applied to the modal.
     * 
     * @returns void
     */
    modal.fetchContent = function (link, params, settings)
    {
        var location, request;
        if (typeof link == 'string') {
            location = link;
        } else if (typeof link == 'object' && link.preventDefault) {
            link.preventDefault();
            location = $(link.currentTarget).attr('href');
        } else if (typeof link == 'object' && link.is && $(link).is('a')) {
            location = $(link).attr('href');
        }
        
        request = {'data' : {}};
        if (typeof params != 'undefined') {
            request.data = params;
        }
        
        request = {
            'url'      : location,
            'type'     : 'POST',
            'dataType' : 'json',
            'data'     : request.data,
            'success'  : function (data) {
                var hwnd = new modal(data.content);
                if (data.html.length > 0) {
                    hwnd.content = data.html;
                }
                
                hwnd.settings(settings)
                    .renderModal();
                
                hwnd.trigger('modal.fetch_content');
            },
            'error'    : function () {
                this.content = ONESITE.tt('Error occurred during request!');
                new modal({
                    'content' : this.content
                }).renderModal();
            }
        };
        
        $.ajax(request);
    };
    
    /**
     * Quickly create message box.
     * 
     * @param {Object} settings The settings used to create the modal.
     * 
     * @return {modal}
     */
    modal.quickBox = function (settings)
    {
        return new modal(settings).renderModal();
    };
    
    /**
     * After all page resources have loaded, make sure that ModalJS's
     * dependencies were included on the page.
     */
    $(window).load(function () {
        if (typeof baseJsUrl === 'undefined') {
            baseJsUrl = window.location.protocol
                        + '//images.onesite.com/';
        }
        
        // Auto download JQuery UI if it wasn't included on the page.
        if (typeof $('body').resizeable == 'undefined') {
            $.getScript(baseJsUrl + 'jquery/jquery-ui.min.js');
        }
        
        if (typeof require_js_once !== 'function') {
            return;
        }
        
        require_js_once({
            'Logger'    : 'utils/logger.js',
            'Eventable' : 'utils/eventable.js'
        });
        
        require_css_once('modal/modal.css');
    });
    
}) (jQuery || $one);
