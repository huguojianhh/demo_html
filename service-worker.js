/**
 * @Author: Edison Tg:@web_tgg02
 * @LastEditors: Edison Tg:@web_tgg02
 * @Date: 2024-03-06 17:31:10
 * @LastEditTime: 2024-04-13 21:28:07
 * @FilePath: /video/service-worker.js
 * @Copyright (c) 2024 by Edison, All Rights Reserved.
 **/
// 服务端推送回答地址
let FeedbackUrl = null;
let authValue;

self.addEventListener("install", (event) => {
  // 安装事件是一个设置缓存的好时机
  event.waitUntil(
      caches.open('v1') // 创建一个名为'my-cache-name'的新缓存
  );
  console.log("Service Worker Installed!");
});

self.addEventListener("fetch", (event) => {
  // console.log(caches,event.request)
  // 检查请求是否已经被缓存
  // event.respondWith(
  // 	caches.match(event.request) // 查找请求是否在缓存中
  // 	.then((cachedResponse) => {
  // 		// 如果有缓存，返回缓存的响应
  // 		if (cachedResponse && isImages(event.request)) {
  // 			return cachedResponse;
  // 		}

  // 		// 如果没有缓存，使用fetch函数获取网络响应
  // 		return fetch(event.request);
  // 	})
  // 	.then((response) => {
  // 		// 这里可以检查响应是否有效（例如，状态码为200）
  // 		console.log(response.type, response.status)
  // 		if (!response || response.status !== 200 || response.type !== 'basic' || !isImages(
  // 				response)) {
  // 			// if (!response || response.status !== 200) {
  // 			// 如果响应无效，直接返回它
  // 			return response;
  // 		}
  // 		// 克隆响应，因为响应对象只能被使用一次
  // 		const responseToCache = response.clone();
  // 		// 打开缓存并添加新的响应
  // 		caches.open('v1')
  // 			.then((cache) => {
  // 				cache.put(event.request, responseToCache);
  // 			});

  // 		// 返回原始响应
  // 		return response;
  // 	})
  // 	.catch((error) => {
  // 		// 处理错误
  // 		console.error('Fetch error:', error);
  // 		// 可以返回一个自定义的响应或者错误
  // 		return new Response('Network error occurred', {
  // 			status: 408
  // 		});
  // 	})
  // );
});


// 辅助函数，用于检查请求是否是CSS文件
function isCSSRequest(request) {
  // 使用URL对象来检查请求URL是否以.css结尾
  const url = new URL(request.url);
  return url.pathname.endsWith('.css');
}


function isImages(request) {
  // 使用URL对象来检查请求URL是否以.css结尾
  const url = new URL(request.url);
  return url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png');
}




// 辅助函数，用于检查请求是否是CSS文件
function isAPIRequest(request) {
  // 使用URL对象来检查请求URL是否以.css结尾
  const url = new URL(request.url);
  return url.pathname.includes('/api/');
}


// 监听推送事件
self.addEventListener("push", function(event) {
  // 解析推送消息并设置通知标题和内容
  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: "默认标题",
      body: "默认消息内容",
      icon: "/images/icon.jpg",
      image: "/images/icon.jpg",
      url: "https://www.baidu.com"
    };
  }

  console.log('notificationData---=', notificationData)
  // 如果配置了回传地址并且收到了AUTH，发送回传请求
  if (FeedbackUrl && authValue) {
    fetch(FeedbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...notificationData,
        auth: authValue
      }),
    });
  }

  const {
    title,
    body,
    icon,
    url,
    image,
    id
  } = notificationData;

  // 显示通知
  const notificationOptions = {
    body: body,
    icon: icon,
    badge: icon,
    image: image,
    data: {
      url,
      ...notificationData
    },
  };
  event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
  );
});

// 监听通知点击事件
self.addEventListener("notificationclick", async event => {
  // 关闭通知
  event.notification.close();
  let baseUrl = location.protocol + '//' + location.host + '/'

  // 打开数据库
  var db = indexedDB.open('myDatabase', 2);
  // // 创建对象仓库
  db.onupgradeneeded = function(event) {
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
  db.onsuccess = function(event2) {
    var db = event2.target.result;
    var transaction = db.transaction('myObjectStore', 'readwrite');
    var objectStore = transaction.objectStore('myObjectStore');
    var request = objectStore.get(1);
    request.onsuccess = function(event3) {
      var data = event3.target.result;
      if (data) {
        console.log('获取到的数据:', data.baseUrl);
        baseUrl = data.baseUrl

        // 发送信息到服务器
        fetch(baseUrl + '/api/v1/push_message_notice', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event.notification.data),
        }).then((response) => {
          if (!response.ok) {
            console.error('api error')
            return
            // throw new Error("Failed to subscribe the user.");
          }
          let res = response.json()
          console.log("用户订阅信息已发送到服务器", res)
        }).catch(e => {
          console.error(e)
        });
      } else {
        console.log('没有找到数据');
      }
    };
  };

  console.log(event.notification.data)
  // 打开通知中携带的URL
  const urlToOpen = event.notification.data.url;

  // 这会检查当前标签页是否已打开并聚焦
  event.waitUntil(
      clients
          .matchAll({
            type: "window",
          })
          .then((clientList) => {
            // 获取用户的操作系统
            // const userAgent = window.navigator.userAgent;
            // const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
            // if (isIOS) {
            // 	return clients.openWindow(urlToOpen);
            // }

            for (const client of clientList) {
              console.log(clientList)
              console.log(client)
              // if (!urlToOpen.includes('http')) {
              // 	let tempUrl = client.url
              // 	tempUrl = tempUrl.replace(location.origin, '')
              // 	console.log('tempUrl====', tempUrl)
              // 	if (tempUrl === urlToOpen && "focus" in client) {
              // 		return client.focus();
              // 	}
              // } else if (client.url === urlToOpen && "focus" in client) {
              // 	return client.focus();
              // }
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
          }),
  );

});


// 在Service Worker中监听message事件
self.addEventListener("message", (event) => {
  // 检查消息类型
  if (event.data && event.data.type === "SET_AUTH") {
    const authValueT = event.data.auth;
    console.log("Service Worker 收到auth值", authValueT);
    authValue = authValueT;
  }
  console.log(event)
});