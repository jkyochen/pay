const pay = require('./util/pay');

let cookie = '';

let AliSum = 1;
let AliType = true; // 支付宝接口切换 HtmlOne / HtmlTwo 切换
let AliStatus = Date.now();
let data = 0; // 暂停 有订单情况下才是10秒一次的频率 杜绝支付宝风控

function fetch() {

    try {

        // let rs = pay(cookie, {
        //     type: AliType, // 类型，切换支付宝接口切换 HtmlOne / HtmlTwo
        //     time: Date.now(), // 起始时间点
        //     minute: 5, // 过滤 5 分钟内的数据
        //     fee: 0.01, // 以金额作为过滤
        //     remark: '备注' // 以备注作为过滤
        // });

        let rs = pay(cookie, {
            type: AliType
        });
        data = rs.length;
        rs.forEach(r => {
            console.log(`叮叮叮， ${r.time}，收到 ${r.name} ，付费 ${r.fee} RMB \n`);
        });

        console.log(`${AliSum} 次运行 \n`);

        AliType = !AliType;
        AliSum++;
        AliStatus = Date.now() + 2 * 60 * 1000;

    } catch(e) {
        console.error(e.stack ? e.stack : e);
    }
}

fetch();
setInterval(() => {

    if (data === 0 && AliStatus > Date.now()) return;
    fetch();

}, 10 * 1000);

