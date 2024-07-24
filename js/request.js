function request(url, options) {
    return fetch(url, options)
        .catch(error => {
            console.log('request error', error, error.code);

            console.log(error.message, error.name)
            // 检查是否应该重试
            // 这里只是示例，您可能需要根据实际情况检查错误代码
            if (error.name === 'AbortError' || error.message === 'Failed to fetch' || error.message.includes('timeout') ) {
                // 尝试重新请求
                return retryRequest(url, options, 1);
            }
            return retryRequest(url, options, 1);
            // 其他错误情况，直接抛出
            // throw error;
        });
}

// 设置最大重试次数  
const maxRetryCount = 3;

function retryRequest(url, options, retryCount = 0) {
    if (retryCount >= maxRetryCount) {
        // 如果已经重试了最大次数，返回一个被拒绝的 Promise
        return Promise.reject(new Error(`Request failed after ${maxRetryCount} retries.`));
    }

    // 尝试请求
    return fetch(url, options)
        .catch(error => {
            // 检查错误类型，决定是否重试
            if (error.name === 'AbortError' || error.message === 'Failed to fetch' || error.message.includes('timeout') ) {
                // 等待一段时间后再次尝试
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(retryRequest(url, options, retryCount + 1));
                    }, 10000 * retryCount); // 假设每次重试间隔递增
                });
            }
            // 对于其他错误，直接返回被拒绝的 Promise
            return Promise.reject(error);
        });
}