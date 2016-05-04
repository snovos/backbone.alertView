/*
backbone.alertView
http://github.com/snovos/backbone.alertView.git
	Copyright (c) 2016 Sviatoslav Novosiadlyi and contributors
Licensed under the MIT license.
*/

(function (factory) {

	// Set up Stickit appropriately for the environment. Start with AMD.
	if (typeof define === 'function' && define.amd)
		define(['underscore', 'backbone', 'bootstrap'], factory);

	// Next for Node.js or CommonJS.
	else if (typeof exports === 'object')
		factory(require('underscore'), require('backbone'), require('bootstrap'));

	// Finally, as a browser global.
	else
		factory(_, Backbone, {});

}(function (_, Backbone) {


	// Export onto Backbone object
	Backbone.AlertView = Backbone.View.extend({

		el : 'body',

		uiElements : {
			alertBox : '#alert-box',
			alertMessages : '[data-alert-messages]',
			stamp : '[data-alert-stamp]',
			errorClass : '.alert-error',
			alertWrapper : '.alertWrapper'
		},

		holderKey : 'AlertBox',

		config: {
			DEFAULT_SORT_INDEX : 10,
			MESSAGE_DELAYS : {
				INIT_WAIT: 3000,
				ADDL_WAIT: 2000,
				FADE_IN_TIME: 150,
				FADE_OUT_TIME: 250
			}
		},

		/**
		 * View initialization
		 * @param options {Object} configuration options for view
		 */
		initialize: function(options) {
			options = options || {};
			this.alert_fadeIn_time = options.fadeInTime || this.config.MESSAGE_DELAYS.FADE_IN_TIME;
			this.alert_fadeOut_time = options.fadeOutTime || this.config.MESSAGE_DELAYS.FADE_OUT_TIME;
			this.sortIndex = options.sortIndex || this.config.DEFAULT_SORT_INDEX;
			this.initDelayTime = options.delayTime || this.config.MESSAGE_DELAYS.INIT_WAIT;
			this.extraDelayTime = options.extraDelay || this.config.MESSAGE_DELAYS.ADDL_WAIT;
		},

		_getAlertClassName: function (type) {
			return type === 'error' ? 'danger' : type;
		},

		/**
		 * Display alert
		 * @param message {String} message to be displayed
		 *                {Array}  array containing  type:'{error,info,success}', message,
		 *                         target (optional), and freeze (optional)
		 * @param type    {String} alert type  (error, info, success)
		 * @param allowMultiple {Boolean} can be duplicated with same message and type
		 * @param freeze  {Boolean|Undefined} do not close alert when there is a route change
		 * @param stamp   {String} alert stamp
		 * @param target  {Object|String} element or jquery string where alert message is to be inserted (optional)
		 */
		render: function (message, type, freeze, allowMultiple, stamp, target) {
			var $newAlert;

			// Array of objects mode
			if (message instanceof Array) {
				var list = _.sortBy(message, function (list) { // Sort by: error, info, success, others last.
					return ({'error':1, 'info':2, 'success':3}[list.type.toLowerCase()] || this.sortIndex);
				}, this);
				var $thisAlert = $();
				for (var i = 0; i < list.length; i++) {
					$newAlert = $thisAlert.add(this.launchAlert(list[i].type, list[i].message, list[i].target, list[i].freeze, list[i].allowMultiple, list[i].stamp));
				}

				// Normal mode
			} else {
				$newAlert = this.launchAlert(type, message, target, freeze, allowMultiple, stamp);
			}

			return $newAlert;
		},

		/**
		 * Escape bad HTML symbols
		 * @param str {String} input
		 * @returns {String} result
		 */
		_escapeMessage : function(str) {
			var escape = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#x27;',
				'/': '&#x2F;'
			};
			return String(str).replace(/[&<>"'\/]/g, function (s) {
				return escape[s];
			});
		},


		/**
		 * Generates the alert's html, settings, and timings
		 * @param type    {String} alert type  (error, info, success)
		 * @param message {String} message to be displayed
		 * @param target  {Object|String} element or jquery string where alert message is to be inserted (optional)
		 * @param freeze  {Boolean|Undefined} do not close alert when there is a route change (optional)
		 * @param allowMultiple {Boolean} can be duplicated with same message and type
		 * @param stamp   {String} id used to identify an alert or a group of alerts (optional)
		 */
		launchAlert: function (type, message, target, freeze, allowMultiple, stamp) {
			// Set up message html
			var stamp_ = stamp || '';
			var message_ = this._escapeMessage(message).replace(/\n/g, '<br />');
			var $newAlert = $('<div class="alert alert-' + this._getAlertClassName(type) + '" data-alert-stamp="' + stamp_ + '"><button type="button" class="close" data-dismiss="alert">&times;</button>' + message_ + '</div>');

			// Setup alert data container
			var $holder = this.findHolder(target);
			this.attachAlertData($holder, type);


			if (this.isUniqueMessage(message, type) || allowMultiple) {
				// Add alert message to target
				$newAlert
					.hide()
					.alert()
					.appendTo($holder)
					.slideDown(this.alert_fadeIn_time);

				// If freeze is turned on then don't remove message - even for a route change
				freeze || type === 'error' ?
					this.removeAlertAfterRouteChange($newAlert) :
					this.hideAlertWithDelay($newAlert);
			}
			else {
				this.highLightAlert(message, type, freeze, stamp, $holder);
			}

			return $newAlert;
		},

		/**
		 * Highlight existed alert message
		 * @param type    {String} alert type  (error, info, success)
		 * @param message {String} message to be displayed
		 * @param $holder  {Object} element that contains alert box
		 * @param freeze  {Boolean|Undefined} do not close alert when there is a route change (optional)
		 * @param stamp   {String} id used to identify an alert or a group of alerts (optional)
		 */
		highLightAlert : function (message, type, freeze, stamp, $holder) {
			var $alert = this.getExistedAlert(message, type);
			clearTimeout($alert.data('timer'));
			// If freeze is turned on then don't remove message - even for a route change
			if (!freeze && type !== 'error') {
				this.hideAlertWithDelay($alert);
			}

			$alert.addClass('alert-reminder');
			$alert.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
				$alert.removeClass('alert-reminder');
			});
		},


		/**
		 * Check if message is unique
		 * @param message {String} message to be displayed
		 * @returns {Boolean} or not
		 */
		isUniqueMessage : function (message, type) {
			return !this.getExistedAlert(message, type).length;
		},


		/**
		 * Get existed alert with same message
		 * @param message {String} alert message
		 * @param type {String} type of alert
		 * @returns {Array} matched alerts
		 */
		getExistedAlert : function (message, type) {
			var $alert = $(this.uiElements.stamp);
			var that = this;
			return $alert.filter(function (index, el) {
				return $(el).clone()
						.children()
						.remove()
						.end()
						.text() === message && $(el).hasClass('alert-' + that._getAlertClassName(type));
			});

		},

		getAlertHolder: function () {
			$(this.uiElements.alertBox).length ||
			jQuery('<div/>', {
				id: this.uiElements.alertBox.slice(1)
			})
				.appendTo(this.$el)
				.css({'position':'fixed', 'width':'100%', 'top':'0'});

			return $(this.uiElements.alertBox);
		},


		/**
		 * Uses the target element or generates the html container for the error message
		 * @param target {Object} or {String} element or jquery string where alert message is to be inserted (optional)
		 */
		findHolder: function (target) {
			var $alertBox;
			var iBoxData = {count:0, type:'', errorAlerts:0};

			// Create html container for all messages if target element is not provided
			if (typeof target === 'undefined') {
				var $glob = this.getAlertHolder();
				$glob.find(this.uiElements.alertWrapper).length || $glob.append('<div class="row"><div class="span6 offset5 alertWrapper"></div></div>');
				target = this.uiElements.alertBox + ' ' + this.uiElements.alertWrapper;
			}

			// Try to find the alertBox message container in the target, or make one if you can't.
			$alertBox = $(this.uiElements.alertMessages, target);
			if ($alertBox.length > 1) {
				console.warn('[Alert Widget] Multiple alert locations found in target: ' + target);
			} else {
				if ($alertBox.length === 0) {
					$alertBox = $('<div ' + this.uiElements.alertMessages.replace(/[\[\]]+/g, '') + ' class="alertBox"></div>');
					$alertBox.data(this.holderKey, iBoxData);

					// Fix the target's position and add the alert box.
					var $target = $(target);
					$target.css('position', ( $target.css('position') === 'static' ? 'relative' : $target.css('position') ))
						.prepend($alertBox);
				}
			}
			return $alertBox;
		},


		/**
		 * Creates and attaches alert tracking data to the passed in jQuery object
		 * @param $holder  {Object} jQuery alert message container
		 * @param type     {String} alert type  (error, info, success)
		 */
		attachAlertData: function ($holder, type) {
			var holderData = $holder.data(this.holderKey);
			holderData.count++;
			holderData.type = type;
			type === 'error' ? holderData.errorAlerts++ : holderData.errorAlerts;
			$holder.data(this.holderKey, holderData);
			return $holder;
		},


		/**
		 * Remove alert after route change
		 * @param $mAlert {jQuery} element
		 */
		removeAlertAfterRouteChange: function ($mAlert) {
			Backbone.history.once('all', function () {
				$mAlert.remove();
			});
			this.setAlertData();
		},


		/**
		 * Hide alert after some delay
		 * @param $mAlert {jQuery} element
		 */
		hideAlertWithDelay: function ($mAlert) {
			var alertCount = $(this.uiElements.stamp).length;
			var errorCount = $(this.uiElements.errorClass).length;
			var delay = (alertCount - errorCount) * this.extraDelayTime + this.initDelayTime;
			var that = this;
			$mAlert.data('timer', setTimeout(function () {
				$mAlert.animate({opacity: 0}, that.alert_fadeIn_time, function () {
					$mAlert.slideUp(that.alert_fadeOut_time, function () {
						$mAlert.remove();
						that.setAlertData();
					});
				});
			}, delay));
		},


		/**
		 * Remove alerts from target element or remove all alerts if no target specified
		 * @param target {Object|String} element or jquery string where alert message is to be inserted (optional)
		 */
		clearAlerts: function (target) {
			var $alertBoxes = (typeof target === 'undefined') ?
				$(this.uiElements.stamp) :
				$(this.uiElements.stamp, target);
			$alertBoxes.each(function (i, a) {
				$(a).remove();
			});
			this.setAlertData();
		},


		/**
		 * Get alert element container
		 * @returns {Object} elements
		 */
		getAlertContainer: function () {
			return this.$el.find(this.uiElements.alertMessages);
		},


		/**
		 * Get alert with passed stamp
		 * @param stamp {String} alert stamp
		 */
		getAlertWithStamp: function (stamp) {
			return this.getAlertContainer().find(this.uiElements.stamp.slice(0, -1) + '="' + stamp + '"]');
		},


		/**
		 * Remove alerts with passed stamp
		 * @param stamp {String} alert stamp
		 */
		hideWithStamp: function (stamp) {
			var that = this;
			this.getAlertWithStamp(stamp).each(function (i, a) {
				$(a).remove();
				that.setAlertData();
			});
		},


		/**
		 * Update the alert data statistics
		 */
		setAlertData: function () {
			var holderData = $(this.uiElements.alertMessages).data(this.holderKey);
			holderData.count = $(this.uiElements.stamp).length;
			holderData.errorAlerts = $(this.uiElements.errorClass).length;
		}

	});


	return Backbone.AlertView;

}));
