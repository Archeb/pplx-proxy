# 使用方法

1. 获得一个 Perplexity 账户并且订阅，登录。

2. 打开 F12（DevTools），找到 “Network（网络）”、刷新一下页面，找到“www.perplexity.ai”这个项目

3. 点进去，往下滑找到 "Cookie"，完整的复制后面的内容。

4. 用同样的方法找到 "User-Agent"，完整的复制后面的内容。

5. 下载或Clone本项目代码，解压

6. 编辑 `start.bat` 文件，把上面的 Cookie 和 User Agent 粘贴进去

7. 启动 start.bat （Linux/macOS用户使用 start.sh）

8. 酒馆中选择 Claude，反向代理地址填 http://127.0.0.1:8081/v1。反代密码必须填，随便什么都可以。

9. 开始使用。如果失败了/没有结果/403/Warning 就多重试几次。

# 使用代理

可以使用本地的socks5或http(s)代理。只需在 start.bat 中设置 `all_proxy` 环境变量。

比如，如要使用 Clash 的默认本地SOCKS5代理，则应设置为 `set all_proxy=socks5://127.0.0.1:7890`

## 注意事项

出现 403 错误请重新抓 COOKIE 或者更换代理出口 IP。

# Usage

1. Get a Perplexity account and subscribe, log in.

2. Open F12 (DevTools), find “Network”, refresh the page, and find “www.perplexity.ai”.

3. Click on it, scroll down and find “Cookie:”, and copy the entire contents.

4. Find the "user-agnet" in the same way.

5. Download or Clone the code of this project and unzip it.

6. Edit the `start.bat` file and paste the cookie and User Agent into it.

7. Start start.bat

8. Select Claude in the Tavern and put http://127.0.0.1:8081/v1 as the address of the reverse proxy. Use any random string for password.

9. Enjoy it. If it fails/no result/403/Warning, try again.

# Use custom proxy

Use the `all_proxy` env to set custom proxy. Refer to https://www.npmjs.com/package/proxy-from-env for detail.

## Caution

If you get 403 errors, consider getting the cookie again or changing your IP.