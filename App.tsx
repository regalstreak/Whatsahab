import React, { useRef } from 'react';
import { SafeAreaView } from 'react-native';
import WebView from 'react-native-webview';
import { WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';

const userAgent = `Mozilla/5.0 (Linux; Win64; x64; rv:46.0) Gecko/20100101 Firefox/68.0`;

const INJECTED_JAVASCRIPT = `(function() {
		const meta = document.createElement('meta'); meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'); meta.setAttribute('name', 'viewport'); document.getElementsByTagName('head')[0].appendChild(meta);

		class MockNotificationApi {
				static get permission() {
						return "granted";
				}
		
				static requestPermission (callback) {
						callback("granted");
				}
		
				constructor (title, options) {
						window.ReactNativeWebView.postMessage(JSON.stringify({title, options}));
				}
		};
		
		window.Notification = MockNotificationApi;

  })();`;

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
					console.log(JSON.parse(event.nativeEvent.data));
				}}
			/>
		</SafeAreaView>
	);
};
