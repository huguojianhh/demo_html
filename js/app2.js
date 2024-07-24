//订阅id
const parentPwd = true
var cacheKey = 'pwago_subscriber'
var messageType = 'pwago_subscriber_type'
let isChinese = getBrowserLanguage() === 'zh-CN'
let appId
let baseUrl
let pubKey
let iframe = 0 //是否在iframe打开 1 是  0 否
let iconUrl

//是否数据加载完成
let accessData = false
//目标网址
let website_source_url

//是否在pwa中
var isPwa = false

function getBrowserLanguage() {
	if (navigator.languages != undefined) {
		return navigator.languages[0]; // 返回数组中的第一个语言
	} else {
		return navigator.language; // 如果navigator.languages不可用，则使用navigator.language
	}
}


window.onload = async function () {
	createModal()
	await getPubKeyByApple()
	checkSubcribe()

	// 判断是不是在pwa中
	if (window.matchMedia("(display-mode: standalone)").matches) {
		console.log("PWA中");
		localStorage.setItem("isInstall", 1);
		isPwa = true
		if (!sessionStorage.getItem('recordSendOpen')) {
			await recordSend(4)
			sessionStorage.setItem('recordSendOpen', '1')
		}
	}

	// 打开数据库
	var db = indexedDB.open('myDatabase', 2);
	// // 创建对象仓库
	db.onupgradeneeded = function (event) {
		var db = event.target.result;
		try {
			const objectStore = db.createObjectStore('myObjectStore', {
				keyPath: 'id'
			});
		} catch (e) {
			console.log(e)
		}
	};

	// // 添加数据
	db.onsuccess = function (event) {
		var db = event.target.result;
		var transaction = db.transaction('myObjectStore', 'readwrite');
		var objectStore = transaction.objectStore('myObjectStore');
		objectStore.delete(1); // 删除主键为1的记录
		objectStore.add({
			id: 1,
			baseUrl: baseUrl
		});
	};
}



//创建订阅通知弹窗
function createModal() {
	// 创建 overlay div
	var overlay = document.createElement('div');
	overlay.id = 'overlay';
	overlay.classList.add('hidden'); // 假设 'hidden' 类用于隐藏元素
	// overlay.classList.add('show'); // 假设 'hidden' 类用于隐藏元素

	// 创建 modal-content div
	var modalContent = document.createElement('div');
	modalContent.classList.add('modal-content');

	// 创建 modal-text p
	var modalText = document.createElement('p');
	modalText.classList.add('modal-text');

	if (isChinese) {
		modalText.textContent = '订阅我们的通知以获取最新信息!';
	} else {
		modalText.textContent = 'Subscribe to our notifications to stay updated!';
	}

	// 创建 subscribe-btn button
	var subscribeBtn = document.createElement('button');
	subscribeBtn.id = 'subscribeBtn';
	subscribeBtn.classList.add('subscribe-btn');
	if (isChinese) {
		subscribeBtn.textContent = '点击订阅按钮!';
	} else {
		subscribeBtn.textContent = 'Subscribe Now!';
	}

	subscribeBtn.onclick = async function () {
		// 这里写你的订阅点击逻辑
		console.log('Subscribe button clicked!');
		const serviceWorker = await navigator.serviceWorker.ready;
		// 请求用户权限
		askUserPermission();
	};

	// 将 modal-text 和 subscribe-btn 添加到 modal-content
	modalContent.appendChild(modalText);
	modalContent.appendChild(subscribeBtn);

	// 将 modal-content 添加到 overlay
	overlay.appendChild(modalContent);

	// 将 overlay 添加到 body
	document.body.appendChild(overlay);

	subscriptionOverlay = overlay
}


function showAlert(message, duration) {
	var alertBox = document.createElement('div');
	alertBox.classList.add('alert-box');
	alertBox.textContent = message;
	document.body.appendChild(alertBox);

	setTimeout(function () {
		alertBox.classList.add('hide');
		setTimeout(function () {
			document.body.removeChild(alertBox);
		}, 1000); // 等待过渡效果完成后移除元素
	}, duration);
}



