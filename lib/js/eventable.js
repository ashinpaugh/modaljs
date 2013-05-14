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
 * Eventable: The extendable eventable utility.
 * 
 * Events can be used two different ways:
 *   - event_style = 'element'
 *       All custom events are bound to the event_selector element, and
 *       the event system will rely on jQuery methods. 
 *   - event_style = 'object'
 *       This method will use a combination of the the above method for
 *       document/element events, and use a custom listener for all
 *       object derived events.
 * 
 * @requires {Logger}
 * 
 * @author Austin Shinpaugh
 */

(function ($) {
	/**
	 * Gives a developer an easy way to manage an object's events.
	 * 
	 * Can use the event drivers provided here, or jQuery's event
	 * related methods.
	 * 
	 * @returns {Eventable}
	 */
	Eventable = function ()
	{
		this.event_selector = null;
		this.event_style    = 'object';
		
		this.event_type     = '';
		this.func_ref       = null;
		this.func_params    = [];
		
		this._listeners     = {};
		
		$.extend(this, new Logger());
	};
	
	Eventable.prototype = {
		/**
		 * Add an eventable method to the stack.
		 * 
		 * @param string   type     The event you wish to bind.
		 * @param function func_ref The function reference to keep track of.
		 * 
		 * @return Eventable
		 */
		addListener : function (type, func_ref)
		{
			var idx, event_style, listener;
			if (typeof type === 'object') {
				for (idx in type) {
					if (typeof idx !== 'string') {
						continue;
					}
					
					this.addListener(idx, type[idx]);
				}
				
				return this;
			}
			
			var event_style = this.event_style;
			if ($.inArray(type, Eventable._jqEvents) > -1) {
				event_style = 'element';
			}
			
			if (event_style == 'element') {
				$(this.event_selector).bind(type, func_ref);
				return this;
			}
			
			var listener = new Eventable();
			listener.func_ref       = func_ref;
			listener.event_type     = type;
			listener.event_style    = event_style;
			listener.event_selector = this.event_selector;
			
			if (typeof this._listeners[type] == 'undefined') {
				this._listeners[type] = [];
			}
			
			this._listeners[type].push(listener);
			
			return this;
		},
		
		/**
		 * Remove an event listener from the stack.
		 * 
		 * @param string   type     The event type to unbind.
		 * @param function func_ref The specific function to unbind.
		 * 
		 * @return false|Eventable
		 */
		removeListener : function (type, func_ref)
		{
			if (this.event_style == 'element') {
				$(this.event_selector).unbind(type, func_ref);
				return this;
			}
			
			if (!this._listeners[type] instanceof Array) {
				return this;
			}
			
			var listeners, idx;
			listeners = this._listeners[type];
			for (idx = 0; idx < listeners.length; idx++) {
				if (listeners[idx] !== func_ref) {
					continue;
				}
				
				listeners.splice(idx, 1);
				return this;
			}
			
			return false;
		},
		
		/**
		 * Mass removal method to clear out the listeners.
		 * This is only useful when event_style is set to "object"
		 * 
		 * @param string event_type If a specific event name isn't passed in,
		 *                          the method will globally clear all
		 *                          event handlers.
		 * 
		 * @returns {Eventable}
		 */
		removeAllListeners : function (event_type)
		{
			if (this.event_style == 'element') {
				if (typeof event_type == 'string') {
					$(this.event_selector).unbind(event_type);
				} else {
					$(this.event_selector).unbind();
				}
				
				return this;
			}
			
			if (typeof event_type == 'undefined') {
				this.log("Cleared all event listeners.");
				this._listeners = {};
				
				return this;
			}
			
			var events = this._listeners[event_type];
			if (!events instanceof Array || !events.length) {
				return this;
			}
			
			this.log("Clearing event handlers for: " + event_type);
			this._listeners[event_type] = [];
			
			return this;
		},
		
		/**
		 * Fire off a custom event.
		 * 
		 * @param string event  The event "type" that should be triggered.
		 * @param mixed  params Anything that should be passed to the listener.
		 * 
		 * @return {Eventable}
		 */
		trigger : function (event, params)
		{
			if (typeof event == 'string') {
				event = {'type' : event};
			}
			
			if (!event.target) {
				event.target = this;
			}
			
			event.params = params;
			
			if (!event.type) {
				throw new Error("[Eventable - trigger] Invalid action type.");
			}
			
			if ($.inArray(event.type, Eventable._jqEvents) > -1) {
				$(this.event_selector).trigger(event.type);
			}
			
			if (!this.hasListeners(event.type)) {
				return this;
			}
			
			var listeners, idx, func;
			listeners = this._listeners[event.type];
			for (idx = 0; idx < listeners.length; idx++) {
				func = listeners[idx].func_ref;
				if (func.call(this, event) === false) {
					// Mimics the jQuery .each()'s stopPropagation() feature.
					return this;
				}
			}
			
			return this;
		},
		
		/**
		 * Determine if the object has listeners for a particular event.
		 * 
		 * @param string event
		 * 
		 * @returns boolean
		 */
		hasListeners : function (event)
		{
			var listeners = this._listeners[event];
			
			return typeof listeners !== 'undefined'
			   && listeners.length > 0;
		}
	};
	
	/**
	 * Generate a random identifier.
	 * 
	 * @returns string
	 */
	Eventable.generateID = function ()
	{
		return Math.random().toString(36).substring(7);
	};
	
	/**
	 * The events that JQuery uses.
	 * 
	 * @var array
	 */
	Eventable._jqEvents = [
		'click',
		'dblclick',
		'hover',
		'blur',
		'change',
		'focus',
		'focusin',
		'focusout',
		'keypress',
		'keydown',
		'keyup',
		'ready',
		'resize',
		'load',
		'mousedown',
		'mouseenter',
		'mouseleave',
		'mousemove',
		'mouseout',
		'mouseover',
		'mouseup'
	];
	
}) (jQuery || $one);
