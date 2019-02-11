# pay

## 启动

1. 获取 cookie 填到 index.js
2. npm install 
3. fibjs index.js

### 获取支付宝COOKIE

- 浏览器访问：https://mbillexprod.alipay.com/enterprise/tradeListQuery.htm
- 登录支付宝账号
- 浏览器按 f12
- 找到 Network 并点击再刷新一下
- 可以看到 tradeListQuery.json 点击它
- 点击 headers 它找到 Cookie: 后面就是 cookie(务必复制完整)

## 风险

1. 手机端会在支付时要求人脸识别。（遇到过一次）

2. 请求 10s 一次的时候，几个小时后会导致 该接口被封，具体返回 `频繁访问`，预计封 24 小时。（目前是 2 分钟请求一次，有数据时是 10s 请求一次，还在测试中，log 地址 `http://115.47.142.152:2020` ）
