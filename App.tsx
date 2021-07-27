import React, { useRef } from 'react';
import { SafeAreaView } from 'react-native';
import WebView from 'react-native-webview';
import { WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { sendLocalNotification } from './src/utils/notifications';

const userAgent = `Mozilla/5.0 (Linux; Win64; x64; rv:46.0) Gecko/20100101 Firefox/68.0`;

const INJECTED_JAVASCRIPT = `
	(function () {
		// Disable zooming in (textinput focus zoom messes up ux)
		const meta = document.createElement('meta');
		meta.setAttribute(
			'content',
			'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
		);
		meta.setAttribute('name', 'viewport');
		document.getElementsByTagName('head')[0].appendChild(meta);

		// Intercept notifications
		class MockNotificationApi {
			static get permission() {
				return 'granted';
			}

			static requestPermission(callback) {
				callback('granted');
			}

			constructor(title, options) {
				window.ReactNativeWebView.postMessage(
					JSON.stringify({ title, options }),
				);
			}
		}
		window.Notification = MockNotificationApi;

		// side = chat list, main = chat view
		const sideQuerySelector = '#side';
		const mainQuerySelector = '#main';

		// Create back button
		const createBackButton = () => {
			const backButtonIdentifier = 'customws-backButton';
			const mainHeader = document.querySelector(
				mainQuerySelector + ' > header',
			);
			if (mainHeader.querySelector('#' + backButtonIdentifier)) {
				return;
			}
			const backButton = document.createElement('div');
			backButton.setAttribute('id', backButtonIdentifier);
			const backText = document.createTextNode('‹');
			backButton.append(backText);
			backButton.style.fontSize = '2rem';
			backButton.style.marginRight = '10px';
			backButton.style.marginBottom = '6px';
			mainHeader.insertBefore(backButton, mainHeader.firstChild);
			backButton.addEventListener('click', () => {
				displayMainChatView(false);
			});
		};

		// Functions
		const displayMainChatView = (isMain) => {
			if (isMain) {
				document.querySelector(
					mainQuerySelector,
				).parentElement.style.display = 'block';
				document.querySelector(
					sideQuerySelector,
				).parentElement.style.display = 'none';
				createBackButton();
			} else {
				document.querySelector(
					mainQuerySelector,
				).parentElement.style.display = 'none';
				document.querySelector(
					sideQuerySelector,
				).parentElement.style.display = 'block';
			}
		};

		// Chat list hide main view listeners
		const attachChatListItemListeners = () => {
			document
				.querySelectorAll('[aria-label="Chat list"] > div > div > div')
				.forEach((chatListItem) => {
					chatListItem.addEventListener('click', () => {
						displayMainChatView(true);
					});
				});
		};

		// Fix width for mobile devices
		const fixMobileWidth = () => {
			document.querySelector(
				sideQuerySelector,
			).parentElement.parentElement.style.minWidth = '100vw';
		};

		// Remove intro
		const removeIntro = () => {
			document.querySelector(
				sideQuerySelector,
			).parentElement.parentElement.lastElementChild.style.display = 'none';
		};

		const debounce = (func, delay) => {
			let debounceTimer;
			return function () {
				const context = this;
				const args = arguments;
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => func.apply(context, args), delay);
			};
		};

		const main = () => {
			removeIntro();
			fixMobileWidth();
			attachChatListItemListeners();
			document.querySelector('#pane-side').addEventListener(
				'scroll',
				debounce(() => {
					attachChatListItemListeners();
				}, 1000),
			);
		};

		const sideFinderMutationObserver = new window.MutationObserver(
			(mutations) => {
				mutations.forEach((mutation) => {
					if (!mutation.addedNodes) {
						return;
					}

					for (let i = 0; i < mutation.addedNodes.length; i++) {
						const addedNode = mutation.addedNodes[i];
						if (addedNode.querySelector(sideQuerySelector)) {
							main();
							sideFinderMutationObserver.disconnect();
						}
					}
				});
			},
		);

		sideFinderMutationObserver.observe(document.querySelector('#app'), {
			childList: true,
			subtree: true,
			attributes: false,
			characterData: false,
		});
	})();

`;

export const App = () => {
	const webviewRef = useRef<WebView>(null);

	return (
		<SafeAreaView
			style={{
				flex: 1,
			}}
		>
			<WebView
				ref={webviewRef}
				source={{
					uri: 'https://web.whatsapp.com',
				}}
				userAgent={userAgent}
				injectedJavaScript={INJECTED_JAVASCRIPT}
				onMessage={(event: WebViewMessageEvent) => {
					const notificationData = JSON.parse(event.nativeEvent.data);
					sendLocalNotification({
						title: notificationData.title,
						message: notificationData.options.body,
					});
				}}
				allowsBackForwardNavigationGestures={true}
			/>
		</SafeAreaView>
	);
};
