/**
 * @Author: Edison Tg:@web_tgg02
 * @LastEditors: Edison Tg:@web_tgg02
 * @Date: 2024-04-11 18:28:51
 * @LastEditTime: 2024-04-13 20:27:01
 * @FilePath: /video/js/app.js
 * @Copyright (c) 2024 by Edison, All Rights Reserved.
 **/
let installButton = document.getElementById("install-button");
let btnimg = document.getElementById("btn-img");
const pushNotificationSuported = isPushNotificationSupported();
let isInstall = localStorage.getItem("isInstall");
let isSubscribed = localStorage.getItem("isSubscribed");
let overlay = document.getElementById("overlay");
let deferredPrompt;
// server Work是否注册
let isServerWork = false;

if (isInstall) {
  setTimeout(() => {
    location.href = "./index2.html";
  }, 1000);
}

function isAppleBrowser() {
  const userAgent = window.navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

  return isSafari || isIOS;
}

if (pushNotificationSuported) {
  // 注册service worker
  await navigator.serviceWorker.register("./service-worker.js");
  console.log("Service Worker 注册成功");
}

window.addEventListener("beforeinstallprompt", (e) => {
  // 阻止浏览器自动显示安装提示
  e.preventDefault();
  // 保存事件，以便稍后触发
  deferredPrompt = e;
  console.log("未安装");
  // 显示安装按钮
  installButton.style.display = "flex";
});

installButton.addEventListener("click", () => {
  if (isInstall) {
    return (window.location.href = "./index2.html");
  }

  // 如过是苹果浏览器
  if (isAppleBrowser()) {
    // 显示提示
    return overlay.classList.add("show");
  }

  // 显示安装提示
  // 保存安装提示事件，稍后可以调用它的 prompt() 方法  
  deferredPrompt.prompt();
  // 等待用户响应安装提示
    // 在这里可以显示你自己的安装提示UI，例如一个按钮  
  // 当用户点击你的安装按钮时，调用 deferredPrompt.prompt()  
  // 还可以监听 deferredPrompt 的用户响应事件，例如：  
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === "accepted") {
      console.log("用户接受了安装应用");
    } else {
      console.log("用户拒绝了安装应用");
    }

    // 重置 deferredPrompt，以便可以捕获下一次的提示  
    deferredPrompt = null;
  });
});

window.addEventListener("appinstalled", () => {
  // 应用安装成功后，隐藏安装按钮
  console.log("安装成功");
  //  改变按钮文字
  installButton.innerHTML = "Install Success";
  isInstall = 1;
  localStorage.setItem("isInstall", 1);
  // 请求用户权限
  askUserPermission();
});

// 询问接受通知
async function askUserPermission() {
  let r = await Notification.requestPermission();
  updateUserConsent(r);
}

// 生成订阅
async function createNotificationSubscription() {
  let sw = await navigator.serviceWorker.ready;
  let s = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: pushServerPublicKey,
  });
  //   console.log("User is subscribed.", s);
  return s;
}

async function updateUserConsent(userConsent) {
  if (userConsent === "granted") {
    console.log("用户允许!!!!");
    let s = await createNotificationSubscription();
    console.log("用户订阅了推送通知", JSON.stringify(s));
    /**
     * 
     * 用户订阅了推送通知 {"endpoint":"https://fcm.googleapis.com/fcm/send/fR33TsJAFl4:APA91bFFA_EldZf4666oxC93gXTuGxn_Klyu01sIhb2Xgseyo_hIQOXg0hp_AB7gXPL5jJ4lUtkkJ0AXAkuUL8p51CPEpmaXhWy7huE7ntGB65MbewylLWcfCVGGkTGX1xUkcfpiLaA1","expirationTime":null,"keys":{"p256dh":"BAQRiivSAO1lwPHGhGwshnITqs2mYyDqgdiiVXbnOrtlbTBxppH5t0DDQ3FrsEMrk-y9xCmZNMp_30yKcs79iWw","auth":"x3ux8pzFMvOpQ9NmwxdkNw"}}
     * 
     */
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
      return console.log("用户已经订阅过了!不需上报服务器");
    }
    fetch(ApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(s),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to subscribe the user.");
      }
      console.log("用户订阅信息已发送到服务器");
      window.localStorage.setItem("isSubscribed", 1);
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const authValue = JSON.parse(JSON.stringify(s)).keys.auth;
        console.log("authValue", authValue);
        // 发送auth值给Service Worker
        navigator.serviceWorker.controller.postMessage({
          type: "SET_AUTH",
          auth: authValue,
        });
      }
    });
  } else {
    console.log("用户拒绝!!!!");
  }
}

function isPushNotificationSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// 判断是不是 ios
if (isAppleBrowser()) {
  // 按钮显示
  installButton.style.display = "flex";
  console.log("用户正在使用苹果浏览器或者在iOS设备上浏览。");
  btnimg.src = "./images/apple.png";
  // 尺寸改小
  btnimg.style.width = "30px";
} else {
  console.log("用户不是在使用苹果浏览器也不是在iOS设备上浏览。");
  askUserPermission();
}

overlay.addEventListener("click", (e) => {
  overlay.classList.remove("show");
});