// 判断是不是在pwa中
if (window.matchMedia("(display-mode: standalone)").matches) {
	console.log("PWA中");
	localStorage.setItem("isInstall", 1);
	isPwa = true
}

window.addEventListener('message', function (event) {
	// 检查消息是否来自我们期望的iframe
	// 确保你替换了 'http://iframe-origin.com' 为iframe的实际源
	// if (event.origin !== 'http://iframe-origin.com') return;
	console.log(event.origin)
	console.log('eventttttttttt', event)
	// 处理接收到的消息
	console.log('Received message from iframe:', event.data);

	try {
		let json = JSON.parse(event.data)

		if (json.type === messageType) {
			console.log('message auth === ', json.data)
			// 假设iframe的id是'myIframe'
			// var iframe = _this.$refs.myElement
			// var iframe = document.getElementById('fullScreenIframe');
			var iframe = document.getElementsByClassName('iframe-box')[0]
			var iframeWindow = iframe.contentWindow || iframe.contentDocument.defaultView;


			let subId = localStorage.getItem(appId + '_' + cacheKey);
			// 发送消息
			let message = {
				type: messageType,
				subscriber: subId,
				domain: baseUrl
			};
			console.log(message)
			iframeWindow.postMessage(JSON.stringify(message),
				'*'); // '*' 表示允许所有源接收消息，但在生产环境中，你应该指定具体的源
		}
	} catch (e) {
		console.error(e)
	}
},
	false);



function getQueryParamsFromString(url) {
	const queryString = url.split('?')[1]; // 获取?后面的部分
	if (!queryString) return false
	const params = {};
	const pairs = queryString.split('&');

	pairs.forEach(pair => {
		const [key, value] = pair.split('=');
		params[decodeURIComponent(key)] = decodeURIComponent(value || '');
	});
	return params;
}

async function recordSend(index) {
	console.log('recordSend index2')
	let params = getQueryParamsFromString(window.location.href)
	await getPubKeyByApple()

	await getWebsiteSourceUrl()
	let sendData = getBrowserInfo()
	sendData.uuid = await fnGetFingerrinId()
	sendData.app_id = appId

	let channelId = await getChannelId()
	if (channelId) {
		sendData.channel_id = channelId
	}
	sendData.operation_type = index
	sendData.source_url = window.location.href

	await request(baseUrl + '/api/v1/report', {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(sendData),
	}).then(async (response) => {
		console.log("send success", response);
	});
}

async function getWebsiteSourceUrl() {
	await getPubKeyByApple()
	try {
		const iframe = document.getElementsByClassName('iframe-box')[0]
		//document.getElementById('fullScreenIframe');
		if (iframe) {
			iframe.src = website_source_url
		}
	} catch (e) {
		console.error(e)
	}
	// iframe.style.display = 'block'; // 显示iframe
}


