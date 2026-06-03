# 🚀 CF-Worker-Proxy

一个专为 PaaS 平台（如 Koyeb, Render, Vercel 等）设计的轻量级 Cloudflare Worker 反向代理脚本。

通过原生的 Cloudflare Worker 进行反代，完美解决部分 PaaS 平台在国内访问慢、网络不稳或被阻断的问题。支持改写 Host 头防拦截，且能够完美配合**Cloudflare 优选 IP / 优选域名**进行网络加速。

## ✨ 特性

- **⚡️ 极简轻量**：无冗余代码，利用 CF Worker 边缘节点极速转发流量。
- **🛡️ 智能请求头重写**：自动修改 `Host`、`Origin` 和 `Referer`，防止目标 PaaS 平台因域名不匹配返回 403/404 错误。
- **🔒 安全可靠**：自动过滤 GET/HEAD 请求的 Body 载荷，防止 Worker 触发 500 崩溃；强制 HTTPS 回源。
- **🔗 完美支持优选IP**：可绑定自定义域名，进而通过 CNAME 或 A 记录套用 CF 优选节点，大幅提升连通率和访问速度。

---

## 🛠️ 快速部署教程

### 第一步：创建 Cloudflare Worker
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左侧菜单找到并点击 **Workers & Pages**。
3. 点击 **Create Worker (创建 Worker)** 按钮。
4. 为你的 Worker 起个名字（例如 `my-koyeb-proxy`），点击 **Deploy (部署)**。

### 第二步：修改并部署代码
1. 部署完成后，点击 **Edit code (编辑代码)**。
2. 清空原本的代码，将以下代码复制并粘贴进去：

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ⬇️ 将这里替换成你真实的 PaaS 目标域名 ⬇️
    const targetHostname = 'smoggy-lottie-koyeb7-f752f758.koyeb.app';
    
    url.hostname = targetHostname;
    url.protocol = 'https:';

    // 克隆请求头并改写 Host/Origin/Referer，防止被目标平台拒绝
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', targetHostname);
    if (newHeaders.has('Origin')) {
      newHeaders.set('Origin', `https://${targetHostname}`);
    }
    if (newHeaders.has('Referer')) {
      newHeaders.set('Referer', `https://${targetHostname}`);
    }

    const requestInit = {
      method: request.method,
      headers: newHeaders,
      redirect: 'manual'
    };

    // GET 和 HEAD 请求不能携带 body
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestInit.body = request.body;
    }

    const newRequest = new Request(url.toString(), requestInit);

    try {
      return await fetch(newRequest);
    } catch (e) {
      return new Response('Bad Gateway or Proxy Error', { status: 502 });
    }
  },
};
```
3. 修改第 6 行的 `targetHostname` 为你自己的目标域名。
4. 点击右上角的 **Save and deploy (保存并部署)**。

### 第三步：绑定自定义域名 (极其重要)
为了能套用“优选域名”或“优选IP”，你必须将 Worker 绑定到你自己托管在 Cloudflare 的域名上：
1. 回到该 Worker 的详情页面。
2. 找到 **Settings (设置)** -> **Domains & Routes (域和路由)** (或 **Triggers 触发器** 选项卡)。
3. 点击 **Add Custom Domain (添加自定义域)**。
4. 输入你的域名（例如 `proxy.yourdomain.com`），按照提示完成添加。
5. 等待几分钟 DNS 生效后，你就可以通过 `https://proxy.yourdomain.com` 访问你的目标网站了！

---

## 🚀 高级玩法：如何配合“优选 IP”使用？

如果你觉得默认的 Cloudflare 节点速度不够快，可以通过以下方式进行优选加速：

1. **前提条件**：你已经在上一步完成了“绑定自定义域名”（比如 `proxy.yourdomain.com`）。
2. **修改 DNS 解析**：
   - 如果你的域名解析直接在 Cloudflare，默认已经是接入 CF 网络了。
   - 如果你需要极致提速，可以在其他 DNS 解析服务商（如阿里云、腾讯云 DNSPod 等）接入你的域名，并将 `proxy.yourdomain.com` 的 `CNAME` 解析指向**公用的 Cloudflare 优选域名**。
   - 或者将 `A记录` 直接指向扫描出来的 **Cloudflare 优选 IP**。
3. **实现原理**：
   `用户请求 -> 优选 IP/优选域名 -> Cloudflare 边缘节点 -> 触发此 Worker -> 伪装 Host 后请求 Koyeb -> 返回数据`

这样就能完美绕过原平台的网络封锁或限速，实现满速访问！

---

## ❓ 常见问题 (FAQ)

**Q1: 为什么访问后提示 502 Bad Gateway？**
> 答：请检查 `targetHostname` 是否填写正确，确保目标 PaaS 服务（如 Koyeb）正在正常运行，且没有处于休眠（Sleeping）状态。

**Q2: 为什么不直接用 Pages 反代？**
> 答：Pages 的 `_worker.js` 主要用于处理附带静态资产的页面，对于纯后端反向代理，原生的 Cloudflare Worker 响应更快、更稳，且更容易修改请求头（Headers）进行安全绕过。

## 📄 开源协议
[MIT License](LICENSE)
```

***

### 💡 提交建议：
1. 把这段内容直接存为 `README.md`。
2. 里面代码块的 `targetHostname` 我留了你一开始发给我的 `smoggy-lottie...`，你可以在发布时把它改成一个占位符比如 `your-app-name.koyeb.app`，防止暴露你自己的真实应用。
3. 把项目推送到 GitHub，配上你刚才挑好的名字（比如 `cf-worker-proxy`），别人一搜就能用了！
