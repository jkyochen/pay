const alipay = require('./util/alipay');
const wxpay = require('./util/wxpay');

let logPath = './tmp/';
let logConfig = [{
    type: "file",
    levels: [console.FATAL, console.ALERT, console.CRIT, console.ERROR],
    path: logPath + "error.log",
    split: "hour",
    count: 128
}, {
    type: "file",
    levels: [console.WARN],
    path: logPath + "warn.log",
    split: "hour",
    count: 128
}, {
    type: "file",
    levels: [console.NOTICE, console.INFO],
    path: logPath + "access.log",
    split: "hour",
    count: 128
}];
require("fib-logger").setup({
    logPath: logPath,
    logConfig: logConfig
});

let aliCookie = '';
let wxCookie = '';

function runAliPay() {

    let aliSum = 1;
    let aliType = true; // 支付宝接口切换 HtmlOne / HtmlTwo 切换
    let aliStatus = Date.now();
    let aliData = 0; // 暂停 有订单情况下才是10秒一次的频率 杜绝支付宝风控

    function aliFetch() {

        try {

            // let rs = alipay(aliCookie, {
            //     type: aliType, // 类型，切换支付宝接口切换 HtmlOne / HtmlTwo
            //     time: Date.now(), // 起始时间点
            //     minute: 5, // 过滤 5 分钟前到现在的数据
            //     fee: 0.01, // 以金额作为过滤
            //     remark: '备注' // 以备注作为过滤
            // });

            let rs = alipay(aliCookie, {
                type: aliType
            });
            aliData = rs.length;
            rs.forEach(r => {
                console.log(`支付宝：叮叮叮， ${r.time}，收到 ${r.name} ，付费 ${r.fee} RMB`);
            });

            console.log(`支付宝：${aliSum} 次运行`);

            aliType = !aliType;
            aliSum++;
            aliStatus = Date.now() + 2 * 60 * 1000;

        } catch(e) {
            console.error(e.stack ? e.stack : e);
        }
    }

    aliFetch();
    setInterval(() => {

        if (aliData === 0 && aliStatus > Date.now()) return;
       aliFetch();

    }, 10 * 1000);
}

function runWxPay() {

    let wxSum = 1;
    function wxFetch() {

        try {

            // let rs = wxpay(wxCookie, {
            //     time: Date.now(), // 起始时间点
            //     minute: 5, // 过滤 5 分钟前到现在的数据
            //     fee: 0.01, // 以金额作为过滤
            //     remark: '备注' // 以备注作为过滤
            // });

            let rs = wxpay(wxCookie);
            rs.forEach(r => {
                console.log(`微信：叮叮叮， ${r}`);
            });

            console.log(`微信：${wxSum} 次运行`);
            wxSum++;

        } catch(e) {
            console.error(e.stack ? e.stack : e);
        }
    }

    wxFetch();
    setInterval(() => {
       wxFetch();
    }, 10 * 1000);
}

runAliPay();
runWxPay();