function getBrowserInfo() {
	// 获取浏览器信息
	var userAgent = navigator.userAgent;
	var browserName = "Unknown";
	var fullVersionString = "Unknown";
	var nameOffset, verOffset;

	// 使用正则表达式来匹配并捕获括号内的内容
	const regex = /\(([^)]+)\)/;
	const match = userAgent.match(regex);

	let systemInfo = "Unknown";
	if (match && match[1]) {
		// 匹配成功，match[1]将包含括号内的内容
		systemInfo = match[1];
		// 如果你想要进一步分割这个字符串以获取单独的组件
		const parts = systemInfo.split('; ').map(part => part.trim());
		// parts[0], parts[1], parts[2]分别对应操作系统、版本和设备型号等信息
	} else {
		console.log('没有匹配到用户代理信息');
	}

	// 按优先级顺序在用户代理字符串中搜索浏览器的名称和版本
	if ((verOffset = userAgent.indexOf("OPR")) != -1 || (verOffset = userAgent.indexOf("Opera")) != -1) {
		browserName = "Opera";
		fullVersionString = userAgent.substring(verOffset + (userAgent.indexOf("OPR") != -1 ? 4 : 6));
	} else if ((verOffset = userAgent.indexOf("Edge")) != -1) {
		browserName = "Microsoft Edge";
		fullVersionString = userAgent.substring(verOffset + 5);
	} else if ((verOffset = userAgent.indexOf("Edg")) != -1) {
		browserName = "Microsoft Edge";
		fullVersionString = userAgent.substring(verOffset + 4);
	} else if ((verOffset = userAgent.indexOf("Chrome")) != -1) {
		browserName = "Chrome";
		fullVersionString = userAgent.substring(verOffset + 7);
	} else if ((verOffset = userAgent.indexOf("Safari")) != -1) {
		browserName = "Safari";
		fullVersionString = userAgent.substring(verOffset + 7);
		if ((verOffset = userAgent.indexOf("Version")) != -1) {
			fullVersionString = userAgent.substring(verOffset + 8);
		}
	} else if ((verOffset = userAgent.indexOf("Firefox")) != -1) {
		browserName = "Firefox";
		fullVersionString = userAgent.substring(verOffset + 8);
	} else if ((verOffset = userAgent.indexOf("MSIE")) != -1) {
		browserName = "Microsoft Internet Explorer";
		fullVersionString = userAgent.substring(verOffset + 5);
	} else if (userAgent.indexOf("Trident/") != -1) {
		browserName = "Microsoft Internet Explorer";
		fullVersionString = userAgent.substring(userAgent.indexOf("rv:") + 3);
	}

	// 截断版本号字符串
	if ((nameOffset = fullVersionString.indexOf(";")) != -1) fullVersionString = fullVersionString.substring(0,
		nameOffset);
	if ((nameOffset = fullVersionString.indexOf(" ")) != -1) fullVersionString = fullVersionString.substring(0,
		nameOffset);

	// 创建包含分辨率、浏览器版本和设备型号的信息对象
	let info = {
		"resolving_power": window.innerWidth + ' x ' + window.innerHeight,
		"browser_version": browserName + ' ' + fullVersionString,
		"machine_model": systemInfo
	}
	return info;
}

//设置通知拒绝
async function sendNoticeRejectStatus() {
	console.log('sendNoticeRejectStatus----')

	await getPubKeyByApple()
	let sendData = {}
	sendData.uuid = await fnGetFingerrinId()
	sendData.app_id = appId

	let tempChannelId = await getChannelId()
	if (tempChannelId) {
		sendData.channel_id = tempChannelId
	}
	sendData['enable_subscriber'] = false
	sendData['def_open_url'] = location.href
	sendData['def_icon_url'] = iconUrl

	let browserInfo = getBrowserInfo()
	if (browserInfo) {
		sendData['resolving_power'] = browserInfo.resolving_power
		sendData['browser_version'] = browserInfo.browser_version
		sendData['machine_model'] = browserInfo.machine_model
	}

	await request(baseUrl + '/api/v1/subscriber/create', {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(sendData),
	}).then(async (response) => {
		console.log("send sendNoticeRejectStatus success", response);
	});
}


function mapToUrlParams(map) {
	const params = new URLSearchParams();
	for (const [key, value] of map.entries()) {
		if (value) {
			params.set(key, value);
		}
	}
	if (decodeURIComponent(params.toString()).length > 0) {
		return "?" + decodeURIComponent(params.toString());
	}
	return decodeURIComponent(params.toString());
}

function getHrefSearchParams() {
	let href = decodeURIComponent(location.href)
	if (href.indexOf('?') === -1) {
		return new URLSearchParams()
	}
	let urlParams = new URLSearchParams(href.substring(href.indexOf('?') + 1));
	return urlParams
}

