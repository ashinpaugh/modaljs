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
 * Logger: The most basic debugging utility in existence.
 * 
 * @author Austin Shinpaugh
 */

(function ($) {
	/**
	 * The Logger object.
	 * 
	 * Used to quickly make a logging function, cause I'm tired have
	 * having to make a new one for every script.
	 * 
	 * @returns {Logger}
	 */
	Logger = function ()
	{
		// Variables that external utilities should set.
		this._log_prefix = '';
		this.debug       = false;
	};
	
	Logger.prototype = {
		/**
		 * Parse the URL parameters for the existence of the value set to
		 * 'this._log_prefix'.
		 * 
		 * This makes it easier to track down bugs that might occur in
		 * a non-development environment.
		 * 
		 * @param string prefix
		 * 
		 * @return {Logger}
		 */
		setLoggerPrefix : function (prefix)
		{
			if (this.debug) {
				return this;
			}
			
			var search, idx;
			search = window.location.search.substr(1).split('&');
			
			if (!search.length) {
				return this;
			}
			
			this._log_prefix = prefix;
			
			for (idx = 0; idx < search.length; idx++) {
				if (-1 !== search[idx].indexOf(this._log_prefix + '=')) {
					this.debug = true;
					
					this.log('Logging Enabled!');
				}
			}
			
			return this;
		},
		
		/**
		 * The primary logging method.
		 * 
		 * @param mixed out
		 * 
		 * @returns {Logger}
		 */
		log : function (out)
		{
			if (!this.debug) {
				return this;
			}
			
			if (typeof console == 'undefined') {
				alert("This browser doesn't support the console.log functionality, disabling debugging.");
				this.debug = false;
				return this;
			}
			
			if (this._log_prefix.length) {
				if (typeof out == 'string') {
					console.log(this._log_prefix + ': ' + out);
					
					return this;
				}
				
				console.log(this._log_prefix + ':');
			}
			
			console.log(out);
			
			return this;
		}
	};
}) (jQuery || $one);
