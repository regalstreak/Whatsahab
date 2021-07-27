import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';

export const sendLocalNotification = ({
	title,
	message,
}: {
	title: string;
	message: string;
}) => {
	PushNotification.localNotification({
		title,
		message,
	});
};

export const configureNotifications = () => {
	PushNotification.configure({
		// (required) Called when a remote is received or opened, or local notification is opened
		onNotification: function (notification) {
			console.log('NOTIFICATION:', notification);

			// process the notification

			// (required) Called when a remote is received or opened, or local notification is opened
			notification.finish(PushNotificationIOS.FetchResult.NoData);
		},

		// (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
		onAction: function (notification) {
			console.log('ACTION:', notification.action);
			console.log('NOTIFICATION:', notification);

			// process the action
		},

		// IOS ONLY (optional): default: all - Permissions to register.
		permissions: {
			alert: true,
			badge: true,
			sound: true,
		},

		// Should the initial notification be popped automatically
		// default: true
		popInitialNotification: true,

		/**
		 * (optional) default: true
		 * - Specified if permissions (ios) and token (android and ios) will requested or not,
		 * - if not, you must call PushNotificationsHandler.requestPermissions() later
		 * - if you are not using remote notification or do not have Firebase installed, use this:
		 *     requestPermissions: Platform.OS === 'ios'
		 */
		requestPermissions: Platform.OS === 'ios',
	});
};