async function getPubKeyByApple() {
	let params = getHrefSearchParams()

	let urlStr
	if (params.get('uuid')) {
		let cid = params.get('uuid')
		//渠道id
		let href = decodeURIComponent(location.href)
		let cidIndex = href.indexOf(cid)
		urlStr = href.substring(cidIndex + cid.length + 1)
		urlStr = encodeURIComponent(urlStr)
		console.log('uuuuuuuuuuuurlstr', urlStr)
	}

	const customizeParams = new Map()
	customizeParams.set('url_str', location.host);
	customizeParams.set('param_str', urlStr);

	// await request('/customize.json' + mapToUrlParams(customizeParams))
	await request('/api/customize' + mapToUrlParams(customizeParams))
		.then(response => response.json())
		.then(data => {
			// 在这里使用data变量
			console.log('json file=----------', data);
			appId = data.app_id
			iframe = data.iframe
			pubKey = data.pushServerPublicKey
			website_source_url = decodeURIComponent(data.website_source_url)
			console.log('website_source_url', website_source_url)
			baseUrl = window.location.protocol + '//' + window.location.host
			console.log(baseUrl)
			accessData = true
		})
		.catch((error) => {
			console.error('Error:', error);
		});


	const map = new Map()
	const pwaMap = new Map()
	pwaMap.set('app_id', appId);
	if (params.get('cid')) {
		pwaMap.set('cid', params.get('cid'));
	}
	pwaMap.set('uuid', params.get('uuid'));
	let pwaMapParams = mapToUrlParams(pwaMap);
	map.set('url_str', location.host);
	if (params.get('cid')) {
		map.set('cid', params.get('cid'));
	}
	map.set('param_str', location.search ? location.search.substring(1) : '');

	let urlParams = mapToUrlParams(map);
	let manifestPath = '/api/manifest' + urlParams

	await request(manifestPath)
		.then(response => response.json())
		.then(data => {
			// 在这里使用data变量
			console.log('manifest=----------', data);
			iconUrl = location.origin + data.icons[0].src.substring(1)
		})
		.catch((error) => {
			console.error('Error:', error);
		});
}


async function fnGetFingerrinId() {
	const tempFpId = localStorage.getItem('fpId');
	if (!!tempFpId) {
		return tempFpId
	}
	let params = getQueryParamsFromString(window.location.href)
	localStorage.setItem('fpId', params.uuid)
	return params.uuid;
}


function isPushNotificationSupported() {
	return "serviceWorker" in navigator && "PushManager" in window;
}
const pushNotificationSuported = isPushNotificationSupported();


let isSubscribed = localStorage.getItem(appId + "isSubscribed");
let subscriptionOverlay = document.getElementById("overlay");
const subscribeBtn = document.getElementById("subscribeBtn");

// subscribeBtn.addEventListener("click", async () => {
// 	const serviceWorker = await navigator.serviceWorker.ready;
// 	// 请求用户权限
// 	askUserPermission();
// });


async function initSw() {
	if (pushNotificationSuported) {
		// 注册service worker
		await navigator.serviceWorker.register("./service-worker.js");
		console.log("Service Worker 注册成功");
	}
}

initSw()


async function askUserPermission() {
	let r = await Notification.requestPermission();
	updateUserConsent(r);
}

async function jumpTarget() {
	if (iframe === 0) {
		//获取参数
		let url = website_source_url
		let channelId = await getChannelId()
		let startVal = '&'
		if (url.indexOf('?') == -1) {
			startVal = '?'
		}
		url += startVal
		url += 'appId=' + appId
		if (channelId) {
			url += '&cid=' + channelId
		}
		//传入订阅者id
		url += '&subId=' + localStorage.getItem(appId + '_' + cacheKey)
		console.log(url)
		location.href = url
	}
}

