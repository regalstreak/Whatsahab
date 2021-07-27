import React, { useRef } from 'react';
import { Linking, SafeAreaView } from 'react-native';
import {
	FlingGestureHandler,
	Directions,
	State,
} from 'react-native-gesture-handler';
import WebView from 'react-native-webview';
import RNFetchBlob from 'rn-fetch-blob';
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
					JSON.stringify({ title, options, messageType: 'notification' }),
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

		function blobToDataURL(blob, callback) {
			var a = new FileReader();
			a.onload = function(e) {callback(e.target.result);}
			a.readAsDataURL(blob);
		}
		
		const attachDownloadEventListener = () => {
			document.addEventListener('click', function (event) {
				event.preventDefault();
				if (event.target.matches('a[href^="blob:"]')) {
					(async (el) => {
						const url = el.href;
						const blob = await fetch(url).then((r) => r.blob());
						blobToDataURL(blob, (datauri) => {
							el.href = datauri
							window.ReactNativeWebView.postMessage(
								JSON.stringify({ messageType: 'downloadData', dataUri: datauri, fileName: el.download }),
							);
						});
					})(event.target);
				}
			});
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
			attachDownloadEventListener();
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

const whatsappWebUri = 'https://web.whatsapp.com';

export const App = () => {
	const webviewRef = useRef<WebView>(null);

	return (
		<FlingGestureHandler
			direction={Directions.RIGHT}
			onHandlerStateChange={({ nativeEvent }) => {
				if (nativeEvent.state === State.ACTIVE) {
					webviewRef.current?.injectJavaScript(
						`	
							document.querySelector('#main').parentElement.style.display = 'none';
							document.querySelector('#side').parentElement.style.display = 'block';
						`,
					);
				}
			}}
		>
			<SafeAreaView
				style={{
					flex: 1,
				}}
			>
				<WebView
					ref={webviewRef}
					source={{
						uri: whatsappWebUri,
					}}
					userAgent={userAgent}
					injectedJavaScript={INJECTED_JAVASCRIPT}
					onMessage={(event: WebViewMessageEvent) => {
						const messageData = JSON.parse(event.nativeEvent.data);
						if (messageData.messageType === 'notification') {
							sendLocalNotification({
								title: messageData.title,
								message: messageData.options.body,
							});
							return;
						}
						if (messageData.messageType === 'downloadData') {
							const filePath =
								RNFetchBlob.fs.dirs.CacheDir +
								'/' +
								messageData.fileName;
							RNFetchBlob.fs.writeFile(
								filePath,
								messageData.dataUri.split('base64,')[1],
								'base64',
							);
							setTimeout(() => {
								RNFetchBlob.ios.previewDocument(filePath);
							}, 0);
							return;
						}
					}}
					onNavigationStateChange={(event) => {
						if (
							!event.url
								.toLowerCase()
								.includes(whatsappWebUri.toLowerCase()) &&
							event.navigationType === 'click'
						) {
							webviewRef.current?.stopLoading();
							Linking.openURL(event.url);
						}
					}}
					// onFileDownload={(event) => {
					// 	console.log('filedownload ', event);
					// }}s
				/>
			</SafeAreaView>
		</FlingGestureHandler>
	);
};
