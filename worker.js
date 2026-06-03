export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 你的目标反代域名
    const targetHostname = '你的域名';
    
    // 将请求的域名替换为目标域名
    url.hostname = targetHostname;
    // 强制转为 HTTPS（Koyeb 等平台一般强制要求 https 访问）
    url.protocol = 'https:';

    // 克隆请求头，修改 Host 和 Origin
    // 这一步非常重要！如果不改 Host 头，Koyeb 可能会识别到原请求的 CF Worker 域名从而拒绝访问 (Error 404/403)
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', targetHostname);
    if (newHeaders.has('Origin')) {
      newHeaders.set('Origin', `https://${targetHostname}`);
    }
    if (newHeaders.has('Referer')) {
      newHeaders.set('Referer', `https://${targetHostname}`);
    }

    // 组装新的请求参数
    const requestInit = {
      method: request.method,
      headers: newHeaders,
      // 保持重定向逻辑交给客户端或者我们自己手动处理
      redirect: 'manual'
    };

    // GET 和 HEAD 请求不能携带 body，否则 Cloudflare Worker 会抛出异常
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestInit.body = request.body;
    }

    // 构造新的 Request 对象
    const newRequest = new Request(url.toString(), requestInit);

    try {
      // 发起请求并返回给客户端
      return await fetch(newRequest);
    } catch (e) {
      // 容错处理：如果请求目标服务器超时或失败，返回 502 错误
      return new Response('Bad Gateway or Proxy Error', { status: 502 });
    }
  },
};