//校验是否从iframe中打开
async function checkIsIframe() {
	await getPubKeyByApple()
	console.log('iiiiiiiiiiiiiiiiiiiii123123', iframe)

	// 判断是不是在pwa中
	if (window.matchMedia("(display-mode: standalone)").matches) {
		console.log("PWA中");
		localStorage.setItem("isInstall", 1);
		isPwa = true
	}
	if (iframe === 0) {
		setTimeout(jumpTarget, 100)
	} else {
		const iframe = document.getElementsByClassName('iframe-box')[0]
		if (iframe) {
			await getWebsiteSourceUrl()
			iframe.style.display = 'block'
			iframe.onload = function () {
				iframe.contentWindow.postMessage('disableScript', '*')
			}
		}
	}
}

function urlBase64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

async function createNotificationSubscription() {
	let sw = await navigator.serviceWorker.ready;
	await getPubKeyByApple()

	let s = await sw.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: pubKey,
	})
	//   console.log("User is subscribed.", s);
	return s;
}



async function waitForLocalStorageItem(cacheKey, timeout = 60000) { // 默认超时时间为60秒
	return new Promise((resolve, reject) => {
		let intervalId = setInterval(() => {
			const item = localStorage.getItem(cacheKey);
			if (item !== null) {
				// 清除定时器并解析Promise
				clearInterval(intervalId);
				resolve(item);
			}
		}, 500); // 每500毫秒检查一次localStorage

		// 设置超时
		let timeoutId = setTimeout(() => {
			// 清除检查间隔
			clearInterval(intervalId);
			clearTimeout(timeoutId);
			// 拒绝Promise
			reject(new Error(`Timed out after ${timeout / 1000} seconds.`));
		}, timeout);
	});
}

//获取渠道id
async function getChannelId() {
	const tempFpId = localStorage.getItem(appId + '_channel_id');
	if (!!tempFpId) {
		return tempFpId
	}
	let params = getQueryParamsFromString(window.location.href)
	if (params.cid) {
		localStorage.setItem(appId + '_channel_id', params.cid)
		return params.cid
	} else {
		return ''
	}
}

async function updateUserConsent(userConsent) {
	try {
		if (userConsent === "granted") {
			console.log("用户允许!!!!");
			subscriptionOverlay.classList.remove("show");
			let s = await createNotificationSubscription();

			let sendData = JSON.parse(JSON.stringify(s));

			sendData['app_id'] = appId

			let channleId = await getChannelId()
			if (channleId) {
				sendData['channel_id'] = channleId
			}
			sendData['uuid'] = await fnGetFingerrinId()

			sendData['pub_key'] = sendData.keys.p256dh
			sendData['auth'] = sendData.keys.auth
			sendData['enable_subscriber'] = true
			sendData['def_open_url'] = location.href
			sendData['def_icon_url'] = iconUrl

			let browserInfo = getBrowserInfo()
			if (browserInfo) {
				sendData['resolving_power'] = browserInfo.resolving_power
				sendData['browser_version'] = browserInfo.browser_version
				sendData['machine_model'] = browserInfo.machine_model
			}
			console.log("用户订阅了推送通知", JSON.stringify(sendData));

			// 检查Service Worker是否注册并准备就绪
			await navigator.serviceWorker.ready;
			// 如果Service Worker已经注册 但是还没有接管页面
			if (!navigator.serviceWorker.controller) {
				location.reload();
				return console.log("Service Worker已经注册但是还没有接管页面");
			} else {
				console.log("Service Worker已经注册并且已经接管页面");
			}

			if (isSubscribed) {
				if (navigator.serviceWorker && navigator.serviceWorker.controller) {
					const authValue = JSON.parse(JSON.stringify(s)).keys.auth;
					console.log("authValue", authValue);
					// 发送auth值给Service Worker
					navigator.serviceWorker.controller.postMessage({
						type: "SET_AUTH",
						auth: authValue,
					});
				}
				checkIsIframe()
				return console.log("用户已经订阅过了!不需上报服务器");
			}
			await fetch(baseUrl + '/api/v1/subscriber/create', {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(sendData),
			}).then(async (response) => {
				if (!response.ok) {
					throw new Error("Failed to subscribe the user.");
					// console.log('Failed to subscribe the user.')
				}
				console.log("用户订阅信息已发送到服务器");
				let res = await response.json()

				let data = res.data;
				console.log('----------------', data)
				console.log('sssssssssubcribe-==========', data.subscriber_id)

				await getPubKeyByApple()
				localStorage.setItem(appId + '_' + cacheKey, data.subscriber_id);
				localStorage.setItem(appId + "isSubscribed", 1);

				if (navigator.serviceWorker && navigator.serviceWorker.controller) {
					const authValue = JSON.parse(JSON.stringify(s)).keys.auth;
					console.log("authValue", authValue);
					// 发送auth值给Service Worker
					navigator.serviceWorker.controller.postMessage({
						type: "SET_AUTH",
						auth: authValue,
					});
				}
			}).catch(e => {
				console.error('Subscribed api error', e)
			})
			checkIsIframe()
		} else {
			console.log("用户拒绝!!!!");
			window.localStorage.setItem(appId + "isSubscribed", 1);
			subscriptionOverlay.classList.remove("show");
			await sendNoticeRejectStatus()
			checkIsIframe()
		}
	} catch (e) {
		console.log(e)
	}
}

function isAppleBrowser() {
	const userAgent = window.navigator.userAgent;
	const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
	const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
	return isSafari || isIOS;
}


//检查是否已订阅
async function checkSubcribe() {
	if (pushNotificationSuported) {

		isSubscribed = localStorage.getItem(appId + "isSubscribed");

		// 此环境支持推送通知
		// 获取订阅状态
		const subStatus = Notification.permission;

		let checkIframeFlag = -1

		//   如果拒绝过
		if (subStatus === "denied") {
			// showAlert('您已拒绝接收应用通知，如需使用通知请到设置中开启', 5000)
			console.log("用户拒绝了推送通知");
			checkIframeFlag = 1
		}

		//苹果
		if (isAppleBrowser() && isSubscribed && subStatus === "default") {
			// showAlert('您已拒绝接收应用通知，如需使用通知请到设置中开启', 5000)
			checkIframeFlag = 1
		}

		if (isSubscribed || subStatus === "granted" || subStatus === "denied") {
			// 已订阅
			console.log("已订阅或者已经拒绝!", isSubscribed, subStatus);
			if (subStatus === "granted" && !isSubscribed) {
				// 未上报过服务器
				console.log("已订阅但是未上报过服务器,开始上报");
				await updateUserConsent(subStatus);
			}
			if (subStatus === "granted" && isSubscribed) {
				let s = await createNotificationSubscription();
				if (navigator.serviceWorker && navigator.serviceWorker.controller) {
					const authValue = JSON.parse(JSON.stringify(s)).keys.auth;
					console.log("authValue", authValue);
					// 发送auth值给Service Worker
					navigator.serviceWorker.controller.postMessage({
						type: "SET_AUTH",
						auth: authValue,
					});
				}
			}
			checkIframeFlag = 1
		} else {
			if (isPwa) {
				// 等3s再显示订阅按钮
				// await new Promise((resolve) => {
				// 	setTimeout(() => {
				// 		resolve();
				// 	}, 3000);
				// });
				subscriptionOverlay.classList.add("show");
				// document.getElementById("subscribeBtn").click()
				// // 未订阅
				// const serviceWorker = await navigator.serviceWorker.ready;
				// // // 请求用户权限
				// askUserPermission();
			} else {
				console.log('不在pwa中,不进行订阅消息')
			}
		}

		if (checkIframeFlag == 1) {
			checkIsIframe()
		}
	}
}